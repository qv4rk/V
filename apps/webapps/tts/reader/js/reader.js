// ==================== STATE ====================
let voices = [];
let segments = [];
let currentSegmentIndex = 0;
let voiceMapping = { narrator: null };
let detectedSpkrs = new Set(['narrator']);
let voiceStatusMemory = {}; // { voiceName: 'working'|'broken' }
let settings = { speed: 1.0, volume: 1.0, useBrowserTTS: false, voicesLoaded: false };
const audioPlayer = document.getElementById('audioPlayer');
let nativeTTSActive = false;
let voiceLoadAttempted = false;
let isPlaying = false;
let audioUnlocked = false;

// Lookahead Cache for seamless pre-buffering
const audioCache = {};
const audioCachePending = {};
let audioCacheGen = 0;
const PRELOAD_LOOKAHEAD = 2; // how many segments to keep pre-buffered ahead of playback
const MAX_WORDS_PER_TTS_CALL = 45; // long paragraphs are split into word-bounded chunks so a single call can't time out/fail

function clearAudioCache() {
    audioCacheGen++;
    Object.values(audioCache).forEach(url => {
        try { URL.revokeObjectURL(url); } catch(e) {}
    });
    for (let k in audioCache) delete audioCache[k];
    for (let k in audioCachePending) delete audioCachePending[k];
}

// Splits text into chunks of at most maxWords words, breaking at sentence
// boundaries where possible (and mid-sentence only as a last resort) so
// nothing gets cut off inside a word. Kept separate from a single overlong
// paragraph -- Edge-TTS is far more likely to fail/time out on one huge
// request than on several small ones.
function chunkTextForTTS(text, maxWords = MAX_WORDS_PER_TTS_CALL) {
    const trimmed = String(text || '').trim();
    if(!trimmed) return [];
    const words = trimmed.split(/\s+/);
    if(words.length <= maxWords) return [trimmed];

    const sentences = trimmed.match(/[^.!?]+[.!?]*(?:\s+|$)/g) || [trimmed];
    const chunks = [];
    let current = [];
    let count = 0;
    sentences.forEach(rawSentence => {
        const sentence = rawSentence.trim();
        if(!sentence) return;
        const sWords = sentence.split(/\s+/);
        if(sWords.length > maxWords) {
            if(current.length) { chunks.push(current.join(' ')); current = []; count = 0; }
            for(let i = 0; i < sWords.length; i += maxWords) {
                chunks.push(sWords.slice(i, i + maxWords).join(' '));
            }
            return;
        }
        if(count && count + sWords.length > maxWords) {
            chunks.push(current.join(' '));
            current = [];
            count = 0;
        }
        current.push(sentence);
        count += sWords.length;
    });
    if(current.length) chunks.push(current.join(' '));
    return chunks.filter(Boolean);
}

// One Edge-TTS call, with a single silent retry -- an empty/failed response
// is often just a blip from firing requests back-to-back, and a beat later
// usually clears it without bothering the reader with an error.
async function synthesizeEdgeChunk(text, voice, opts) {
    // 1. Check local on-device Kokoro TTS (HTTP or HTTPS on 5005)
    for (const proto of ['http', 'https']) {
        try {
            const localUrl = proto + '://127.0.0.1:5005/synthesize?text=' + encodeURIComponent(text) + '&voice=' + encodeURIComponent(voice || '');
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 15000);
            const res = await fetch(localUrl, { signal: ctrl.signal });
            clearTimeout(tid);
            if (res.ok) {
                const buf = await res.arrayBuffer();
                if (buf && buf.byteLength > 0) {
                    console.log('[Kokoro] Received ' + buf.byteLength + ' bytes for voice: ' + (voice || 'default'));
                    return buf;
                }
            }
        } catch(err) {}
    }

    // 2. Remote Edge-TTS Fallback
    for (let attempt = 0; attempt < 2; attempt++) {
        if(attempt > 0) await new Promise(resolve => setTimeout(resolve, 500));
        try {
            const result = await new window.EdgeTTS(text, voice, opts).synthesize();
            if(result && result.audio && result.audio.byteLength > 0) return result.audio;
        } catch(e) {
            console.warn('Edge-TTS chunk failed' + (attempt === 0 ? ', retrying once' : ', giving up') + ':', e?.message || e);
        }
    }
    return null;
}

// Synthesizes a full segment's text (chunked + retried under the hood) and
// stitches the pieces into one playable/downloadable Blob. Shared by
// playback, lookahead preloading, and chapter export so they all get the
// same chunking + retry behavior for free.
async function synthesizeSegmentAudio(text, voice, opts) {
    const chunks = chunkTextForTTS(text);
    if(chunks.length === 0) return null;
    const blobs = [];
    for (const chunk of chunks) {
        const audio = await synthesizeEdgeChunk(chunk, voice, opts);
        if(audio) blobs.push(new Blob([audio], { type: 'audio/mp3' }));
        else console.warn('Dropped a TTS chunk with no audio after retry:', chunk.slice(0, 60));
    }
    if(blobs.length === 0) return null;
    return new Blob(blobs, { type: 'audio/mp3' });
}

function edgeTTSOpts() {
    return { rate: formatEdgePct(settings.speed), pitch: '+0Hz', volume: formatEdgePct(settings.volume) };
}

// ==================== BACKGROUND ====================
(function() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height, frame = 0;
    let target = { x: window.innerWidth/2, y: window.innerHeight/2 };
    let current = { ...target };
    let particles = [];
    function resize() { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', e => { target.x = e.clientX; target.y = e.clientY; });
    window.addEventListener('touchmove', e => { target.x = e.touches[0].clientX; target.y = e.touches[0].clientY; }, {passive:true});
    for(let i=0;i<30;i++) particles.push({x:Math.random()*window.innerWidth,y:Math.random()*window.innerHeight,vx:(Math.random()-.5)*.5,vy:(Math.random()-.5)*.5,size:Math.random()*2+1});
    (function loop() {
        requestAnimationFrame(loop); frame++;
        current.x += (target.x - current.x) * 0.05;
        current.y += (target.y - current.y) * 0.05;
        ctx.fillStyle = 'rgba(5,5,16,0.05)';
        ctx.fillRect(0,0,width,height);
        ctx.save(); ctx.translate(current.x, current.y); ctx.rotate(frame*0.003);
        for(let i=0;i<8;i++){
            ctx.save(); ctx.rotate(i*(Math.PI*2/8));
            ctx.strokeStyle=`hsla(${(frame+i*20)%360},100%,50%,0.25)`; ctx.lineWidth=1.5;
            ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(60+Math.sin(frame*.05)*20,18); ctx.lineTo(60+Math.sin(frame*.05)*20,-18); ctx.closePath(); ctx.stroke(); ctx.restore();
        }
        ctx.restore();
        particles.forEach(p=>{
            p.x+=p.vx; p.y+=p.vy;
            if(p.x<0||p.x>width) p.vx*=-1;
            if(p.y<0||p.y>height) p.vy*=-1;
            const dx=current.x-p.x, dy=current.y-p.y, dist=Math.hypot(dx,dy);
            if(dist<220){ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fillStyle=`rgba(0,243,255,${.25*(1-dist/220)})`;ctx.fill();}
        });
    })();
})();

// ==================== INIT ====================
window.onload = () => {
    checkPersistence();
    waitForLib();
    setupKeyboard();
    if(window.FeistTheme) FeistTheme.mount('#themeSwitcherMount');
    if(!localStorage.getItem('feist_visited')) {
        expandHelp();
        localStorage.setItem('feist_visited', '1');
    }
    loadLibrary();
    const params = new URLSearchParams(window.location.search);
    const pdfUrl = params.get('pdf');
    if (pdfUrl) {
        loadPDFFromUrl(pdfUrl, params.get('title'));
    }
    const articleId = params.get('article');
    if (articleId) {
        loadArticleIntoReader(articleId, false);
    }
};

function waitForLib() {
    if(window.appReady) loadEdgeVoices();
    else setTimeout(waitForLib, 100);
}

// ==================== PLATFORM TABS ====================
function setPlatform(id, el) {
    document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.platform-inst').forEach(d => d.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('inst-'+id).classList.add('active');
}

