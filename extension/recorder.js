// Badge patterns purely label tabs for convenience — capture itself works
// on any tab, this list just gets a nicer chip than the generic "tab".
const SITE_PATTERNS = [
  { pattern: /docs\.google\.com/, label: 'Google Docs', color: '#4285f4' },
  { pattern: /sheets\.google\.com/, label: 'Google Sheets', color: '#0f9d58' },
  { pattern: /slides\.google\.com/, label: 'Google Slides', color: '#f4b400' },
  { pattern: /gemini\.google\.com/, label: 'Gemini', color: '#1a73e8' },
  { pattern: /chatgpt\.com|chat\.openai\.com/, label: 'ChatGPT', color: '#10a37f' },
  { pattern: /claude\.ai/, label: 'Claude', color: '#d97706' },
  { pattern: /grok\.com/, label: 'Grok', color: '#888' },
  { pattern: /chat\.deepseek\.com/, label: 'DeepSeek', color: '#4d6bfe' },
  { pattern: /perplexity\.ai/, label: 'Perplexity', color: '#20b2aa' },
  { pattern: /copilot\.com/, label: 'Copilot', color: '#0078d4' },
  { pattern: /poe\.com/, label: 'Poe', color: '#6366f1' },
  { pattern: /notebooklm\.google\.com/, label: 'NotebookLM', color: '#a142f4' }
];

const statusText = document.getElementById('statusText');
const statusbar = document.getElementById('statusbar');
const timerEl = document.getElementById('timer');
const stopBtn = document.getElementById('stopBtn');
const tabList = document.getElementById('tabList');
const refreshBtn = document.getElementById('refreshBtn');
const waitForSoundEl = document.getElementById('waitForSound');

let currentState = { recording: false, armed: false, tabId: null, title: '', startedAt: 0, lastError: '' };
let tickInterval = null;
let knownTabs = [];

function siteForUrl(url) {
  return SITE_PATTERNS.find((s) => s.pattern.test(url || '')) || null;
}

function formatElapsed(startedAt) {
  const secs = Math.floor((Date.now() - startedAt) / 1000);
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function renderState(state) {
  currentState = state;
  statusbar.classList.remove('recording', 'armed');
  statusText.classList.remove('recording', 'armed');
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }

  if (state.recording) {
    statusText.textContent = `Recording: ${state.title || 'tab'}`;
    statusText.classList.add('recording');
    statusbar.classList.add('recording');
    stopBtn.disabled = false;
    tickInterval = setInterval(() => { timerEl.textContent = formatElapsed(state.startedAt); }, 500);
    timerEl.textContent = formatElapsed(state.startedAt);
  } else if (state.armed) {
    statusText.textContent = `Armed — waiting for audio: ${state.title || 'tab'}`;
    statusText.classList.add('armed');
    statusbar.classList.add('armed');
    stopBtn.disabled = false;
    timerEl.textContent = 'listening…';
  } else {
    statusText.textContent = state.lastError ? `Error: ${state.lastError}` : 'Idle';
    stopBtn.disabled = true;
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

  const busy = currentState.recording || currentState.armed;
  const sorted = [...knownTabs].sort((a, b) => {
    const aKnown = siteForUrl(a.url) ? 0 : 1;
    const bKnown = siteForUrl(b.url) ? 0 : 1;
    return aKnown - bKnown;
  });

  sorted.forEach((tab) => {
    const site = siteForUrl(tab.url);
    const row = document.createElement('div');
    row.className = 'tab-row' + (site ? ' known' : '');

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = site ? site.label : 'tab';
    if (site) { badge.style.background = site.color; badge.style.color = '#0c0c12'; }

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
    const isThisOne = busy && currentState.tabId === tab.id;
    if (isThisOne) {
      btn.textContent = currentState.recording ? '● Recording…' : '● Armed…';
      btn.disabled = true;
    } else if (busy) {
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
    { type: 'start-capture', tabId: tab.id, title: tab.title || tab.url, waitForSound: waitForSoundEl.checked },
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
