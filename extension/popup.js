const statusEl = document.getElementById('status');
const timerEl = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

let tickInterval = null;

function formatElapsed(startedAt) {
  const secs = Math.floor((Date.now() - startedAt) / 1000);
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function renderState(state) {
  if (state.recording) {
    statusEl.textContent = `Recording: ${state.title || 'tab'}`;
    statusEl.classList.add('recording');
    startBtn.disabled = true;
    stopBtn.disabled = false;
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = setInterval(() => {
      timerEl.textContent = formatElapsed(state.startedAt);
    }, 500);
    timerEl.textContent = formatElapsed(state.startedAt);
  } else {
    statusEl.textContent = state.lastError ? `Error: ${state.lastError}` : 'Idle';
    statusEl.classList.remove('recording');
    startBtn.disabled = false;
    stopBtn.disabled = true;
    if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
    timerEl.textContent = '00:00';
  }
}

chrome.runtime.sendMessage({ type: 'get-state' }, renderState);

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'state-changed') renderState(msg.state);
});

startBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  startBtn.disabled = true;
  statusEl.textContent = 'Starting…';
  chrome.runtime.sendMessage(
    { type: 'start-capture', tabId: tab.id, title: tab.title },
    (resp) => {
      if (!resp || !resp.ok) {
        statusEl.textContent = `Error: ${resp?.error || 'unknown'}`;
        startBtn.disabled = false;
      }
    }
  );
});

stopBtn.addEventListener('click', () => {
  stopBtn.disabled = true;
  statusEl.textContent = 'Saving…';
  chrome.runtime.sendMessage({ type: 'stop-capture' });
});
