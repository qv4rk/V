// Feist Doc Audio Capture — background service worker.
// Responsibilities: recorder-tab singleton (Kiwi's popup rendering is
// unreliable, so the UI lives in a real tab instead), offscreen document
// lifecycle, the tabCapture start/stop handshake, and the actual
// chrome.downloads.download() call — that API isn't reliably exposed
// inside the offscreen document context, so the offscreen doc only ever
// hands back base64 audio and this file is what saves it to disk.

const OFFSCREEN_URL = 'offscreen.html';
const RECORDER_PAGE = 'recorder.html';

const IDLE_STATE = { recording: false, armed: false, tabId: null, title: '', startedAt: 0, lastError: '' };
let state = { ...IDLE_STATE };

async function getRecorderUrl() {
  return chrome.runtime.getURL(RECORDER_PAGE);
}

async function openOrFocusRecorder() {
  const recorderUrl = await getRecorderUrl();
  const tabs = await chrome.tabs.query({});
  const existing = tabs.find((t) => t.url && t.url.startsWith(recorderUrl));
  if (existing) {
    await chrome.tabs.update(existing.id, { active: true });
    if (existing.windowId != null) {
      await chrome.windows.update(existing.windowId, { focused: true });
    }
  } else {
    await chrome.tabs.create({ url: recorderUrl });
  }
}

chrome.action.onClicked.addListener(() => {
  openOrFocusRecorder();
});

function broadcastState() {
  chrome.runtime.sendMessage({ type: 'state-changed', state }).catch(() => {});
}

async function ensureOffscreenDocument() {
  const has = await chrome.offscreen.hasDocument();
  if (has) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ['USER_MEDIA'],
    justification: 'Record a tab\'s audio stream to a downloadable file.'
  });
}

function sanitizeFilename(name) {
  return (name || 'tab-audio').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 80);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'get-state') {
    sendResponse(state);
    return;
  }

  if (msg.type === 'start-capture') {
    (async () => {
      if (state.recording || state.armed) {
        sendResponse({ ok: false, error: 'already recording' });
        return;
      }
      try {
        const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: msg.tabId });
        await ensureOffscreenDocument();
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `DocAudio_${sanitizeFilename(msg.title)}_${ts}.webm`;
        const waitForSound = !!msg.waitForSound;
        await chrome.runtime.sendMessage({ type: 'offscreen-start', streamId, filename, waitForSound });
        state = {
          recording: !waitForSound,
          armed: waitForSound,
          tabId: msg.tabId,
          title: msg.title || '',
          startedAt: waitForSound ? 0 : Date.now(),
          lastError: ''
        };
        broadcastState();
        sendResponse({ ok: true });
      } catch (e) {
        state = { ...IDLE_STATE, lastError: e.message || String(e) };
        broadcastState();
        sendResponse({ ok: false, error: state.lastError });
      }
    })();
    return true;
  }

  if (msg.type === 'stop-capture') {
    chrome.runtime.sendMessage({ type: 'offscreen-stop' }).catch(() => {});
    return;
  }

  // Offscreen doc detected sound and actually started MediaRecorder (or
  // started immediately when "wait for audio" wasn't requested). Flips
  // the timer on.
  if (msg.type === 'capture-started') {
    state = { ...state, recording: true, armed: false, startedAt: Date.now() };
    broadcastState();
    return;
  }

  // User hit Stop while still armed and waiting for sound — nothing was
  // ever recorded, so just go back to idle without an error.
  if (msg.type === 'capture-cancelled') {
    state = { ...IDLE_STATE };
    broadcastState();
    chrome.offscreen.closeDocument().catch(() => {});
    return;
  }

  if (msg.type === 'recording-blob') {
    (async () => {
      try {
        const dataUrl = `data:${msg.mimeType};base64,${msg.base64}`;
        await chrome.downloads.download({ url: dataUrl, filename: msg.filename, saveAs: false });
        state = { ...IDLE_STATE };
      } catch (e) {
        state = { ...IDLE_STATE, lastError: e.message || String(e) };
      }
      broadcastState();
      chrome.offscreen.closeDocument().catch(() => {});
    })();
    return;
  }

  if (msg.type === 'recording-error') {
    state = { ...IDLE_STATE, lastError: msg.error || 'recording failed' };
    broadcastState();
    chrome.offscreen.closeDocument().catch(() => {});
    return;
  }
});