// ==================== AUDIO UNLOCK ====================
function unlockAudioPlayback() {
    if(audioUnlocked) return;
    audioUnlocked = true;
    audioPlayer.muted = true;
    const p = audioPlayer.play();
    if(p && p.catch) p.catch(() => {});
    audioPlayer.pause();
    audioPlayer.muted = false;
}

// --- VOICE LOADING ---
function triggerVoiceLoad() {
    const statusEl = document.getElementById('voiceLoadStatus');
    if(voiceLoadAttempted && voices.length > 0) {
        if(statusEl) {
            statusEl.textContent = `✅ ${voices.length} voices already loaded`;
            statusEl.style.color = '#00ff41';
        }
        return;
    }
    if(statusEl) {
        statusEl.textContent = '⏳ Triggering browser voice loader...';
        statusEl.style.color = 'orange';
    }
    voiceLoadAttempted = true;
    const utterance = new SpeechSynthesisUtterance('');
    utterance.volume = 0; utterance.rate = 10;

    utterance.onstart = () => {
        if (window.speechSynthesis) speechSynthesis.cancel();
        setTimeout(() => {
            loadBrowserVoices();
            const cnt = voices.length;
            if(statusEl) {
                statusEl.textContent = cnt > 0 ? `✅ ${cnt} voices loaded` : '⚠ No voices found — try Read Aloud in Edge first';
                statusEl.style.color = cnt > 0 ? '#00ff41' : 'orange';
            }
            renderVoiceMapping();
        }, 200);
    };

    utterance.onerror = () => {
        loadBrowserVoices();
        const cnt = voices.length;
        if(statusEl) {
            statusEl.textContent = cnt > 0 ? `✅ ${cnt} voices loaded` : '⚠ No browser voices found';
            statusEl.style.color = cnt > 0 ? '#00ff41' : 'orange';
        }
    };
    if (window.speechSynthesis) speechSynthesis.speak(utterance);
}

// ==================== VOICE CATALOG ====================
const catalogByShortName = {};
(window.VOICE_CATALOG || []).forEach(v => { catalogByShortName[v.shortName] = v; });

function accentForLocale(locale) {
    const hit = (window.VOICE_CATALOG || []).find(v => v.locale === locale);
    return hit ? hit.accent : (locale || 'Unknown');
}

function annotateVoice(v) {
    const meta = catalogByShortName[v.ShortName];
    return {
        ...v,
        accent: meta ? meta.accent : accentForLocale(v.Locale),
        priority: meta ? meta.priority : null,
    };
}

function sortVoicesByPriority(list) {
    const order = window.VOICE_PRIORITY_ORDER || [];
    return list.sort((a, b) => {
        const ai = a.priority ? order.indexOf(a.priority) : 999;
        const bi = b.priority ? order.indexOf(b.priority) : 999;
        if(ai !== bi) return ai - bi;
        const an = a.FriendlyName || a.ShortName || '';
        const bn = b.FriendlyName || b.ShortName || '';
        return an.localeCompare(bn);
    });
}

async function loadEdgeVoices() {
    let localKokoroVoices = [];
    try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 1500);
        const kRes = await fetch('https://127.0.0.1:5005/voices', { signal: ctrl.signal });
        clearTimeout(tid);
        if(kRes.ok) {
            localKokoroVoices = await kRes.json();
            console.log('Loaded local Kokoro voices:', localKokoroVoices.length);
        }
    } catch(e) {}
    try {
        const manager = await window.VoicesManager.create();
        let edgeVoices;
        if(Array.isArray(manager.voices)) edgeVoices = manager.voices;
        else if(typeof manager.getVoices === 'function') edgeVoices = manager.getVoices();
        else if(typeof manager.find === 'function') edgeVoices = manager.find({});
        else edgeVoices = [];

        if(!edgeVoices || edgeVoices.length === 0) throw new Error('No Edge voices array available');
        voices = [...localKokoroVoices.map(annotateVoice), ...sortVoicesByPriority(edgeVoices.map(annotateVoice))];
        settings.useBrowserTTS = false;
    } catch(e) {
        console.warn('Edge-TTS voice listing unavailable, using bundled catalog', e);
        const fallback = (window.VOICE_CATALOG || []).map(v => ({
            ShortName: v.shortName, FriendlyName: v.name, Gender: v.gender, Locale: v.locale
        }));
        voices = [...localKokoroVoices.map(annotateVoice), ...sortVoicesByPriority(fallback.map(annotateVoice))];
        settings.useBrowserTTS = false;
    }
    initializeDefaultVoiceMapping();
}

function loadBrowserVoices() {
    settings.useBrowserTTS = true;
    if (!window.speechSynthesis) return;
    const bv = speechSynthesis.getVoices();
    if(!bv.length) return;

    const femaleKeywords = ['female','woman','girl','samantha','victoria','zira','karen','moira','tessa','fiona','nicky','allison','ava','susan'];
    const childKeywords = ['child','kid','junior'];

    voices = bv.map(v => {
        const nameLow = v.name.toLowerCase();
        const isFemale = femaleKeywords.some(k => nameLow.includes(k));
        const isChild = childKeywords.some(k => nameLow.includes(k));
        return annotateVoice({
            ShortName: v.name,
            FriendlyName: v.name,
            Gender: isFemale ? 'Female' : 'Male',
            AgeGroup: isChild ? 'Child' : 'Adult',
            Locale: v.lang,
            _native: v
        });
    });

    voices = sortVoicesByPriority(voices);
    settings.voicesLoaded = true;
    if(!voiceMapping.narrator && voices.length > 0) voiceMapping.narrator = voices[0].ShortName;
}

function initializeDefaultVoiceMapping() {
    if(voices.length === 0) return;
    const femaleEN = voices.find(v => (v.Gender || '').toLowerCase() === 'female' && v.Locale && v.Locale.startsWith('en'));
    voiceMapping.narrator = femaleEN ? femaleEN.ShortName : voices[0].ShortName;
}

function autoAssignVoices() {
    const spkrs = [...detectedSpkrs];
    const females = voices.filter(v => (v.Gender || '').toLowerCase() === 'female' && v.Locale && v.Locale.startsWith('en'));
    const males = voices.filter(v => (v.Gender || '').toLowerCase() === 'male' && v.Locale && v.Locale.startsWith('en'));
    const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
    const fPool = shuffle(females);
    const mPool = shuffle(males);
    let fi = 0, mi = 0;
    spkrs.forEach((spkr, idx) => {
        if(voiceMapping[spkr]) return;
        if(spkr === 'narrator') {
            voiceMapping[spkr] = fPool[fi % fPool.length]?.ShortName || voices[0]?.ShortName;
            fi++;
        } else if(idx % 2 === 0 && mPool.length) {
            voiceMapping[spkr] = mPool[mi % mPool.length]?.ShortName;
            mi++;
        } else {
            voiceMapping[spkr] = fPool[fi % fPool.length]?.ShortName;
            fi++;
        }
    });
    clearAudioCache();
}

function renderVoiceMapping() {
    const container = document.getElementById('voiceMappingContainer');
    const engineDiv = document.getElementById('engineStatus');
    if (!container || !engineDiv) return;
    container.innerHTML = '';
    engineDiv.innerHTML = '';

    const badge = document.createElement('div');
    badge.className = 'engine-badge ' + (settings.useBrowserTTS ? 'browser' : 'edge');
    badge.innerText = settings.useBrowserTTS ? '🌐 BROWSER TTS — ' + voices.length + ' voices' : '⚡ EDGE-TTS — ' + voices.length + ' voices';
    engineDiv.appendChild(badge);

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn';
    toggleBtn.style.cssText = 'width:100%; font-size:0.7rem;';
    toggleBtn.innerText = settings.useBrowserTTS ? '⚡ SWITCH TO EDGE-TTS' : '🌐 SWITCH TO BROWSER TTS';
    toggleBtn.onclick = () => {
        settings.useBrowserTTS = !settings.useBrowserTTS;
        clearAudioCache();
        if(settings.useBrowserTTS) loadBrowserVoices();
        else loadEdgeVoices();
        renderVoiceMapping();
    };
    engineDiv.appendChild(toggleBtn);

    const spkrs = [...detectedSpkrs].sort((a,b) => a==='narrator'?-1:b==='narrator'?1:a.localeCompare(b));

    spkrs.forEach(spkr => {
        const card = buildCharCard(spkr);
        container.appendChild(card);
    });

    renderCharRow(spkrs);

    const hbVoicesBtn = document.getElementById('hamburgerVoicesBtn');
    if(hbVoicesBtn) hbVoicesBtn.style.display = '';
}

