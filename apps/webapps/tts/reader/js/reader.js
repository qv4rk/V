
function detectSpkrs(text) {
    if (!text || typeof text !== 'string') return;
    const matches = text.matchAll(/\[(?:SPKR|SPEAKER):\s*([^\]]+)\]/gi);
    for (const match of matches) {
        if (match && typeof match[1] === 'string') detectedSpkrs.add(match[1].trim());
    }
}

function parseTextWithSpkrs(text) {
    const source = String(text || '').replace(/\r\n?/g, '\n');
    const parsed = [];
    let currentSpeaker = 'narrator';

    // Explicit tags are authoritative. They may occur at the start, end, or
    // inline; text between tags becomes a virtual TTS segment.
    const tagRe = /\[(?:(?:SPKR|SPEAKER):\s*)?([^\]\n]+)\]/gi;
    let last = 0;
    let match;

    const pushText = (raw, speaker) => {
        String(raw || '').split(/\n{2,}/).forEach(part => {
            const clean = part.trim();
            if (clean) parsed.push({ text: clean, spkr: speaker || 'narrator' });
        });
    };

    while ((match = tagRe.exec(source)) !== null) {
        pushText(source.slice(last, match.index), currentSpeaker);
        const speaker = String(match[1] || '').trim();
        if (speaker) {
            currentSpeaker = speaker;
            detectedSpkrs.add(speaker);
        }
        last = tagRe.lastIndex;
    }
    pushText(source.slice(last), currentSpeaker);

    if (!parsed.length && source.trim()) parsed.push({ text: source.trim(), spkr: 'narrator' });
    return parsed;
}

function renderParsedSegments(parsed) {
    return (parsed || []).map(seg => {
        const p = document.createElement('p');
        p.dataset.spkr = seg.spkr || 'narrator';
        p.textContent = seg.text || '';
        return p.outerHTML;
    }).join('');
}

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
let playbackGeneration = 0;
let currentAudioUrl = null;

// ==================== INIT / VOICE SYSTEM ====================
window.onload = () => {
    checkPersistence();
    waitForLib();
    setupKeyboard();
    if(window.FeistTheme) FeistTheme.mount('#themeSwitcherMount');
    loadLibrary();
    const params = new URLSearchParams(window.location.search);
    const pdfUrl = params.get('pdf');
    if (pdfUrl) loadPDFFromUrl(pdfUrl, params.get('title'));
    const articleId = params.get('article');
    if (articleId) loadArticleIntoReader(articleId, false);
};

function waitForLib() {
    if(window.appReady) loadEdgeVoices();
    else setTimeout(waitForLib, 100);
}

function unlockAudioPlayback() {
    if(audioUnlocked) return;
    audioUnlocked = true;
    audioPlayer.muted = true;
    const p = audioPlayer.play();
    if(p && p.catch) p.catch(() => {});
    audioPlayer.pause();
    audioPlayer.muted = false;
}

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
    return list.sort((a,b) => {
        const ai = a.priority ? order.indexOf(a.priority) : 999;
        const bi = b.priority ? order.indexOf(b.priority) : 999;
        if(ai !== bi) return ai - bi;
        return (a.FriendlyName || a.ShortName || '').localeCompare(b.FriendlyName || b.ShortName || '');
    });
}

async function loadEdgeVoices() {
    try {
        const manager = await window.VoicesManager.create();
        let edgeVoices;
        if(Array.isArray(manager.voices)) edgeVoices = manager.voices;
        else if(typeof manager.getVoices === 'function') edgeVoices = manager.getVoices();
        else if(typeof manager.find === 'function') edgeVoices = manager.find({});
        else edgeVoices = [];
        if(!edgeVoices || edgeVoices.length === 0) throw new Error('No Edge voices array available');
        voices = sortVoicesByPriority(edgeVoices.map(annotateVoice));
        settings.useBrowserTTS = false;
    } catch(e) {
        console.warn('Edge-TTS voice listing unavailable, using bundled catalog', e);
        voices = sortVoicesByPriority((window.VOICE_CATALOG || []).map(v => annotateVoice({
            ShortName:v.shortName, FriendlyName:v.name, Gender:v.gender, Locale:v.locale
        })));
        settings.useBrowserTTS = false;
    }
    initializeDefaultVoiceMapping();
    renderVoiceMapping();
}

