// === THE $14K TOLL TRAP — MOTION COMIC ENGINE ===
// Big panel art + two-host narration, driven end-to-end by audio.
// No reading, no branching, no clicking through choices — press play
// and it plays itself, panel by panel, like a podcast with pictures.

// ---- flat segment queue across every panel ----
const SEGMENTS = [];
PANELS.forEach((panel, panelIdx) => {
    panel.dialogue.forEach(line => {
        SEGMENTS.push({ panelIdx, spkr: line.spkr, text: line.text });
    });
});

let currentIndex = 0;
let currentPanelIdx = -1;
let isPlaying = false;
let voices = [];
let voiceMapping = { cole: null, reyes: null };
let settings = { useBrowserTTS: false };
let audioUnlocked = false;
let ttsReady = false;
let ttsRetries = 0;
const MAX_TTS_RETRIES = 40;

const audioPlayer = document.getElementById('audioPlayer');
const panelStage = document.getElementById('panel-stage');
const captionSpkr = document.getElementById('caption-spkr');
const captionText = document.getElementById('caption-text');
const progressBar = document.getElementById('progressBar');
const playBtn = document.getElementById('playBtn');
const startOverlay = document.getElementById('startOverlay');
const panelCounter = document.getElementById('panelCounter');
const panelTitle = document.getElementById('panelTitle');
const panelIndicator = document.getElementById('panelIndicator');

// ==================== BOOT ====================
window.onload = () => {
    renderPanel(0);
    waitForEdgeTTS();
    document.getElementById('downloadBtn').addEventListener('click', downloadEpisode);
    document.getElementById('playBtn').addEventListener('click', togglePlay);
    document.getElementById('prevBtn').addEventListener('click', () => skip(-1));
    document.getElementById('nextBtn').addEventListener('click', () => skip(1));
    document.getElementById('startBtn').addEventListener('click', startFromOverlay);
    document.querySelectorAll('.host-chip').forEach(chip => {
        chip.addEventListener('click', () => openVoicePicker(chip.dataset.spkr));
    });
    document.getElementById('vpClose').addEventListener('click', closeVoicePicker);
    document.getElementById('voicePickerBackdrop').addEventListener('click', closeVoicePicker);
};

function waitForEdgeTTS() {
    if (window.ttsReady !== undefined) {
        loadEdgeVoices();
    } else if (ttsRetries < MAX_TTS_RETRIES) {
        ttsRetries++;
        setTimeout(waitForEdgeTTS, 150);
    } else {
        loadBrowserVoices();
    }
}

// ==================== VOICES ====================
const catalogByShortName = {};
(window.VOICE_CATALOG || []).forEach(v => { catalogByShortName[v.shortName] = v; });

function accentForLocale(locale) {
    const hit = (window.VOICE_CATALOG || []).find(v => v.locale === locale);
    return hit ? hit.accent : (locale || 'Unknown');
}

function annotateVoice(v) {
    const meta = catalogByShortName[v.ShortName];
    return { ...v, accent: meta ? meta.accent : accentForLocale(v.Locale), priority: meta ? meta.priority : null };
}

function sortVoicesByPriority(list) {
    const order = window.VOICE_PRIORITY_ORDER || [];
    return list.sort((a, b) => {
        const ai = a.priority ? order.indexOf(a.priority) : 999;
        const bi = b.priority ? order.indexOf(b.priority) : 999;
        if (ai !== bi) return ai - bi;
        return (a.FriendlyName || a.ShortName || '').localeCompare(b.FriendlyName || b.ShortName || '');
    });
}