function renderCharRow(spkrs) {
    const row = document.getElementById('charRow');
    if(!row) return;
    row.innerHTML = '';
    if(spkrs.length === 0 || spkrs.length > 5) return;
    spkrs.forEach(spkr => {
        const chip = document.createElement('button');
        chip.className = 'char-chip';
        const meta = voices.find(v => v.ShortName === voiceMapping[spkr]);
        const label = spkr === 'narrator' ? '📖 Narrator' : '💬 ' + spkr;
        chip.innerHTML = `<span class="cc-name">${label}</span><span class="cc-voice">${meta ? (meta.FriendlyName || meta.ShortName) : 'choose…'}</span>`;
        chip.onclick = () => openVoicePicker(spkr);
        row.appendChild(chip);
    });
}

function buildCharCard(spkr) {
    const card = document.createElement('div');
    card.className = 'char-card';
    card.id = 'char-card-' + spkr.replace(/\s+/g,'_');

    const nameRow = document.createElement('div');
    nameRow.className = 'char-name';
    nameRow.innerText = spkr === 'narrator' ? '📖 NARRATOR' : '💬 ' + spkr.toUpperCase();
    card.appendChild(nameRow);

    const trigger = document.createElement('div');
    trigger.className = 'voice-trigger';
    trigger.onclick = () => openVoicePicker(spkr);

    const meta = voices.find(v => v.ShortName === voiceMapping[spkr]);
    const info = document.createElement('div');
    info.className = 'vt-info';
    info.innerHTML = `<span class="vt-name">${meta ? (meta.FriendlyName || meta.ShortName) : 'Choose a voice…'}</span><span class="vt-accent">${meta ? meta.accent : ''}</span>`;

    const dot = document.createElement('div');
    dot.className = 'voice-status-dot';
    updateStatusDot(dot, spkr, voiceMapping[spkr]);

    trigger.appendChild(info);
    trigger.appendChild(dot);
    card.appendChild(trigger);
    return card;
}

// ==================== VOICE PICKER ====================
let vpCurrentSpkr = null;
let vpShowAll = false;

function openVoicePicker(spkr) {
    vpCurrentSpkr = spkr;
    vpShowAll = false;
    document.getElementById('vpTitle').innerText = 'Voice for ' + (spkr === 'narrator' ? 'Narrator' : spkr);
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
    if(!vpCurrentSpkr) return;

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
        head.innerText = key;
        body.appendChild(head);
        groups[key].forEach(v => body.appendChild(renderVoiceRow(v)));
    };

    priorityKeys.forEach(renderGroup);

    if(vpShowAll) {
        restKeys.forEach(renderGroup);
    } else if(restKeys.length) {
        const more = document.createElement('button');
        more.className = 'vp-showmore';
        more.innerText = `Show ${restKeys.length} more accents ▾`;
        more.onclick = () => { vpShowAll = true; renderVoicePickerBody(); };
        body.appendChild(more);
    }
}

function renderVoiceRow(v) {
    const row = document.createElement('div');
    row.className = 'vp-voice-row';

    const dot = document.createElement('div');
    dot.className = 'voice-status-dot';
    updateStatusDot(dot, vpCurrentSpkr, v.ShortName);

    const isSelected = voiceMapping[vpCurrentSpkr] === v.ShortName;
    const main = document.createElement('div');
    main.className = 'vp-voice-main';
    main.innerHTML = `<span class="vn${isSelected ? ' selected' : ''}">${v.FriendlyName || v.ShortName}</span><span class="va">${v.accent || ''}</span>`;
    main.onclick = () => {
        voiceMapping[vpCurrentSpkr] = v.ShortName;
        clearAudioCache();
        saveState();
        closeVoicePicker();
        renderVoiceMapping();
    };

    const testBtn = document.createElement('button');
    testBtn.className = 'vp-test-btn';
    testBtn.innerText = '🔊 Test';
    testBtn.onclick = async (e) => {
        e.stopPropagation();
        const spkrAtClick = vpCurrentSpkr;
        testBtn.innerText = '⏳';
        const worked = await previewVoice(v.ShortName, spkrAtClick);
        testBtn.innerText = '🔊 Test';
        voiceStatusMemory[v.ShortName] = worked ? 'working' : 'broken';
        localStorage.setItem('feist_voiceStatus', JSON.stringify(voiceStatusMemory));
        updateStatusDot(dot, spkrAtClick, v.ShortName);
    };

    row.appendChild(dot);
    row.appendChild(main);
    row.appendChild(testBtn);
    return row;
}

function detectChapterBreak(line) {
    return /^(={3,}|-{3,}|#{1,3}\s|chapter\s+\d+)/i.test(line);
}

function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
}

let cardMap = {};
fetch('../edge-voices.json').then(r => r.json()).then(list => {
    list.forEach(v => { cardMap[v.card.toUpperCase()] = v.shortName; });
}).catch(e => console.warn('edge-voices.json not loaded', e));

function resolveCard(token) {
    if(!token) return null;
    const t = token.trim();
    return cardMap[t.toUpperCase()] || t;
}

const SPKR_REGEX = /\[(?:SPKR:\s*)?([A-Za-z0-9_ -]{1,30})(?:\|\s*([^\]]+))?\]/gi;

function detectSpkrs(text) {
    const matches = text.matchAll(SPKR_REGEX);
    for(const match of matches) {
        const name = match[1].trim();
        if(!name || /^\d+$/.test(name)) continue;
        detectedSpkrs.add(name);
        if(match[2] && !voiceMapping[name]) voiceMapping[name] = resolveCard(match[2]);
    }
}

function parseTextWithSpkrs(text) {
    const segs = [];
    const lines = text.split('\n');
    let currentSpkr = 'narrator';
    let chapterNum = 1;
    let chapterTitle = null;

    lines.forEach(line => {
        line = line.trim();
        if(!line) return;

        if(detectChapterBreak(line)) {
            chapterNum++;
            chapterTitle = line.replace(/^#{1,3}\s*/, '').replace(/^[=\-]+$/, '').trim() || null;
            return;
        }

        const spkrMatch = line.match(/^\[(?:SPKR:\s*)?([A-Za-z0-9_ -]{1,30})(?:\|\s*([^\]]+))?\]/i);
        if(spkrMatch) {
            const potentialName = spkrMatch[1].trim();
            if(potentialName && !/^\d+$/.test(potentialName)) {
                currentSpkr = potentialName;
                detectedSpkrs.add(currentSpkr);
                if(spkrMatch[2] && !voiceMapping[currentSpkr]) {
                    voiceMapping[currentSpkr] = resolveCard(spkrMatch[2]);
                }
                line = line.replace(/^\[[^\]]+\]\s*/, '').trim();
            }
        }

        if(line) {
            segs.push({ spkr: currentSpkr, text: line, chapter: String(chapterNum), chapterTitle });
            currentSpkr = 'narrator';
        }
    });
    return segs;
}

function renderParsedSegments(parsedSegments) {
    let html = '';
    let currentChapter = null;
    parsedSegments.forEach(seg => {
        const safeChapter = escapeHtml(seg.chapter);
        const safeTitle = escapeHtml(seg.chapterTitle || (seg.chapter === '1' ? 'Begin' : `Chapter ${seg.chapter}`));
        const safeSpkr = escapeHtml(seg.spkr);
        const safeText = escapeHtml(seg.text);
        if(seg.chapter !== currentChapter) {
            if(currentChapter !== null) html += '</div></article>';
            currentChapter = seg.chapter;
            html += `<article class="chapter" data-chapter="${safeChapter}"><h2>${safeTitle}</h2><div class="chapter-content">`;
        }
        if(seg.spkr !== 'narrator') {
            html += `<div class="spkr-block" data-chapter="${safeChapter}">`;
            html += `<div class="spkr-tag">${safeSpkr}</div>`;
            html += `<p data-spkr="${safeSpkr}" data-text="${safeText}">${safeText}</p>`;
            html += '</div>';
        } else {
            html += `<p class="narrator" data-spkr="narrator" data-text="${safeText}">${safeText}</p>`;
        }
    });
    if(currentChapter !== null) html += '</div></article>';
    return html;
}

