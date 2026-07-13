const OFFSCREEN_URL = 'offscreen.html';

let state = { recording: false, title: '', startedAt: 0, lastError: '' };

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
        state = { recording: true, title: msg.title || '', startedAt: Date.now(), lastError: '' };
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
    state = { recording: false, title: '', startedAt: 0, lastError: '' };
    broadcastState();
    chrome.offscreen.closeDocument().catch(() => {});
    return;
  }

  if (msg.type === 'recording-error') {
    state = { recording: false, title: '', startedAt: 0, lastError: msg.error || 'recording failed' };
    broadcastState();
    chrome.offscreen.closeDocument().catch(() => {});
    return;
  }
});