function loadBrowserVoices() {
    settings.useBrowserTTS = true;
    if(!window.speechSynthesis) return;
    const bv = speechSynthesis.getVoices();
    if(!bv.length) return;
    voices = sortVoicesByPriority(bv.map(v => annotateVoice({
        ShortName:v.name, FriendlyName:v.name,
        Gender:/female|woman|zira|karen|moira|tessa|fiona|allison|ava|susan|samantha|victoria/i.test(v.name) ? 'Female' : 'Male',
        Locale:v.lang, _native:v
    })));
    settings.voicesLoaded = true;
    if(!voiceMapping.narrator && voices.length) voiceMapping.narrator = voices[0].ShortName;
    renderVoiceMapping();
}

function initializeDefaultVoiceMapping() {
    if(!voices.length) return;
    const femaleEN = voices.find(v => (v.Gender || '').toLowerCase() === 'female' && v.Locale && v.Locale.startsWith('en'));
    if(!voiceMapping.narrator) voiceMapping.narrator = (femaleEN || voices[0]).ShortName;
}

function triggerVoiceLoad() {
    voiceLoadAttempted = true;
    loadBrowserVoices();
}

function edgeTTSOpts() {
    return { rate: formatEdgePct(settings.speed), pitch: '+0Hz', volume: formatEdgePct(settings.volume) };
}

async function synthesizeSegmentAudio(text, voice, opts) {
    const chunks = chunkTextForTTS(text);
    if(!chunks.length) return null;
    const blobs = [];
    for(const chunk of chunks) {
        const audio = await synthesizeEdgeChunk(chunk, voice, opts);
        if(audio) blobs.push(new Blob([audio], {type:'audio/mp3'}));
        else console.warn('Dropped a TTS chunk with no audio after retry:', chunk.slice(0,60));
    }
    return blobs.length ? new Blob(blobs, {type:'audio/mp3'}) : null;
}

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
    // 1. Check local on-device Kokoro TTS first
    try {
        const localUrl = 'http://127.0.0.1:5005/synthesize?text=' + encodeURIComponent(text) + '&voice=' + encodeURIComponent(voice || '');
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 12000);
        const res = await fetch(localUrl, { signal: ctrl.signal });
        clearTimeout(tid);
        if(res.ok) {
            const buf = await res.arrayBuffer();
            if(buf && buf.byteLength > 0) return buf;
        }
    } catch(err) {}

    // 2. Remote Edge-TTS
    for (let attempt = 0; attempt < 2; attempt++) {
        if(attempt > 0) await new Promise(resolve => setTimeout(resolve, 500));
        try {
            const result = await new window.EdgeTTS(String(text || ' '), String(voice || 'en-US-AriaNeural'), opts || {}).synthesize();
            if(result && result.audio && result.audio.byteLength > 0) return result.audio;
        } catch(e) {
            console.warn('Edge-TTS chunk failed, attempt', attempt, e?.message || e);
        }
    }
    return null;
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

async function playWithBrowserTTS(seg, generation) {
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
            if(!isPlaying || generation !== playbackGeneration) { resolve(); return; }
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
            if(generation !== playbackGeneration) { resolve(); return; }
            try { speechSynthesis.speak(utterance); updateMediaSession(seg); }
            catch(e) { nativeTTSActive = false; reject(e); }
        }, 50);
    });
}

async function play() {
    if(!segments.length) return;
    if(currentSegmentIndex >= segments.length) currentSegmentIndex = 0;

    const generation = ++playbackGeneration;
    isPlaying = true;
    const playBtn = document.getElementById('playBtn');
    if(playBtn) playBtn.innerText = '⏳';

    const seg = segments[currentSegmentIndex];
    highlight(seg);

    try {
        if(settings.useBrowserTTS) await playWithBrowserTTS(seg, generation);
        else await playWithEdgeTTS(seg, generation);
    } catch(e) {
        if(generation !== playbackGeneration) return;
        console.error('Playback error:', e);
        if(!settings.useBrowserTTS) {
            settings.useBrowserTTS = true;
            loadBrowserVoices();
            renderVoiceMapping();
            showTTSStatus('⚠ Edge-TTS failed, switched to browser voices — Export needs Edge-TTS again', 5000);
            try { await playWithBrowserTTS(seg, generation); }
            catch(e2) { handlePlayError(e2, generation); }
        } else {
            handlePlayError(e, generation);
        }
    }
}

