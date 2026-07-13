const DOC_PATTERNS = [
  { pattern: /docs\.google\.com/, label: 'Google Docs' },
  { pattern: /sheets\.google\.com/, label: 'Google Sheets' },
  { pattern: /slides\.google\.com/, label: 'Google Slides' }
];

const statusText = document.getElementById('statusText');
const statusbar = document.getElementById('statusbar');
const timerEl = document.getElementById('timer');
const stopBtn = document.getElementById('stopBtn');
const tabList = document.getElementById('tabList');
const refreshBtn = document.getElementById('refreshBtn');

let currentState = { recording: false, tabId: null, title: '', startedAt: 0, lastError: '' };
let tickInterval = null;
let knownTabs = [];

function labelForUrl(url) {
  const hit = DOC_PATTERNS.find((d) => d.pattern.test(url || ''));
  return hit ? hit.label : null;
}

function formatElapsed(startedAt) {
  const secs = Math.floor((Date.now() - startedAt) / 1000);
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function renderState(state) {
  currentState = state;
  if (state.recording) {
    statusText.textContent = `Recording: ${state.title || 'tab'}`;
    statusText.classList.add('recording');
    statusbar.classList.add('recording');
    stopBtn.disabled = false;
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = setInterval(() => {
      timerEl.textContent = formatElapsed(state.startedAt);
    }, 500);
    timerEl.textContent = formatElapsed(state.startedAt);
  } else {
    statusText.textContent = state.lastError ? `Error: ${state.lastError}` : 'Idle';
    statusText.classList.remove('recording');
    statusbar.classList.remove('recording');
    stopBtn.disabled = true;
    if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
    timerEl.textContent = '00:00';
  }
  renderTabList();
}

function renderTabList() {
  tabList.innerHTML = '';
  if (knownTabs.length === 0) {
    tabList.innerHTML = '<div class="empty">No other tabs open. Open a doc and hit Refresh.</div>';
    return;
  }

  const sorted = [...knownTabs].sort((a, b) => {
    const aDocs = labelForUrl(a.url) ? 0 : 1;
    const bDocs = labelForUrl(b.url) ? 0 : 1;
    return aDocs - bDocs;
  });

  sorted.forEach((tab) => {
    const label = labelForUrl(tab.url);
    const row = document.createElement('div');
    row.className = 'tab-row' + (label ? ' docs' : '');

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = label || 'tab';

    const info = document.createElement('div');
    info.className = 'tab-info';
    const titleEl = document.createElement('div');
    titleEl.className = 'tab-title';
    titleEl.textContent = tab.title || tab.url;
    const urlEl = document.createElement('div');
    urlEl.className = 'tab-url';
    urlEl.textContent = tab.url || '';
    info.appendChild(titleEl);
    info.appendChild(urlEl);

    const btn = document.createElement('button');
    btn.className = 'captureBtn';
    const isThisRecording = currentState.recording && currentState.tabId === tab.id;
    if (isThisRecording) {
      btn.textContent = '● Recording…';
      btn.disabled = true;
    } else if (currentState.recording) {
      btn.textContent = '● Capture';
      btn.disabled = true;
    } else {
      btn.textContent = '● Capture';
      btn.disabled = false;
      btn.onclick = () => startCapture(tab);
    }

    row.appendChild(badge);
    row.appendChild(info);
    row.appendChild(btn);
    tabList.appendChild(row);
  });
}

async function discoverTabs() {
  const recorderUrl = chrome.runtime.getURL('recorder.html');
  const tabs = await chrome.tabs.query({});
  knownTabs = tabs.filter((t) => t.url && !t.url.startsWith(recorderUrl));
  renderTabList();
}

function startCapture(tab) {
  chrome.runtime.sendMessage(
    { type: 'start-capture', tabId: tab.id, title: tab.title || tab.url },
    (resp) => {
      if (!resp || !resp.ok) {
        statusText.textContent = `Error: ${resp?.error || 'unknown'}`;
      }
    }
  );
}

stopBtn.addEventListener('click', () => {
  stopBtn.disabled = true;
  statusText.textContent = 'Saving…';
  chrome.runtime.sendMessage({ type: 'stop-capture' });
});

refreshBtn.addEventListener('click', discoverTabs);

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'state-changed') renderState(msg.state);
});

chrome.runtime.sendMessage({ type: 'get-state' }, (state) => {
  renderState(state || currentState);
  discoverTabs();
});
