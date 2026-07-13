// Feist Doc Audio Capture — background service worker.
// Responsibilities: recorder-tab singleton (Kiwi's popup rendering is
// unreliable, so the UI lives in a real tab instead), offscreen document
// lifecycle, and the tabCapture start/stop handshake.

const OFFSCREEN_URL = 'offscreen.html';
const RECORDER_PAGE = 'recorder.html';

let state = { recording: false, tabId: null, title: '', startedAt: 0, lastError: '' };

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
      if (state.recording) {
        sendResponse({ ok: false, error: 'already recording' });
        return;
      }
      try {
        const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: msg.tabId });
        await ensureOffscreenDocument();
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `DocAudio_${sanitizeFilename(msg.title)}_${ts}.webm`;
        await chrome.runtime.sendMessage({ type: 'offscreen-start', streamId, filename });
        state = { recording: true, tabId: msg.tabId, title: msg.title || '', startedAt: Date.now(), lastError: '' };
        broadcastState();
        sendResponse({ ok: true });
      } catch (e) {
        state.lastError = e.message || String(e);
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

  if (msg.type === 'recording-saved') {
    state = { recording: false, tabId: null, title: '', startedAt: 0, lastError: '' };
    broadcastState();
    chrome.offscreen.closeDocument().catch(() => {});
    return;
  }

  if (msg.type === 'recording-error') {
    state = { recording: false, tabId: null, title: '', startedAt: 0, lastError: msg.error || 'recording failed' };
    broadcastState();
    chrome.offscreen.closeDocument().catch(() => {});
    return;
  }
});