function handlePlayError(e, generation = playbackGeneration) {
    if(generation !== playbackGeneration) return;
    isPlaying = false;
    const playBtn = document.getElementById('playBtn');
    if(playBtn) playBtn.innerText = '⚠ ERR';
    showTTSStatus('Playback failed: ' + (e?.message || e?.error || 'unknown'), 4000);
}

function preloadAhead(currentIndex) {
    if(settings.useBrowserTTS || !window.EdgeTTS) return;
    const gen = audioCacheGen;
    for(let offset = 1; offset <= PRELOAD_LOOKAHEAD; offset++) {
        const idx = currentIndex + offset;
        if(idx >= segments.length || audioCache[idx] || audioCachePending[idx]) continue;
        const seg = segments[idx];
        if(!seg || !String(seg.text || '').trim()) continue;
        const voice = voiceMapping[seg.spkr] || voiceMapping.narrator || voices[0]?.ShortName || 'en-US-AriaNeural';
        audioCachePending[idx] = (async () => {
            try {
                const blob = await synthesizeSegmentAudio(seg.text, voice, edgeTTSOpts());
                if(blob && gen === audioCacheGen) audioCache[idx] = URL.createObjectURL(blob);
            } catch(e) {
                console.warn('Preload failed for segment', idx, e?.message || e);
            } finally {
                delete audioCachePending[idx];
            }
        })();
    }
}

async function playWithEdgeTTS(seg, generation) {
    if(!seg || !String(seg.text || '').trim()) throw new Error('Segment text is empty');

    let url = audioCache[currentSegmentIndex] || null;
    if(url) delete audioCache[currentSegmentIndex];

    if(!url) {
        const voice = voiceMapping[seg.spkr] || voiceMapping.narrator || voices[0]?.ShortName || 'en-US-AriaNeural';
        const blob = await synthesizeSegmentAudio(seg.text, voice, edgeTTSOpts());
        if(!blob) throw new Error('NoAudioReceived');
        url = URL.createObjectURL(blob);
    }

    if(generation !== playbackGeneration) { URL.revokeObjectURL(url); return; }

    if(currentAudioUrl) URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = url;
    preloadAhead(currentSegmentIndex);

    audioPlayer.src = url;
    audioPlayer.volume = settings.volume;
    audioPlayer.playbackRate = 1.0;

    audioPlayer.onended = () => {
        if(currentAudioUrl === url) currentAudioUrl = null;
        URL.revokeObjectURL(url);
        if(!isPlaying || generation !== playbackGeneration) return;
        currentSegmentIndex++;
        saveState();
        updateProgress();
        if(currentSegmentIndex < segments.length) play();
        else {
            isPlaying = false;
            const btn = document.getElementById('playBtn');
            if(btn) btn.innerText = '▶ PLAY';
        }
    };

    audioPlayer.onerror = () => {
        if(generation !== playbackGeneration) return;
        const mediaErr = audioPlayer.error;
        const codeNames = {1:'ABORTED',2:'NETWORK',3:'DECODE',4:'SRC_NOT_SUPPORTED'};
        const detail = mediaErr
            ? `${codeNames[mediaErr.code] || mediaErr.code}: ${mediaErr.message || 'no message'}`
            : 'no MediaError available';
        handlePlayError(new Error('Edge-TTS audio error — ' + detail), generation);
    };

    window.dispatchEvent(new CustomEvent('FeistTech_Audio_Start', {detail:{chapter:seg.chapter}}));
    await audioPlayer.play();
    if(generation !== playbackGeneration) return;
    const btn = document.getElementById('playBtn');
    if(btn) btn.innerText = '⏸ PAUSE';
    updateMediaSession(seg);
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
        } else if(isPlaying && audioPlayer.src && audioPlayer.src !== window.location.href) {
            audioPlayer.play(); isPlaying = true;
            if (playBtn) playBtn.innerText = '⏸ PAUSE';
        } else if(audioPlayer.src && audioPlayer.src !== window.location.href && currentAudioUrl) {
            audioPlayer.play(); isPlaying = true;
            if (playBtn) playBtn.innerText = '⏸ PAUSE';
        } else if(isPlaying) { stopPlayback(); }
        else { play(); }
    }
}