// ==================== PLAYBACK ====================
async function play() {
    if(currentSegmentIndex >= segments.length) { currentSegmentIndex = 0; }
    isPlaying = true;
    document.getElementById('playBtn').innerText = '⏳';
    const seg = segments[currentSegmentIndex];
    highlight(seg);
    try {
        if(settings.useBrowserTTS) await playWithBrowserTTS(seg);
        else await playWithEdgeTTS(seg);
    } catch(e) {
        console.error('Playback error:', e);
        if(!settings.useBrowserTTS) {
            settings.useBrowserTTS = true;
            loadBrowserVoices();
            renderVoiceMapping();
            console.warn('Edge-TTS kept failing after a retry -- switched to browser voices for this session. Re-open the VOICES panel to switch back.');
            try { await playWithBrowserTTS(seg); } catch(e2) { handlePlayError(e2); }
        } else { handlePlayError(e); }
    }
}

function handlePlayError(e) {
    isPlaying = false;
    const playBtn = document.getElementById('playBtn');
    if (playBtn) playBtn.innerText = '⚠ ERR';
    console.error('Playback failed: ' + (e?.message || e?.error || 'unknown'));
}

// Keeps up to PRELOAD_LOOKAHEAD segments synthesized ahead of playback so
// the next speaker's audio is usually already sitting in cache by the time
// it's needed, instead of the player stalling on a live TTS round-trip
// every time the speaker changes.
async function preloadSegment(idx) {
    if(idx < 0 || idx >= segments.length || settings.useBrowserTTS || !window.EdgeTTS) return;
    if(audioCache[idx] || audioCachePending[idx]) return;

    const seg = segments[idx];
    if(!seg || !seg.text || !seg.text.trim()) return;

    const gen = audioCacheGen;
    audioCachePending[idx] = true;
    try {
        const voice = voiceMapping[seg.spkr] || voiceMapping.narrator || voices[0]?.ShortName;
        const blob = await synthesizeSegmentAudio(seg.text, voice, edgeTTSOpts());
        if(blob && gen === audioCacheGen) audioCache[idx] = URL.createObjectURL(blob);
    } finally {
        delete audioCachePending[idx];
    }
}

function preloadAhead(fromIdx) {
    for (let i = 1; i <= PRELOAD_LOOKAHEAD; i++) preloadSegment(fromIdx + i);
}

async function playWithEdgeTTS(seg) {
    if(!seg || !seg.text || !seg.text.trim()) {
        throw new Error('Segment text is empty');
    }

    let url = audioCache[currentSegmentIndex];
    if(url) {
        delete audioCache[currentSegmentIndex];
    } else {
        const voice = voiceMapping[seg.spkr] || voiceMapping.narrator || voices[0]?.ShortName;
        const blob = await synthesizeSegmentAudio(seg.text, voice, edgeTTSOpts());
        if(!blob) throw new Error('NoAudioReceived');
        url = URL.createObjectURL(blob);
    }

    if(!url) throw new Error('Audio URL is empty');

    preloadAhead(currentSegmentIndex);

    audioPlayer.src = url;
    audioPlayer.volume = settings.volume;
    audioPlayer.playbackRate = 1.0;
    audioPlayer.onended = () => {
        try { URL.revokeObjectURL(url); } catch(e) {}
        if(!isPlaying) return;
        currentSegmentIndex++;
        saveState(); updateProgress();
        if(currentSegmentIndex < segments.length) play();
        else {
            isPlaying = false;
            const playBtn = document.getElementById('playBtn');
            if (playBtn) playBtn.innerText = '▶ PLAY';
        }
    };

    audioPlayer.onerror = () => {
        const mediaErr = audioPlayer.error;
        const codeNames = {1:'ABORTED',2:'NETWORK',3:'DECODE',4:'SRC_NOT_SUPPORTED'};
        const detail = mediaErr
            ? `${codeNames[mediaErr.code] || mediaErr.code}: ${mediaErr.message || 'no message'}`
            : 'no MediaError available';

        console.error('Edge-TTS audio error — ' + detail);
        isPlaying = false;
        const playBtn = document.getElementById('playBtn');
        if (playBtn) playBtn.innerText = '⚠ ERR';
    };

    window.dispatchEvent(new CustomEvent('FeistTech_Audio_Start', { detail: { chapter: seg.chapter } }));
    await audioPlayer.play();
    const playBtn = document.getElementById('playBtn');
    if (playBtn) playBtn.innerText = '⏸ PAUSE';
    updateMediaSession(seg);
}

function formatEdgePct(val) {
    const num = Math.round((val - 1.0) * 100);
    return (num >= 0 ? '+' : '') + num + '%';
}

// Briefly swaps a button's label to show a result/warning without an
// alert() or on-screen toast -- the button already owns its own text
// slot (⏳ / ✅ / ❌ during export), so reusing it keeps feedback out of
// the way for anyone who isn't looking for it.
function flashBtnText(btn, text, dur = 2500) {
    if(!btn) return;
    const original = btn.innerText;
    btn.innerText = text;
    setTimeout(() => { btn.innerText = original; }, dur);
}