async function loadEdgeVoices() {
    if (!window.ttsReady || !window.EdgeTTS || !window.VoicesManager) {
        return loadBrowserVoices();
    }
    try {
        const manager = await window.VoicesManager.create();
        let edgeVoices;
        if (Array.isArray(manager.voices)) edgeVoices = manager.voices;
        else if (typeof manager.getVoices === 'function') edgeVoices = manager.getVoices();
        else if (typeof manager.find === 'function') edgeVoices = manager.find({});
        else edgeVoices = [];
        if (!edgeVoices || edgeVoices.length === 0) throw new Error('No Edge voices');
        voices = sortVoicesByPriority(edgeVoices.map(annotateVoice));
        settings.useBrowserTTS = false;
        ttsReady = true;
    } catch (e) {
        console.warn('Edge-TTS voice listing unavailable, falling back to browser TTS', e);
        loadBrowserVoices();
        return;
    }
    initDefaultVoices();
    renderHostChips();
}

function loadBrowserVoices() {
    settings.useBrowserTTS = true;
    if (!window.speechSynthesis) { ttsReady = false; return; }
    const grab = () => {
        const bv = speechSynthesis.getVoices();
        if (!bv.length) return false;
        voices = sortVoicesByPriority(bv.map(v => annotateVoice({
            ShortName: v.name, FriendlyName: v.name,
            Gender: /female|woman|zira|karen|moira|tessa|fiona|allison|ava|susan|samantha|victoria/i.test(v.name) ? 'Female' : 'Male',
            Locale: v.lang, _native: v
        })));
        ttsReady = true;
        initDefaultVoices();
        renderHostChips();
        return true;
    };
    if (!grab()) {
        speechSynthesis.onvoiceschanged = grab;
        setTimeout(grab, 500);
    }
}

function initDefaultVoices() {
    if (voices.length === 0) return;
    const en = voices.filter(v => (v.Locale || '').toLowerCase().startsWith('en'));
    const pool = en.length ? en : voices;
    const males = pool.filter(v => (v.Gender || '').toLowerCase() === 'male');
    const females = pool.filter(v => (v.Gender || '').toLowerCase() === 'female');
    if (!voiceMapping.cole)  voiceMapping.cole  = (males[0]  || pool[0]).ShortName;
    if (!voiceMapping.reyes) voiceMapping.reyes = (females[0] || pool[1] || pool[0]).ShortName;
}

// ==================== HOST CHIPS + VOICE PICKER ====================
function renderHostChips() {
    Object.keys(HOSTS).forEach(spkr => {
        const meta = voices.find(v => v.ShortName === voiceMapping[spkr]);
        const el = document.querySelector(`.host-chip[data-spkr="${spkr}"] .host-voice`);
        if (el) el.textContent = meta ? (meta.FriendlyName || meta.ShortName) : 'choose a voice…';
    });
}

let vpCurrentSpkr = null;
let vpShowAll = false;

function openVoicePicker(spkr) {
    vpCurrentSpkr = spkr;
    vpShowAll = false;
    document.getElementById('vpTitle').textContent = 'Voice for ' + HOSTS[spkr].name;
    renderVoicePickerBody();
    document.getElementById('voicePickerBackdrop').classList.add('open');
    document.getElementById('voicePicker').classList.add('open');
}

function closeVoicePicker() {
    document.getElementById('voicePickerBackdrop').classList.remove('open');
    document.getElementById('voicePicker').classList.remove('open');
    vpCurrentSpkr = null;
}

function renderVoicePickerBody() {
    const body = document.getElementById('vpBody');
    body.innerHTML = '';
    if (!vpCurrentSpkr || voices.length === 0) {
        body.innerHTML = '<p style="color:#888;font-size:0.85rem;">Loading voices…</p>';
        return;
    }
    const order = window.VOICE_PRIORITY_ORDER || [];
    const groups = {};
    voices.forEach(v => {
        const key = v.priority || v.accent || 'Other';
        (groups[key] || (groups[key] = [])).push(v);
    });
    const priorityKeys = order.filter(k => groups[k]);
    const restKeys = Object.keys(groups).filter(k => !order.includes(k)).sort();

    const renderGroup = key => {
        const head = document.createElement('div');
        head.className = 'vp-group-head';
        head.textContent = key;
        body.appendChild(head);
        groups[key].forEach(v => body.appendChild(renderVoiceRow(v)));
    };
    priorityKeys.forEach(renderGroup);
    if (vpShowAll) {
        restKeys.forEach(renderGroup);
    } else if (restKeys.length) {
        const more = document.createElement('button');
        more.className = 'vp-showmore';
        more.textContent = `Show ${restKeys.length} more accents ▾`;
        more.onclick = () => { vpShowAll = true; renderVoicePickerBody(); };
        body.appendChild(more);
    }
}

