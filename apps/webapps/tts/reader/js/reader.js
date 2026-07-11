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

// ==================== BACKGROUND ====================
(function() {
    const canvas = document.getElementById('bg-canvas');
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
    if(!localStorage.getItem('feist_visited')) {
        expandHelp();
        localStorage.setItem('feist_visited', '1');
    }
    document.addEventListener('click', (e) => {
        const wrap = document.querySelector('.hamburger-wrap');
        if(wrap && !wrap.contains(e.target)) {
            document.getElementById('hamburgerMenu')?.classList.remove('open');
        }
    });
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

// ==================== AUDIO UNLOCK (iOS WebKit) ====================
// iOS Safari/WebKit only allows a programmatic play() when it's still tied
// to the user gesture that triggered it. The Edge-TTS path awaits a network
// round-trip before calling audioPlayer.play(), which breaks that
// association — play() then gets silently rejected, the app's own error
// handling in play() falls back to useBrowserTTS, and the "cool" Edge
// neural voices are swapped out for the OS's built-in voice list. This
// applies to every iOS browser (Safari, Edge iOS, Chrome iOS) since Apple
// requires them all to run on WebKit, not just Edge. A muted play()+pause()
// synchronously inside the tap unlocks the element for the rest of the page
// session, so the later async play() call is allowed through.
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
        statusEl.textContent = `✅ ${voices.length} voices already loaded`;
        statusEl.style.color = '#00ff41';
        return;
    }
    statusEl.textContent = '⏳ Triggering browser voice loader...';
    statusEl.style.color = 'orange';
    voiceLoadAttempted = true;
    const utterance = new SpeechSynthesisUtterance('');
    utterance.volume = 0; utterance.rate = 10;

    utterance.onstart = () => {
        if (window.speechSynthesis) speechSynthesis.cancel();
        setTimeout(() => {
            loadBrowserVoices();
            const cnt = voices.length;
            statusEl.textContent = cnt > 0 ? `✅ ${cnt} voices loaded` : '⚠ No voices found — try Read Aloud in Edge first';
            statusEl.style.color = cnt > 0 ? '#00ff41' : 'orange';
            renderVoiceMapping();
        }, 200);
    };

    utterance.onerror = () => {
        loadBrowserVoices();
        const cnt = voices.length;
        statusEl.textContent = cnt > 0 ? `✅ ${cnt} voices loaded` : '⚠ No browser voices found';
        statusEl.style.color = cnt > 0 ? '#00ff41' : 'orange';
    };
    if (window.speechSynthesis) speechSynthesis.speak(utterance);
}

// ==================== VOICE CATALOG (accent metadata) ====================
// window.VOICE_CATALOG / window.VOICE_PRIORITY_ORDER come from
// js/voice-catalog.js, generated from the full Azure voice list so every
// voice gets a human accent label instead of a bare locale code.
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
    try {
        const manager = await window.VoicesManager.create();
        // Library API has changed shape across versions — try every form
        // seen (property, getVoices(), the documented find()) instead of
        // hard-coding one.
        let edgeVoices;
        if(Array.isArray(manager.voices)) edgeVoices = manager.voices;
        else if(typeof manager.getVoices === 'function') edgeVoices = manager.getVoices();
        else if(typeof manager.find === 'function') edgeVoices = manager.find({});
        else edgeVoices = [];

        if(!edgeVoices || edgeVoices.length === 0) throw new Error('No Edge voices array available');
        voices = sortVoicesByPriority(edgeVoices.map(annotateVoice));
        settings.useBrowserTTS = false;
    } catch(e) {
        // Listing the live catalog failed (offline, blocked, API drift) —
        // fall back to the bundled catalog as the pickable list. Edge-TTS
        // synthesis is a separate call from listing, so these ShortNames
        // still work once played; the existing working/broken status-dot
        // system will surface any that don't.
        console.warn('Edge-TTS voice listing unavailable, using bundled catalog', e);
        const fallback = (window.VOICE_CATALOG || []).map(v => ({
            ShortName: v.shortName, FriendlyName: v.name, Gender: v.gender, Locale: v.locale
        }));
        voices = sortVoicesByPriority(fallback.map(annotateVoice));
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
}