async function synthesizeAndDownloadChapter(chapterNum, btn) {
    const chapterSegments = segments.filter(seg => seg.chapter === chapterNum);
    if(chapterSegments.length === 0) return;

    const audioBlobs = [];
    for (let i = 0; i < chapterSegments.length; i++) {
        const seg = chapterSegments[i];
        const voice = String(voiceMapping[seg.spkr] || voiceMapping.narrator || voices[0]?.ShortName || 'en-US-AriaNeural');

        if(btn) btn.innerText = `⏳ Ch ${chapterNum}: ${i + 1} / ${chapterSegments.length}`;

        const blob = await synthesizeSegmentAudio(seg.text, voice, edgeTTSOpts());
        if(blob) audioBlobs.push(blob);
        else console.warn(`Ch ${chapterNum} segment ${i + 1} produced no audio after retry -- skipped.`);

        await new Promise(resolve => setTimeout(resolve, 200));
    }

    if(audioBlobs.length === 0) throw new Error('NoAudioReceived');

    const finalBlob = new Blob(audioBlobs, { type: 'audio/mp3' });
    const url = URL.createObjectURL(finalBlob);
    const a = document.createElement('a');
    a.href = url;

    let safeTitle = chapterSegments[0].chapterTitle || `Chapter_${chapterNum}`;
    safeTitle = safeTitle.replace(/[^a-z0-9]/gi, '_');

    a.download = `FeistTech_${safeTitle}.mp3`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function saveCurrentChapterAudio() {
    const btn = document.getElementById('saveChapterBtn');
    if (segments.length === 0) {
        flashBtnText(btn, "⚠ Load a story first");
        return;
    }
    if (settings.useBrowserTTS) {
        flashBtnText(btn, "⚠ Needs Edge-TTS — switch in VOICES panel");
        return;
    }

    const targetChapter = segments[currentSegmentIndex].chapter;
    const originalText = btn ? btn.innerText : '';
    if (btn) {
        btn.innerText = `⏳ Starting Ch ${targetChapter}...`;
        btn.disabled = true;
    }

    try {
        await synthesizeAndDownloadChapter(targetChapter, btn);
        if (btn) btn.innerText = "✅ CHAPTER SAVED";
    } catch (e) {
        console.error("Chapter audio generation failed:", e);
        if (btn) btn.innerText = "❌ ERROR";
    } finally {
        setTimeout(() => {
            if (btn) {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        }, 3000);
    }
}

async function saveAllChaptersAudio() {
    const btn = document.getElementById('saveAllBtn');
    if (segments.length === 0) {
        flashBtnText(btn, "⚠ Load a story first");
        return;
    }
    if (settings.useBrowserTTS) {
        flashBtnText(btn, "⚠ Needs Edge-TTS — switch in VOICES panel");
        return;
    }

    const chapters = [...new Set(segments.map(s => s.chapter))];
    const originalText = btn ? btn.innerText : '';
    if (btn) btn.disabled = true;

    try {
        for (let c = 0; c < chapters.length; c++) {
            if (btn) btn.innerText = `⏳ Chapter ${c + 1} / ${chapters.length}...`;
            await synthesizeAndDownloadChapter(chapters[c], btn);
            await new Promise(resolve => setTimeout(resolve, 400));
        }
        if (btn) btn.innerText = "✅ ALL CHAPTERS SAVED";
    } catch (e) {
        console.error("Full-book audio generation failed:", e);
        if (btn) btn.innerText = "❌ ERROR";
    } finally {
        setTimeout(() => {
            if (btn) {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        }, 3000);
    }
}

async function playWithBrowserTTS(seg) {
    return new Promise((resolve, reject) => {
        if(speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(seg.text);
        const voiceName = voiceMapping[seg.spkr] || voiceMapping.narrator;
        const selectedVoice = speechSynthesis.getVoices().find(v => v.name === voiceName);
        if(selectedVoice) utterance.voice = selectedVoice;
        utterance.rate = parseFloat(settings.speed);
        utterance.volume = parseFloat(settings.volume);
        utterance.onstart = () => {
            nativeTTSActive = true;
            const playBtn = document.getElementById('playBtn');
            if (playBtn) playBtn.innerText = '⏸ PAUSE';
            showTTSStatus(`🎙 ${seg.spkr}`, 0);
        };
        utterance.onend = () => {
            nativeTTSActive = false; hideTTSStatus();
            if(!isPlaying) { resolve(); return; }
            currentSegmentIndex++; saveState(); updateProgress();
            if(currentSegmentIndex < segments.length) play();
            else {
                isPlaying = false;
                const playBtn = document.getElementById('playBtn');
                if (playBtn) playBtn.innerText = '▶ PLAY';
            }
            resolve();
        };
        utterance.onerror = (e) => {
            nativeTTSActive = false; hideTTSStatus();
            if(e.error === 'interrupted' || e.error === 'canceled') { resolve(); return; }
            reject(e);
        };
        setTimeout(() => {
            try { speechSynthesis.speak(utterance); updateMediaSession(seg); }
            catch(e) { nativeTTSActive = false; reject(e); }
        }, 50);
    });
}

// ==================== CONTROLS ====================
function togglePlay() {
    unlockAudioPlayback();
    const playBtn = document.getElementById('playBtn');
    if(settings.useBrowserTTS) {
        if(speechSynthesis.speaking && !speechSynthesis.paused) {
            speechSynthesis.pause(); isPlaying = false;
            if (playBtn) playBtn.innerText = '▶ PLAY';
        } else if(speechSynthesis.paused) {
            speechSynthesis.resume(); isPlaying = true;
            if (playBtn) playBtn.innerText = '⏸ PAUSE';
        } else { play(); }
    } else {
        if(!audioPlayer.paused) {
            audioPlayer.pause(); isPlaying = false;
            if (playBtn) playBtn.innerText = '▶ PLAY';
        } else if(audioPlayer.src && audioPlayer.src !== window.location.href) {
            audioPlayer.play(); isPlaying = true;
            if (playBtn) playBtn.innerText = '⏸ PAUSE';
        } else { play(); }
    }
}

function stopPlayback() {
    isPlaying = false;
    if(settings.useBrowserTTS) {
        speechSynthesis.cancel();
    } else {
        audioPlayer.pause();
        audioPlayer.removeAttribute('src');
        audioPlayer.load();
    }
    const playBtn = document.getElementById('playBtn');
    if (playBtn) playBtn.innerText = '▶ PLAY';
    hideTTSStatus();
    window.dispatchEvent(new CustomEvent('FeistTech_Audio_Stop'));
}

function skipSegment(dir) {
    stopPlayback();
    currentSegmentIndex = Math.max(0, Math.min(segments.length - 1, currentSegmentIndex + dir));
    saveState();
    play();
}

function jumpToChapter(v) {
    if(!v || isNaN(parseInt(v))) return;
    stopPlayback();
    currentSegmentIndex = parseInt(v);
    saveState();
    play();
}

function updateStatusDot(dot, spkr, voiceName) {
    if (!dot) return;
    const status = voiceStatusMemory[voiceName] || 'unknown';
    dot.className = 'voice-status-dot ' + status;
    dot.title = status === 'working' ? '✓ Verified working' : status === 'broken' ? '✗ Not working (geo-locked or unavailable)' : 'Unknown — click ▶ to test';
}

// ==================== VOICE PREVIEW ====================
const SAMPLE_SENTENCES = [
    "The quick brown fox jumps over the lazy dog while the owl watches quietly.",
    "Could you really believe what happened at the harbor last night?",
    "She whispered a secret beneath the flickering candlelight.",
    "Thunder rolled across the valley as the storm approached the old mill.",
    "Why does the market close so early on Tuesdays?",
    "A curious squirrel darted between the twisted roots of the ancient oak.",
    "He shouted with joy when the letter finally arrived.",
    "The scientist measured every variable twice before recording the result.",
    "Golden leaves drifted slowly across the quiet, empty street.",
    "Is it true that the bridge collapsed during the flood?",
    "The chef added a pinch of saffron to the simmering broth.",
    "Nobody expected the negotiations to end so abruptly."
];
let lastSampleIndex = -1;
function pickRandomSentence() {
    let i;
    do { i = Math.floor(Math.random() * SAMPLE_SENTENCES.length); }
    while(SAMPLE_SENTENCES.length > 1 && i === lastSampleIndex);
    lastSampleIndex = i;
    return SAMPLE_SENTENCES[i];
}

async function previewVoice(voiceName, spkr) {
    const previewText = pickRandomSentence();
    return new Promise(resolve => {
        if(settings.useBrowserTTS || !window.EdgeTTS) {
            const u = new SpeechSynthesisUtterance(previewText);
            const v = speechSynthesis.getVoices().find(v => v.name === voiceName);
            if(v) u.voice = v;
            u.rate = settings.speed;
            u.volume = settings.volume;
            let started = false;
            u.onstart = () => { started = true; };
            u.onend = () => resolve(started);
            u.onerror = () => resolve(false);
            speechSynthesis.cancel();
            setTimeout(() => speechSynthesis.speak(u), 50);
            setTimeout(() => { if(!started) resolve(false); }, 2000);
        } else {
            (async () => {
                try {
                    const tts = new window.EdgeTTS(String(previewText), voiceName, { rate: formatEdgePct(settings.speed), pitch:'+0Hz', volume: formatEdgePct(settings.volume) });
                    const result = await tts.synthesize();
                    const blob = new Blob([result.audio], { type:'audio/mp3' });
                    const url = URL.createObjectURL(blob);
                    const tmp = new Audio(url);
                    tmp.volume = settings.volume;
                    tmp.onended = () => { URL.revokeObjectURL(url); resolve(true); };
                    tmp.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
                    await tmp.play();
                } catch(e) { resolve(false); }
            })();
        }
    });
}

// ==================== SLIDERS ====================
function onSpeedChange(v) {
    settings.speed = parseFloat(v);
    const speedVal = document.getElementById('speedVal');
    if (speedVal) speedVal.innerText = parseFloat(v).toFixed(1) + 'x';
    clearAudioCache();
    syncDeckSpeedControls();
    saveState();
}
function onVolumeChange(v) {
    settings.volume = parseFloat(v);
    const volumeVal = document.getElementById('volumeVal');
    if (volumeVal) volumeVal.innerText = Math.round(v * 100) + '%';
    audioPlayer.volume = settings.volume;
    clearAudioCache();
    saveState();
}

// ==================== COMMAND DECK ====================
function currentDeckSpkr() {
    return (segments[currentSegmentIndex] && segments[currentSegmentIndex].spkr) || 'narrator';
}

function updateDeckSpeakerChip(seg) {
    const icon = document.getElementById('deckSpeakerIcon');
    const label = document.getElementById('deckSpeakerLabel');
    if(!icon || !label) return;
    const spkr = (seg && seg.spkr) || 'narrator';
    icon.innerText = spkr === 'narrator' ? '📖' : '💬';
    label.innerText = spkr === 'narrator' ? 'Narrator' : spkr;
}

function syncDeckSpeedControls() {
    const pill = document.getElementById('speedPill');
    const deckSlider = document.getElementById('speedSliderDeck');
    if(pill) pill.innerText = parseFloat(settings.speed).toFixed(2).replace(/0$/,'').replace(/\.$/,'.0') + '×';
    if(deckSlider) deckSlider.value = settings.speed;
    document.querySelectorAll('#speedPresets button').forEach(b => {
        b.classList.toggle('active', Math.abs(parseFloat(b.dataset.speed) - settings.speed) < 0.001);
    });
    const studioSlider = document.getElementById('speedSlider');
    if(studioSlider) studioSlider.value = settings.speed;
}

function setQuickSpeed(v) {
    onSpeedChange(v);
}

function toggleSpeedPopover() {
    const pop = document.getElementById('speedPopover');
    if (!pop) return;
    const wasOpen = pop.classList.contains('open');
    closeAllPopovers();
    if(!wasOpen) pop.classList.add('open');
}

function toggleExportPopover() {
    const pop = document.getElementById('exportPopover');
    if (!pop) return;
    const wasOpen = pop.classList.contains('open');
    closeAllPopovers();
    if(!wasOpen) pop.classList.add('open');
}

function closeAllPopovers() {
    document.getElementById('speedPopover')?.classList.remove('open');
    document.getElementById('exportPopover')?.classList.remove('open');
}

document.addEventListener('click', (e) => {
    if(!e.target.closest('.speed-wrap')) document.getElementById('speedPopover')?.classList.remove('open');
    if(!e.target.closest('.export-dropdown-wrap')) document.getElementById('exportPopover')?.classList.remove('open');
});

// ==================== MEDIA SESSION ====================
function updateMediaSession(seg) {
    if('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: seg.spkr === 'narrator' ? 'Narrator' : seg.spkr,
            artist: 'The Reading Room — FeistTech',
            album: settings.useBrowserTTS ? 'Browser TTS' : 'Edge TTS'
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => skipSegment(1));
        navigator.mediaSession.setActionHandler('previoustrack', () => skipSegment(-1));
        navigator.mediaSession.setActionHandler('play', togglePlay);
        navigator.mediaSession.setActionHandler('pause', togglePlay);
    }
}

// ==================== PROGRESS ====================
function updateProgress() {
    const bar = document.getElementById('progressBar');
    if(bar && segments.length > 0)
        bar.style.width = (currentSegmentIndex / segments.length * 100) + '%';
}

// ==================== HIGHLIGHT ====================
function highlight(seg) {
    document.querySelectorAll('.reading').forEach(e => e.classList.remove('reading'));
    if(seg && seg.element) {
        seg.element.classList.add('reading');
        if (window.LeatherSkin && window.LeatherSkin.getSkin() === 'leather') {
            window.LeatherSkin.gotoSegment(seg);
        } else if (!anyDrawerOpen()) {
            seg.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    updateDeckSpeakerChip(seg);
    updateProgress();
}

function anyDrawerOpen() {
    return ['settingsPanel','savePanel','libraryPanel','inputPanel','helpPanel'].some(id => {
        const el = document.getElementById(id);
        return el && el.classList.contains('open');
    });
}

// ==================== KEYBOARD ====================
function setupKeyboard() {
    document.addEventListener('keydown', e => {
        const tag = document.activeElement.tagName;
        if(tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;

        // Null-safe overlay check
        const rsvpOverlay = document.getElementById('rsvpOverlay');
        const rsvpOpen = !!rsvpOverlay && rsvpOverlay.classList.contains('open');

        if(rsvpOpen) {
            if(e.code === 'Escape') { e.preventDefault(); closeRsvp(); }
            if(e.code === 'Space') { e.preventDefault(); rsvpToggle(); }
            if(e.code === 'ArrowRight') { e.preventDefault(); rsvpSkip(15); }
            if(e.code === 'ArrowLeft') { e.preventDefault(); rsvpSkip(-15); }
            return;
        }
        if(e.code === 'Space') { e.preventDefault(); togglePlay(); }
        if(e.code === 'ArrowRight') { e.preventDefault(); skipSegment(1); }
        if(e.code === 'ArrowLeft') { e.preventDefault(); skipSegment(-1); }
        if(e.code === 'KeyS' && e.ctrlKey) { e.preventDefault(); saveToSlot(); }
    });
}

// ==================== TTS STATUS ====================
let ttsStatusTimer = null;
function showTTSStatus(msg, dur=0) {
    const textEl = document.getElementById('ttsStatusText');
    const boxEl = document.getElementById('ttsStatus');
    if (textEl) textEl.innerText = msg;
    if (boxEl) boxEl.classList.add('active');
    if(ttsStatusTimer) clearTimeout(ttsStatusTimer);
    if(dur > 0) ttsStatusTimer = setTimeout(hideTTSStatus, dur);
}

function hideTTSStatus() {
    const boxEl = document.getElementById('ttsStatus');
    if (boxEl) boxEl.classList.remove('active');
}

// ==================== SAVE STATE ====================
function saveState() {
    try {
        localStorage.setItem('feist_settings', JSON.stringify(settings));
        localStorage.setItem('feist_progress', currentSegmentIndex);
        localStorage.setItem('feist_spkrs', JSON.stringify([...detectedSpkrs]));
        localStorage.setItem('feist_voiceMapping', JSON.stringify(voiceMapping));
        const storyEl = document.getElementById('storyContainer');
        if (storyEl) {
            const content = storyEl.innerHTML;
            if(content && content.length < 500000) {
                localStorage.setItem('feist_content', content);
            }
        }
    } catch(e) {
        console.warn('State save partial failure:', e);
    }
}

function loadVoiceStatusMemory() {
    try {
        const stored = localStorage.getItem('feist_voiceStatus');
        if(stored) voiceStatusMemory = JSON.parse(stored);
    } catch(e) {}
}

function checkPersistence() {
    loadVoiceStatusMemory();
    const hasContent = !!localStorage.getItem('feist_content');
    const progress = parseInt(localStorage.getItem('feist_progress') || '0');
    if(hasContent) {
        const banner = document.getElementById('resumeBanner');
        if (banner) banner.classList.add('visible');
        const detail = document.getElementById('resumeDetail');
        if (detail) detail.innerText = `Segment ${progress + 1} — tap to continue`;
        expandInputPanel();
    }
}

function resumeSession() {
    const c = localStorage.getItem('feist_content');
    const s = localStorage.getItem('feist_settings');
    const p = localStorage.getItem('feist_progress');
    const sp = localStorage.getItem('feist_spkrs');
    const vm = localStorage.getItem('feist_voiceMapping');
    if(!c) { alert('No saved session found.'); return; }
    if(s) { try { settings = {...settings, ...JSON.parse(s)}; } catch(e) {} }
    if(sp) { try { detectedSpkrs = new Set(JSON.parse(sp)); } catch(e) {} }
    if(vm) { try { voiceMapping = JSON.parse(vm); } catch(e) {} }

    const speedSlider = document.getElementById('speedSlider');
    const speedVal = document.getElementById('speedVal');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeVal = document.getElementById('volumeVal');

    if (speedSlider) speedSlider.value = settings.speed;
    if (speedVal) speedVal.innerText = parseFloat(settings.speed).toFixed(1) + 'x';
    if (volumeSlider) volumeSlider.value = settings.volume || 1;
    if (volumeVal) volumeVal.innerText = Math.round((settings.volume || 1) * 100) + '%';

    syncDeckSpeedControls();
    initReader(c, true);
    if(p) {
        currentSegmentIndex = Math.max(0, parseInt(p));
        setTimeout(() => {
            if(segments[currentSegmentIndex]) highlight(segments[currentSegmentIndex]);
        }, 400);
    }
}

// ==================== SAVE SLOTS ====================
const MAX_SLOTS = 10;

function saveToSlot() {
    const slots = getSaveSlots();
    const progress = currentSegmentIndex;
    const seg = segments[progress];
    const now = new Date();
    const slot = {
        id: Date.now(),
        timestamp: now.toLocaleString(),
        progress,
        total: segments.length,
        preview: seg ? seg.text.slice(0, 80) + '...' : 'Position ' + progress,
        voiceMapping: {...voiceMapping},
        settings: {...settings},
        spkrs: [...detectedSpkrs]
    };
    slots.unshift(slot);
    const trimmed = slots.slice(0, MAX_SLOTS);
    localStorage.setItem('feist_slots', JSON.stringify(trimmed));
    renderSaveSlots();
    showTTSStatus('💾 Saved slot ' + (trimmed.indexOf(slot)+1), 2000);
}

function getSaveSlots() {
    try { return JSON.parse(localStorage.getItem('feist_slots') || '[]'); }
    catch(e) { return []; }
}

function renderSaveSlots() {
    const container = document.getElementById('saveSlotsContainer');
    const slots = getSaveSlots();
    if(!container) return;
    container.innerHTML = '';
    if(!slots.length) {
        container.innerHTML = '<p style="color:#444;font-size:0.8rem;">No saves yet. Press + above to save your current position.</p>';
        return;
    }
    slots.forEach((slot, i) => {
        const pct = Math.round((slot.progress / (slot.total || 1)) * 100);
        const div = document.createElement('div');
        div.className = 'save-slot';
        div.innerHTML = `
            <div class="save-slot-info">
                <strong>Slot ${i+1} · ${slot.timestamp}</strong>
                <span>Seg ${slot.progress+1}/${slot.total} (${pct}%) — ${slot.preview}</span>
            </div>
            <div class="save-slot-actions">
                <button onclick="loadSlot(${slot.id})">▶ LOAD</button>
                <button onclick="deleteSlot(${slot.id})" style="color:#ff6b6b;">✕</button>
            </div>`;
        container.appendChild(div);
    });
}

function loadSlot(id) {
    const slots = getSaveSlots();
    const slot = slots.find(s => s.id === id);
    if(!slot) return;
    currentSegmentIndex = slot.progress;
    voiceMapping = {...(slot.voiceMapping || {})};
    if(slot.settings) settings = {...settings, ...slot.settings};
    if(slot.spkrs) detectedSpkrs = new Set(slot.spkrs);
    clearAudioCache();
    saveState();
    closeSavePanel();
    if(segments[currentSegmentIndex]) highlight(segments[currentSegmentIndex]);
    showTTSStatus('✅ Slot loaded — Seg ' + (currentSegmentIndex+1), 2000);
}

function deleteSlot(id) {
    const slots = getSaveSlots().filter(s => s.id !== id);
    localStorage.setItem('feist_slots', JSON.stringify(slots));
    renderSaveSlots();
}

function openSavePanel() {
    closeAllPanels();
    renderSaveSlots();
    const panel = document.getElementById('savePanel');
    if (panel) panel.style.right = '0';
}
function closeSavePanel() {
    const panel = document.getElementById('savePanel');
    if (panel) panel.style.right = '-460px';
}

// ==================== LOADING ====================
function loadFromPaste() {
    const pasteEl = document.getElementById('pasteArea');
    if (!pasteEl) return;
    const text = pasteEl.value.trim();
    if(!text) { alert('Paste some content first!'); return; }
    detectSpkrs(text);
    const parsed = parseTextWithSpkrs(text);
    const html = renderParsedSegments(parsed);
    initReader(html);
}

function handleFileSelect(input) {
    if (!input.files || !input.files[0]) return;
    const r = new FileReader();
    r.onload = e => {
        const text = e.target.result;
        detectSpkrs(text);
        const parsed = parseTextWithSpkrs(text);
        const html = renderParsedSegments(parsed);
        initReader(html);
    };
    r.readAsText(input.files[0]);
}

async function parseAndLoadPDF(arrayBuffer) {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let txt = '';
    for(let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const tc = await page.getTextContent();
        txt += tc.items.map(it => it.str).join(' ') + '\n\n';
    }
    hideTTSStatus();
    detectSpkrs(txt);
    const parsed = parseTextWithSpkrs(txt);
    const html = renderParsedSegments(parsed);
    initReader(html);
}

async function handlePDFSelect(input) {
    if (!input.files || !input.files[0]) return;
    showTTSStatus('⏳ Parsing PDF...', 0);
    try {
        const arrayBuffer = await input.files[0].arrayBuffer();
        await parseAndLoadPDF(arrayBuffer);
    } catch(e) {
        console.error('PDF error:', e);
        hideTTSStatus();
        alert('Error parsing PDF: ' + e.message);
    }
}

async function loadPDFFromUrl(url, label) {
    showTTSStatus('⏳ Fetching ' + (label || 'PDF') + '...', 0);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const arrayBuffer = await res.arrayBuffer();
        showTTSStatus('⏳ Parsing PDF...', 0);
        await parseAndLoadPDF(arrayBuffer);
        const label_el = document.getElementById('inputPanelLabel');
        if (label_el && label) label_el.textContent = '📄 ' + label;
    } catch(e) {
        console.error('PDF fetch error:', e);
        hideTTSStatus();
        alert('Could not load "' + (label || url) + '": ' + e.message);
    }
}

// ==================== LIBRARY ====================
const LIBRARY_BASE = '../../../../data/reading-room/';
let libraryArticles = {};
let libraryManifestLoaded = false;

function fmtLibraryDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00Z');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

async function loadLibrary() {
    const list = document.getElementById('libraryList');
    if (!list) return;
    try {
        const manifestRes = await fetch(LIBRARY_BASE + 'manifest.json');
        if (!manifestRes.ok) throw new Error('HTTP ' + manifestRes.status);
        const ids = await manifestRes.json();
        const articles = await Promise.all(ids.map(async (id) => {
            const r = await fetch(LIBRARY_BASE + 'articles/' + id + '.json');
            if (!r.ok) throw new Error('article ' + id + ': HTTP ' + r.status);
            return r.json();
        }));
        articles.forEach(a => { libraryArticles[a.id] = a; });
        libraryManifestLoaded = true;
        renderLibrary(articles);
    } catch(e) {
        console.error('Library load error:', e);
        list.innerHTML = '<div class="library-loading">Could not load the article library: ' + e.message + '</div>';
    }
}

function renderLibrary(articles) {
    const list = document.getElementById('libraryList');
    if (!list) return;
    if (!articles.length) { list.innerHTML = '<div class="library-loading">No articles yet.</div>'; return; }
    const sorted = articles.slice().sort((a, b) => (b.published || '').localeCompare(a.published || ''));
    list.innerHTML = '';
    sorted.forEach(a => {
        const btn = document.createElement('button');
        btn.className = 'library-item';
        btn.dataset.articleId = a.id;
        btn.innerHTML =
            '<div class="library-item-date">' + fmtLibraryDate(a.published) + '</div>' +
            '<div class="library-item-title">' + escapeLibraryHtml(a.title) + '</div>' +
            '<div class="library-item-excerpt">' + escapeLibraryHtml(a.excerpt || '') + '</div>';
        btn.onclick = () => loadArticleIntoReader(a.id, true);
        list.appendChild(btn);
    });
}

function escapeLibraryHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function loadArticleIntoReader(id, pushState) {
    closeAllPanels();
    let article = libraryArticles[id];
    if (!article) {
        showTTSStatus('⏳ Fetching article...', 0);
        try {
            const r = await fetch(LIBRARY_BASE + 'articles/' + id + '.json');
            if (!r.ok) throw new Error('HTTP ' + r.status);
            article = await r.json();
            libraryArticles[id] = article;
        } catch(e) {
            hideTTSStatus();
            alert('Could not load that article: ' + e.message);
            return;
        }
        hideTTSStatus();
    }
    const text = article.content || '';
    detectSpkrs(text);
    const parsed = parseTextWithSpkrs(text);
    const html = renderParsedSegments(parsed);
    initReader(html);
    const label_el = document.getElementById('inputPanelLabel');
    if (label_el) label_el.textContent = '📄 ' + article.title;
    document.querySelectorAll('.library-item').forEach(el => {
        el.classList.toggle('active', el.dataset.articleId === id);
    });
    if (pushState && history.pushState) {
        const url = new URL(window.location.href);
        url.searchParams.set('article', id);
        history.pushState({ articleId: id }, '', url);
    }
}

function toggleLibrary() { document.getElementById('libraryPanel')?.classList.toggle('open'); }

function initReader(html, isResume=false) {
    if(!html) return;
    clearAudioCache();
    const storyEl = document.getElementById('storyContainer');
    if (storyEl) storyEl.innerHTML = html;
    processContent();
    populateChapters();
    if(!isResume) {
        if(voices.length > 0) autoAssignVoices();
        currentSegmentIndex = 0;
    }
    renderVoiceMapping();
    saveState();
    collapseInputPanel();
    if (window.LeatherSkin) window.LeatherSkin.refresh();
}

function processContent() {
    segments = [];
    document.querySelectorAll('#storyContainer p').forEach((p, i) => {
        const txt = p.getAttribute('data-text') || p.innerText.trim();
        if(!txt) return;
        const spkr = p.dataset.spkr || 'narrator';
        const ch = p.closest('article')?.dataset.chapter || '1';
        segments.push({ index: i, element: p, text: txt, chapter: ch, spkr });
        p.onclick = () => { currentSegmentIndex = i; stopPlayback(); play(); };
    });
}

function populateChapters() {
    const sel = document.getElementById('chapterSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Chapter —</option>';
    const seen = new Set();
    segments.forEach((seg, idx) => {
        if(!seen.has(seg.chapter)) {
            seen.add(seg.chapter);
            const firstIdx = segments.findIndex(s => s.chapter === seg.chapter);
            const art = document.querySelector(`article[data-chapter="${seg.chapter}"] h2`);
            const title = art ? art.innerText : `Chapter ${seg.chapter}`;
            sel.innerHTML += `<option value="${firstIdx}">${title}</option>`;
        }
    });
}

function closeAllPanels() {
    document.getElementById('settingsPanel')?.classList.remove('open');
    const savePanel = document.getElementById('savePanel');
    if (savePanel) savePanel.style.right = '-460px';
}

function togglePanel() {
    const panel = document.getElementById('settingsPanel');
    if (!panel) return;
    const wasOpen = panel.classList.contains('open');
    closeAllPanels();
    if(!wasOpen) panel.classList.add('open');
}

const EMPTY_STATE_HTML = `
<div class="intake-launchpad" id="intakeLaunchpad">
    <h2>Welcome to the Reading Room</h2>
    <p class="launchpad-sub">Multi-voice neural text-to-speech engine</p>
    <div class="launchpad-grid">
        <button class="launch-card" onclick="toggleLibrary()">
            <span class="icon">📚</span>
            <strong>Article Library</strong>
            <p>Browse curated FeistTech essays</p>
        </button>
        <button class="launch-card" onclick="toggleInputPanel()">
            <span class="icon">📄</span>
            <strong>Paste / Script</strong>
            <p>Type or paste text tagged with [Name] or [SPKR: Name]</p>
        </button>
        <button class="launch-card" onclick="toggleInputPanel()">
            <span class="icon">📕</span>
            <strong>Upload Doc</strong>
            <p>PDF or TXT, parsed right in your browser</p>
        </button>
    </div>
    <div id="resumeBanner">
        <div class="resume-info">
            <strong>SESSION RESTORED</strong>
            <span id="resumeDetail">Continue where you left off?</span>
        </div>
        <button class="btn" style="background:#00ff41;color:#000;border:none;flex-shrink:0;" onclick="resumeSession()">RESUME ▶</button>
    </div>
</div>`;

function startNewStory() {
    if(!confirm('Start a new story? Your current position is saved and can be resumed later from the Load panel.')) return;
    saveState();
    stopPlayback();
    clearAudioCache();
    segments = [];
    currentSegmentIndex = 0;
    detectedSpkrs = new Set(['narrator']);
    const storyEl = document.getElementById('storyContainer');
    if (storyEl) storyEl.innerHTML = EMPTY_STATE_HTML;
    populateChapters();
    renderVoiceMapping();
    const banner = document.getElementById('resumeBanner');
    if (banner) banner.classList.add('visible');
    expandInputPanel();
}

function toggleInputPanel() { document.getElementById('inputPanel')?.classList.toggle('open'); }
function expandInputPanel() {}
function collapseInputPanel() {
    document.getElementById('inputPanel')?.classList.remove('open');
    const label = document.getElementById('inputPanelLabel');
    if(label) label.innerText = `✎ EDIT TEXT — ${segments.length} segments, ${new Set(segments.map(s=>s.chapter)).size} chapter(s)`;
}

function toggleHelp() { document.getElementById('helpPanel')?.classList.toggle('open'); }
function expandHelp() { document.getElementById('helpPanel')?.classList.add('open'); }

function saveToDisk() {
    const ts = new Date().toISOString().slice(0,16).replace(/[:T]/g,'-');
    const fn = `FeistTech_${ts}.html`;
    const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = fn; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showTTSStatus('💾 ' + fn, 2500);
}

// ==================== RSVP ====================
let rsvpQueue = [];
let rsvpPos = 0;
let rsvpWpm = 300;
let rsvpPlaying = false;
let rsvpTimer = null;

function rsvpBuildQueueFrom(startSegIdx) {
    rsvpQueue = [];
    for(let i = Math.max(0, startSegIdx); i < segments.length; i++) {
        const words = segments[i].text.split(/\s+/).filter(Boolean);
        words.forEach(word => rsvpQueue.push({ word, segIdx: i }));
    }
}

function openRsvp() {
    if(segments.length === 0) { showTTSStatus('⚠️ Load a story first', 2000); return; }
    rsvpBuildQueueFrom(currentSegmentIndex);
    rsvpPos = 0;
    const overlay = document.getElementById('rsvpOverlay');
    if (overlay) overlay.classList.add('open');
    rsvpShowWord();
    rsvpPlaying = false;
    const playBtn = document.getElementById('rsvpPlayBtn');
    if (playBtn) playBtn.innerText = '▶ START';
}

function closeRsvp() {
    rsvpPause();
    const overlay = document.getElementById('rsvpOverlay');
    if (overlay) overlay.classList.remove('open');
}

function rsvpToggle() {
    if(rsvpPlaying) rsvpPause(); else rsvpPlay();
}

function rsvpPlay() {
    if(rsvpQueue.length === 0) return;
    if(rsvpPos >= rsvpQueue.length) rsvpPos = 0;
    rsvpPlaying = true;
    const playBtn = document.getElementById('rsvpPlayBtn');
    if (playBtn) playBtn.innerText = '⏸ PAUSE';
    rsvpTick();
}

function rsvpPause() {
    rsvpPlaying = false;
    if(rsvpTimer) { clearTimeout(rsvpTimer); rsvpTimer = null; }
    const btn = document.getElementById('rsvpPlayBtn');
    if(btn) btn.innerText = '▶ START';
}

function rsvpTick() {
    if(!rsvpPlaying) return;
    if(rsvpPos >= rsvpQueue.length) { rsvpPause(); return; }
    rsvpShowWord();
    rsvpPos++;
    const msPerWord = 60000 / rsvpWpm;
    rsvpTimer = setTimeout(rsvpTick, msPerWord);
}

function rsvpShowWord() {
    const entry = rsvpQueue[rsvpPos];
    if(!entry) return;
    const seg = segments[entry.segIdx];
    const stage = document.getElementById('rsvpStage');
    const tag = document.getElementById('rsvpSpeakerTag');
    const bar = document.getElementById('rsvpProgressBar');

    if (stage) stage.innerText = entry.word;
    if (tag) tag.innerText = (seg?.spkr || 'narrator').toUpperCase();
    if (bar) bar.style.width = (rsvpPos / rsvpQueue.length * 100) + '%';
}

function rsvpSkip(n) {
    rsvpPos = Math.max(0, Math.min(rsvpQueue.length - 1, rsvpPos + n));
    rsvpShowWord();
}

function rsvpUpdateWpm(v) {
    rsvpWpm = parseInt(v);
    const disp = document.getElementById('rsvpWpmDisplay');
    if (disp) disp.innerText = rsvpWpm;
}