function renderVoiceRow(v) {
    const row = document.createElement('div');
    row.className = 'vp-voice-row';
    const isSelected = voiceMapping[vpCurrentSpkr] === v.ShortName;
    const main = document.createElement('div');
    main.className = 'vp-voice-main';
    main.innerHTML = `<span class="vn${isSelected ? ' selected' : ''}">${v.FriendlyName || v.ShortName}</span><span class="va">${v.accent || ''}</span>`;
    main.onclick = () => {
        voiceMapping[vpCurrentSpkr] = v.ShortName;
        closeVoicePicker();
        renderHostChips();
    };
    const testBtn = document.createElement('button');
    testBtn.className = 'vp-test-btn';
    testBtn.textContent = '🔊 Test';
    testBtn.onclick = async (e) => {
        e.stopPropagation();
        testBtn.textContent = '⏳';
        await previewVoice(v);
        testBtn.textContent = '🔊 Test';
    };
    row.appendChild(main);
    row.appendChild(testBtn);
    return row;
}

async function previewVoice(v) {
    const sample = "The gantry writes a letter instead of taking a beep.";
    return synthesizeToPlayer(sample, v.ShortName).catch(() => {});
}

// ==================== AUDIO UNLOCK ====================
function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    audioPlayer.muted = true;
    const p = audioPlayer.play();
    if (p && p.catch) p.catch(() => {});
    audioPlayer.pause();
    audioPlayer.muted = false;
}

function startFromOverlay() {
    unlockAudio();
    startOverlay.classList.add('hidden');
    play();
}

// ==================== SYNTHESIS ====================
function formatEdgePct() { return '+0%'; }

// Resolves with a Blob of audio for one line of text in one voice, trying
// Edge-TTS first and silently falling back to nothing (caller decides what
// "no blob" means) rather than throwing — playback and preview both need
// to keep going even when Edge-TTS is unreachable.
async function synthesizeEdge(text, voiceShortName) {
    const tts = new window.EdgeTTS(String(text || ' '), voiceShortName, {
        rate: formatEdgePct(), pitch: '+0Hz', volume: '+0%'
    });
    const result = await tts.synthesize();
    return new Blob([result.audio], { type: 'audio/mp3' });
}

function synthesizeToPlayer(text, voiceShortName) {
    return new Promise((resolve, reject) => {
        if (!settings.useBrowserTTS && window.EdgeTTS) {
            synthesizeEdge(text, voiceShortName).then(blob => {
                const url = URL.createObjectURL(blob);
                audioPlayer.src = url;
                audioPlayer.onended = () => { URL.revokeObjectURL(url); resolve(); };
                audioPlayer.onerror = () => { URL.revokeObjectURL(url); reject(new Error('audio error')); };
                audioPlayer.play().catch(reject);
            }).catch(() => speakBrowser(text, voiceShortName).then(resolve, reject));
        } else {
            speakBrowser(text, voiceShortName).then(resolve, reject);
        }
    });
}

function speakBrowser(text, voiceShortName) {
    return new Promise((resolve, reject) => {
        if (!window.speechSynthesis) return reject(new Error('no speechSynthesis'));
        const u = new SpeechSynthesisUtterance(text);
        const v = speechSynthesis.getVoices().find(v => v.name === voiceShortName);
        if (v) u.voice = v;
        u.onend = () => resolve();
        u.onerror = (e) => { if (e.error === 'interrupted' || e.error === 'canceled') resolve(); else reject(e); };
        speechSynthesis.cancel();
        setTimeout(() => speechSynthesis.speak(u), 30);
    });
}