function renderVoiceMapping() {
    const container = document.getElementById('voiceMappingContainer');
    const engineDiv = document.getElementById('engineStatus');
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

    // 5 or fewer speakers: the inline row above the transport bar is the
    // primary way to assign voices, so there's no need for a hamburger
    // entry into the sliding panel too. More than 5: the panel is the only
    // way to reach everyone, so surface it in the hamburger.
    const hbVoicesBtn = document.getElementById('hamburgerVoicesBtn');
    if(hbVoicesBtn) hbVoicesBtn.style.display = spkrs.length > 5 ? '' : 'none';
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
// Shared popover for both the inline char row and the sliding panel's
// char-cards, grouped by accent with the user's preferred regions first
// and everything else behind "show more".
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
    return /^(={3,}|-{3,}|#{1,3}\s)/.test(line);
}

function detectSpkrs(text) {
    const matches = text.matchAll(/\[SPKR:\s*([^\]]+)\]/gi);
    for(const match of matches) detectedSpkrs.add(match[1].trim());
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
        const spkrMatch = line.match(/\[SPKR:\s*([^\]]+)\]/i);
        if(spkrMatch) {
            currentSpkr = spkrMatch[1].trim();
            detectedSpkrs.add(currentSpkr);
            line = line.replace(/\[SPKR:\s*[^\]]+\]/i, '').trim();
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
        if(seg.chapter !== currentChapter) {
            if(currentChapter !== null) html += '</div></article>';
            currentChapter = seg.chapter;
            const title = seg.chapterTitle || (seg.chapter === '1' ? 'Begin' : `Chapter ${seg.chapter}`);
            html += `<article class="chapter" data-chapter="${seg.chapter}"><h2>${title}</h2><div class="chapter-content">`;
        }
        const safeText = seg.text.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
        if(seg.spkr !== 'narrator') {
            html += `<div class="spkr-block" data-chapter="${seg.chapter}">`;
            html += `<div class="spkr-tag">${seg.spkr}</div>`;
            html += `<p data-spkr="${seg.spkr}" data-text="${safeText}">${seg.text}</p>`;
            html += `</div>`;
        } else {
            html += `<p class="narrator" data-spkr="narrator" data-text="${safeText}">${seg.text}</p>`;
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
            try { await playWithBrowserTTS(seg); } catch(e2) { handlePlayError(e2); }
        } else { handlePlayError(e); }
    }
}

function handlePlayError(e) {
    isPlaying = false;
    document.getElementById('playBtn').innerText = '⚠ ERR';
    showTTSStatus('Playback failed: ' + (e?.message || e?.error || 'unknown'), 4000);
}