function stopPlayback() {
    playbackGeneration++;
    isPlaying = false;
    if(window.speechSynthesis) speechSynthesis.cancel();
    audioPlayer.pause();
    audioPlayer.removeAttribute('src');
    audioPlayer.load();
    if(currentAudioUrl) { URL.revokeObjectURL(currentAudioUrl); currentAudioUrl = null; }
    const playBtn = document.getElementById('playBtn');
    if (playBtn) playBtn.innerText = '▶ PLAY';
    hideTTSStatus();
    window.dispatchEvent(new CustomEvent('FeistTech_Audio_Stop'));
}

function skipSegment(dir) {
    if(!segments.length) return;
    stopPlayback();
    currentSegmentIndex = Math.max(0, Math.min(segments.length - 1, currentSegmentIndex + dir));
    saveState();
    play();
}

function jumpToChapter(v) {
    if(!v || isNaN(parseInt(v)) || !segments[parseInt(v)]) return;
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

// ==================== VOICE MAPPING ====================
function getAvailableVoices() {
    if (Array.isArray(voices) && voices.length) {
        return voices.map(v => ({
            ShortName: v.ShortName || v.shortName || v.name,
            FriendlyName: v.FriendlyName || v.name || v.ShortName || v.shortName,
            Gender: v.Gender || v.gender || '',
            Locale: v.Locale || v.locale || ''
        })).filter(v => v.ShortName);
    }
    return (window.VOICE_CATALOG || []).map(v => ({
        ShortName: v.shortName,
        FriendlyName: v.name || v.shortName,
        Gender: v.gender || '',
        Locale: v.locale || ''
    })).filter(v => v.ShortName);
}

function autoAssignVoices() {
    const available = getAvailableVoices();
    if (!available.length) return;
    const speakers = [...detectedSpkrs];
    speakers.forEach((spkr, i) => {
        if (!voiceMapping[spkr]) voiceMapping[spkr] = available[i % available.length].ShortName;
    });
}

function setSpeakerVoice(spkr, voiceName) {
    voiceMapping[spkr] = voiceName || null;
    clearAudioCache();
    saveState();
    renderVoiceMapping();
}

function renderVoiceMapping() {
    const container = document.getElementById('voiceMappingContainer');
    if (!container) return;
    const available = getAvailableVoices();
    if (available.length) autoAssignVoices();

    container.replaceChildren();
    [...detectedSpkrs].forEach(spkr => {
        const row = document.createElement('div');
        row.className = 'voice-map-row';

        const label = document.createElement('span');
        label.className = 'voice-map-speaker';
        label.textContent = spkr === 'narrator' ? 'Narrator' : spkr;

        const select = document.createElement('select');
        select.className = 'voice-select';
        select.setAttribute('aria-label', 'Voice for ' + label.textContent);

        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = available.length ? 'Choose voice…' : 'Voices loading…';
        select.appendChild(empty);

        available.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.ShortName;
            opt.textContent = [v.FriendlyName, v.Gender, v.Locale].filter(Boolean).join(' · ');
            select.appendChild(opt);
        });

        select.value = voiceMapping[spkr] || '';
        select.onchange = () => setSpeakerVoice(spkr, select.value);

        const preview = document.createElement('button');
        preview.type = 'button';
        preview.className = 'btn';
        preview.textContent = '▶';
        preview.title = 'Preview voice';
        preview.onclick = async () => {
            const voiceName = select.value || voiceMapping[spkr];
            if (!voiceName) return;
            const ok = await previewVoice(voiceName, spkr);
            voiceStatusMemory[voiceName] = ok ? 'working' : 'broken';
            try { localStorage.setItem('feist_voiceStatus', JSON.stringify(voiceStatusMemory)); } catch(e) {}
        };

        row.append(label, select, preview);
        container.appendChild(row);
    });
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
        currentSegmentIndex = Math.max(0, Math.min(segments.length - 1, parseInt(p) || 0));
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
    currentSegmentIndex = Math.max(0, Math.min(segments.length - 1, slot.progress));
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
    stopPlayback();
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
        const index = segments.length;
        segments.push({ index, element: p, text: txt, chapter: ch, spkr });
        p.onclick = () => { stopPlayback(); currentSegmentIndex = index; play(); };
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
            const option = document.createElement('option');
            option.value = firstIdx;
            option.textContent = title;
            sel.appendChild(option);
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
    localStorage.removeItem('feist_content');
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