// ==================== PLAYBACK ====================
function renderPanel(idx) {
    const panel = PANELS[idx];
    if (!panel) return;
    if (idx !== currentPanelIdx) {
        currentPanelIdx = idx;
        panelStage.innerHTML = panel.svg;
    }
    panelCounter.textContent = `PANEL ${panel.id} / ${PANELS.length}`;
    panelTitle.textContent = panel.title;
    panelIndicator.textContent = panel.indicator;
    panelIndicator.style.color = panel.indicatorColor;
    panelIndicator.style.borderColor = panel.indicatorColor;
}

function renderCaption(seg) {
    captionSpkr.textContent = HOSTS[seg.spkr].name.toUpperCase();
    captionSpkr.className = 'caption-spkr spkr-' + seg.spkr;
    captionText.textContent = seg.text;
}

async function play() {
    if (currentIndex >= SEGMENTS.length) currentIndex = 0;
    isPlaying = true;
    playBtn.textContent = '⏸ PAUSE';
    await playCurrentSegment();
}

async function playCurrentSegment() {
    if (!isPlaying) return;
    const seg = SEGMENTS[currentIndex];
    if (!seg) { finishEpisode(); return; }
    renderPanel(seg.panelIdx);
    renderCaption(seg);
    updateProgress();
    const voice = voiceMapping[seg.spkr] || (voices[0] && voices[0].ShortName);
    try {
        await synthesizeToPlayer(seg.text, voice);
    } catch (e) {
        console.warn('Narration failed for this line, advancing anyway', e);
    }
    if (!isPlaying) return;
    currentIndex++;
    if (currentIndex < SEGMENTS.length) playCurrentSegment();
    else finishEpisode();
}

function finishEpisode() {
    isPlaying = false;
    playBtn.textContent = '▶ PLAY';
    currentIndex = 0;
}

function togglePlay() {
    unlockAudio();
    if (isPlaying) {
        isPlaying = false;
        playBtn.textContent = '▶ PLAY';
        audioPlayer.pause();
        if (window.speechSynthesis) speechSynthesis.cancel();
    } else {
        play();
    }
}

function skip(dir) {
    unlockAudio();
    isPlaying = false;
    audioPlayer.pause();
    if (window.speechSynthesis) speechSynthesis.cancel();
    currentIndex = Math.max(0, Math.min(SEGMENTS.length - 1, currentIndex + dir));
    play();
}

function updateProgress() {
    progressBar.style.width = (currentIndex / SEGMENTS.length * 100) + '%';
}

// ==================== DOWNLOAD FULL EPISODE AS MP3 ====================
async function downloadEpisode() {
    const btn = document.getElementById('downloadBtn');
    if (settings.useBrowserTTS || !window.EdgeTTS) {
        alert('MP3 export needs Edge-TTS neural voices, which aren’t reachable right now. Browser voices can be heard live but can’t be exported to a file.');
        return;
    }
    const original = btn.textContent;
    btn.disabled = true;
    const blobs = [];
    try {
        for (let i = 0; i < SEGMENTS.length; i++) {
            const seg = SEGMENTS[i];
            btn.textContent = `⏳ Rendering line ${i + 1} / ${SEGMENTS.length}`;
            const voice = voiceMapping[seg.spkr] || (voices[0] && voices[0].ShortName);
            blobs.push(await synthesizeEdge(seg.text, voice));
            await new Promise(r => setTimeout(r, 120));
        }
        const finalBlob = new Blob(blobs, { type: 'audio/mp3' });
        const url = URL.createObjectURL(finalBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'The_14K_Toll_Trap.mp3';
        a.click();
        URL.revokeObjectURL(url);
        btn.textContent = '✅ SAVED';
    } catch (e) {
        console.error('Episode export failed:', e);
        btn.textContent = '❌ EXPORT FAILED';
    } finally {
        setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 3000);
    }
}