async function playWithEdgeTTS(seg) {
    const voice = voiceMapping[seg.spkr] || voiceMapping.narrator || voices[0]?.ShortName;
    // Current library signature is positional: (text, voice, options) —
    // passing an options object as the first arg reads as "text", hence
    // the "text must be a string" error.
    const tts = new window.EdgeTTS(String(seg.text || ' '), voice, {
        rate: formatEdgePct(settings.speed),
        pitch: '+0Hz',
        volume: formatEdgePct(settings.volume)
    });
    const result = await tts.synthesize();
    const blob = new Blob([result.audio], { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);
    audioPlayer.src = url;
    audioPlayer.volume = settings.volume;
    audioPlayer.playbackRate = 1.0;
    audioPlayer.onended = () => {
        URL.revokeObjectURL(url);
        if(!isPlaying) return;
        currentSegmentIndex++;
        saveState(); updateProgress();
        if(currentSegmentIndex < segments.length) play();
        else { isPlaying = false; document.getElementById('playBtn').innerText = '▶ PLAY'; }
    };
    audioPlayer.onerror = () => {
        const mediaErr = audioPlayer.error;
        const codeNames = {1:'ABORTED',2:'NETWORK',3:'DECODE',4:'SRC_NOT_SUPPORTED'};
        const detail = mediaErr ? `${codeNames[mediaErr.code] || mediaErr.code}: ${mediaErr.message || 'no message'}` : 'no MediaError available';
        throw new Error('Edge-TTS audio error — ' + detail);
    };
    window.dispatchEvent(new CustomEvent('FeistTech_Audio_Start', { detail: { chapter: seg.chapter } }));
    await audioPlayer.play();
    document.getElementById('playBtn').innerText = '⏸ PAUSE';
    updateMediaSession(seg);
}

function formatEdgePct(val) {
    const num = Math.round((val - 1.0) * 100);
    return (num >= 0 ? '+' : '') + num + '%';
}

// Synthesizes and downloads one chapter's audio as a single stitched MP3.
// Shared by the single-chapter button and the download-all loop below, so
// neither path needs the user to have clicked into that chapter first.
async function synthesizeAndDownloadChapter(chapterNum, btn) {
    const chapterSegments = segments.filter(seg => seg.chapter === chapterNum);
    if(chapterSegments.length === 0) return;

    const audioBlobs = [];
    for (let i = 0; i < chapterSegments.length; i++) {
        const seg = chapterSegments[i];
        const voice = String(voiceMapping[seg.spkr] || voiceMapping.narrator || voices[0]?.ShortName || 'en-US-AriaNeural');
        const safeText = String(seg.text || ' ');

        if(btn) btn.innerText = `⏳ Ch ${chapterNum}: ${i + 1} / ${chapterSegments.length}`;

        const tts = new window.EdgeTTS(safeText, voice, {
            rate: formatEdgePct(settings.speed),
            pitch: '+0Hz',
            volume: formatEdgePct(settings.volume)
        });

        const result = await tts.synthesize();
        audioBlobs.push(new Blob([result.audio], { type: 'audio/mp3' }));

        await new Promise(resolve => setTimeout(resolve, 200));
    }

    const finalBlob = new Blob(audioBlobs, { type: 'audio/mp3' });
    const url = URL.createObjectURL(finalBlob);
    const a = document.createElement('a');
    a.href = url;

    let safeTitle = chapterSegments[0].chapterTitle || `Chapter_${chapterNum}`;
    safeTitle = safeTitle.replace(/[^a-z0-9]/gi, '_');

    a.download = `FeistTech_${safeTitle}.mp3`;
    a.click();
    URL.revokeObjectURL(url);
}

async function saveCurrentChapterAudio() {
    if (segments.length === 0) {
        alert("Load a story first!");
        return;
    }
    if (settings.useBrowserTTS) {
        alert('Chapter audio export needs Edge-TTS — this only works with real Edge neural voices, not your browser\'s built-in voices. Switch back to Edge-TTS in the VOICES panel and try again.');
        return;
    }

    const targetChapter = segments[currentSegmentIndex].chapter;
    const btn = document.getElementById('saveChapterBtn');
    const originalText = btn.innerText;
    btn.innerText = `⏳ Starting Ch ${targetChapter}...`;
    btn.disabled = true;

    try {
        await synthesizeAndDownloadChapter(targetChapter, btn);
        btn.innerText = "✅ CHAPTER SAVED";
    } catch (e) {
        console.error("Chapter audio generation failed:", e);
        alert("Failed to generate chapter audio.");
        btn.innerText = "❌ ERROR";
    } finally {
        setTimeout(() => {
            btn.innerText = originalText;
            btn.disabled = false;
        }, 3000);
    }
}

// Exports every chapter as its own MP3, one at a time, without requiring
// the user to click into each chapter's first paragraph first.
async function saveAllChaptersAudio() {
    if (segments.length === 0) {
        alert("Load a story first!");
        return;
    }
    if (settings.useBrowserTTS) {
        alert('Full-book export needs Edge-TTS — switch back to Edge-TTS in the VOICES panel and try again.');
        return;
    }

    const chapters = [...new Set(segments.map(s => s.chapter))];
    const btn = document.getElementById('saveAllBtn');
    const originalText = btn.innerText;
    btn.disabled = true;

    try {
        for (let c = 0; c < chapters.length; c++) {
            btn.innerText = `⏳ Chapter ${c + 1} / ${chapters.length}...`;
            await synthesizeAndDownloadChapter(chapters[c], btn);
            await new Promise(resolve => setTimeout(resolve, 400));
        }
        btn.innerText = "✅ ALL CHAPTERS SAVED";
    } catch (e) {
        console.error("Full-book audio generation failed:", e);
        alert("Failed to generate audio for all chapters.");
        btn.innerText = "❌ ERROR";
    } finally {
        setTimeout(() => {
            btn.innerText = originalText;
            btn.disabled = false;
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
            document.getElementById('playBtn').innerText = '⏸ PAUSE';
            showTTSStatus(`🎙 ${seg.spkr}`, 0);
        };
        utterance.onend = () => {
            nativeTTSActive = false; hideTTSStatus();
            if(!isPlaying) { resolve(); return; }
            currentSegmentIndex++; saveState(); updateProgress();
            if(currentSegmentIndex < segments.length) play();
            else { isPlaying = false; document.getElementById('playBtn').innerText = '▶ PLAY'; }
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
    if(settings.useBrowserTTS) {
        if(speechSynthesis.speaking && !speechSynthesis.paused) {
            speechSynthesis.pause(); isPlaying = false;
            document.getElementById('playBtn').innerText = '▶ PLAY';
        } else if(speechSynthesis.paused) {
            speechSynthesis.resume(); isPlaying = true;
            document.getElementById('playBtn').innerText = '⏸ PAUSE';
        } else { play(); }
    } else {
        if(!audioPlayer.paused) {
            audioPlayer.pause(); isPlaying = false;
            document.getElementById('playBtn').innerText = '▶ PLAY';
        } else if(audioPlayer.src && audioPlayer.src !== window.location.href) {
            audioPlayer.play(); isPlaying = true;
            document.getElementById('playBtn').innerText = '⏸ PAUSE';
        } else { play(); }
    }
}

function stopPlayback() {
    isPlaying = false;
    if(settings.useBrowserTTS) speechSynthesis.cancel();
    else { audioPlayer.pause(); audioPlayer.src = ''; }
    document.getElementById('playBtn').innerText = '▶ PLAY';
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
    const status = voiceStatusMemory[voiceName] || 'unknown';
    dot.className = 'voice-status-dot ' + status;
    dot.title = status === 'working' ? '✓ Verified working' : status === 'broken' ? '✗ Not working (geo-locked or unavailable)' : 'Unknown — click ▶ to test';
}

// ==================== VOICE PREVIEW ====================
// A varied pool instead of one fixed line, so auditioning a voice across
// several presses actually exercises different syllables/intonation
// (questions, exclamations, longer and shorter clauses) rather than
// hearing the exact same sentence every time.
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
            // If nothing happens in 2s, assume broken
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
    document.getElementById('speedVal').innerText = parseFloat(v).toFixed(1) + 'x';
    saveState();
}
function onVolumeChange(v) {
    settings.volume = parseFloat(v);
    document.getElementById('volumeVal').innerText = Math.round(v * 100) + '%';
    audioPlayer.volume = settings.volume;
    saveState();
}

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
    if(segments.length > 0)
        document.getElementById('progressBar').style.width = (currentSegmentIndex / segments.length * 100) + '%';
}

// ==================== HIGHLIGHT ====================
function highlight(seg) {
    document.querySelectorAll('.reading').forEach(e => e.classList.remove('reading'));
    if(seg && seg.element) {
        seg.element.classList.add('reading');
        seg.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    updateProgress();
}

// ==================== KEYBOARD ====================
function setupKeyboard() {
    document.addEventListener('keydown', e => {
        const tag = document.activeElement.tagName;
        if(tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
        if(e.code === 'Space') { e.preventDefault(); togglePlay(); }
        if(e.code === 'ArrowRight') { e.preventDefault(); skipSegment(1); }
        if(e.code === 'ArrowLeft') { e.preventDefault(); skipSegment(-1); }
        if(e.code === 'KeyS' && e.ctrlKey) { e.preventDefault(); saveToSlot(); }
    });
}

// ==================== TTS STATUS ====================
let ttsStatusTimer = null;
function showTTSStatus(msg, dur=0) {
    document.getElementById('ttsStatusText').innerText = msg;
    document.getElementById('ttsStatus').classList.add('active');
    if(ttsStatusTimer) clearTimeout(ttsStatusTimer);
    if(dur > 0) ttsStatusTimer = setTimeout(hideTTSStatus, dur);
}
function hideTTSStatus() { document.getElementById('ttsStatus').classList.remove('active'); }

// ==================== SAVE STATE ====================
// State stored separately so content (potentially large) doesn't break small data
function saveState() {
    try {
        localStorage.setItem('feist_settings', JSON.stringify(settings));
        localStorage.setItem('feist_progress', currentSegmentIndex);
        localStorage.setItem('feist_spkrs', JSON.stringify([...detectedSpkrs]));
        localStorage.setItem('feist_voiceMapping', JSON.stringify(voiceMapping));
        // Store content separately — catch quota errors gracefully
        const content = document.getElementById('storyContainer').innerHTML;
        if(content && content.length < 500000) {
            localStorage.setItem('feist_content', content);
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
        banner.classList.add('visible');
        const detail = document.getElementById('resumeDetail');
        detail.innerText = `Segment ${progress + 1} — tap to continue`;
        // Keep the input panel open so the resume banner is visible without
        // an extra tap; it collapses itself once the session is resumed.
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
    // Restore sliders
    document.getElementById('speedSlider').value = settings.speed;
    document.getElementById('speedVal').innerText = parseFloat(settings.speed).toFixed(1) + 'x';
    document.getElementById('volumeSlider').value = settings.volume || 1;
    document.getElementById('volumeVal').innerText = Math.round((settings.volume || 1) * 100) + '%';
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
    document.getElementById('savePanel').style.right = '0';
}
function closeSavePanel() {
    document.getElementById('savePanel').style.right = '-460px';
}

// ==================== LOADING ====================
function loadFromPaste() {
    const text = document.getElementById('pasteArea').value.trim();
    if(!text) { alert('Paste some content first!'); return; }
    detectSpkrs(text);
    const parsed = parseTextWithSpkrs(text);
    const html = renderParsedSegments(parsed);
    initReader(html);
}

function handleFileSelect(input) {
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

async function handlePDFSelect(input) {
    showTTSStatus('⏳ Parsing PDF...', 0);
    try {
        const arrayBuffer = await input.files[0].arrayBuffer();
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
    } catch(e) {
        console.error('PDF error:', e);
        hideTTSStatus();
        alert('Error parsing PDF: ' + e.message);
    }
}

function initReader(html, isResume=false) {
    if(!html) return;
    document.getElementById('storyContainer').innerHTML = html;
    processContent();
    populateChapters();
    if(!isResume) {
        // First load or a re-submit after editing: auto-assign voices if
        // not already mapped, restart from the top.
        if(voices.length > 0) autoAssignVoices();
        currentSegmentIndex = 0;
    }
    renderVoiceMapping();
    saveState();
    collapseInputPanel();
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

// Only one of {settings panel, save panel, hamburger menu} may be open at
// once — they used to be independently toggled and would silently stack,
// so opening one never actually brought it in front of another.
function closeAllPanels() {
    document.getElementById('settingsPanel').classList.remove('open');
    document.getElementById('savePanel').style.right = '-460px';
    document.getElementById('hamburgerMenu').classList.remove('open');
}

function toggleHamburger() {
    const menu = document.getElementById('hamburgerMenu');
    const wasOpen = menu.classList.contains('open');
    closeAllPanels();
    if(!wasOpen) menu.classList.add('open');
}

function togglePanel() {
    const panel = document.getElementById('settingsPanel');
    const wasOpen = panel.classList.contains('open');
    closeAllPanels();
    if(!wasOpen) panel.classList.add('open');
}

// Clears the currently loaded story so a new one can be typed/pasted in,
// without leaving this page. The reader stays on one screen the whole
// time — this just empties it and reopens the text panel.
function startNewStory() {
    if(!confirm('Start a new story? Your current position is saved and can be resumed later from the input panel.')) return;
    saveState();
    stopPlayback();
    segments = [];
    currentSegmentIndex = 0;
    detectedSpkrs = new Set(['narrator']);
    document.getElementById('storyContainer').innerHTML = '<p class="empty-state">Load some text above to begin.</p>';
    populateChapters();
    renderVoiceMapping();
    document.getElementById('resumeBanner').classList.add('visible');
    expandInputPanel();
}

// ==================== COLLAPSIBLE PANELS (help + text input) ====================
function toggleInputPanel() { document.getElementById('inputPanel').classList.toggle('open'); }
function expandInputPanel() { document.getElementById('inputPanel').classList.add('open'); }
function collapseInputPanel() {
    document.getElementById('inputPanel').classList.remove('open');
    const label = document.getElementById('inputPanelLabel');
    if(label) label.innerText = `✎ EDIT TEXT — ${segments.length} segments, ${new Set(segments.map(s=>s.chapter)).size} chapter(s)`;
}

function toggleHelp() { document.getElementById('helpPanel').classList.toggle('open'); }
function expandHelp() { document.getElementById('helpPanel').classList.add('open'); }

function saveToDisk() {
    const ts = new Date().toISOString().slice(0,16).replace(/[:T]/g,'-');
    const fn = `FeistTech_${ts}.html`;
    const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = fn; a.click();
    URL.revokeObjectURL(url);
    showTTSStatus('💾 ' + fn, 2500);
}
