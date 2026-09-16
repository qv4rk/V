// === TOLL TRAP: DATA-DRIVEN ENGINE ===

let debt = 14000;
let meterInterval = null;
let loopCount = 0;
let earthInstance = null;
let skyInstance = null;
let animFrame = null;
let isGameActive = true;

let actx = null;
let currentSpeechUrl = null;
let speechRequestId = 0;
let ttsRetries = 0;
const MAX_TTS_RETRIES = 20;

const audioPlayer = new Audio();
const stageEl = document.getElementById('stage');
const meterValEl = document.getElementById('debt-value');
const meterFillEl = document.getElementById('debt-fill');
const speakIndicator = document.getElementById('speak-indicator');

// 1. UTILITIES & AUDIO CONTEXT
function formatMoney(val) {
    return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

function ensureAudioContext() {
    if (!actx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) actx = new Ctx();
    }
    if (actx && actx.state === 'suspended') actx.resume().catch(() => {});
}

function playTick(pitchMultiplier = 1.0) {
    if (!isGameActive || !actx) return;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150 * pitchMultiplier, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.06, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start();
    osc.stop(actx.currentTime + 0.1);
}

// 2. THE METER
function startMeter() {
    if (meterInterval) clearInterval(meterInterval);
    meterInterval = setInterval(() => {
        if (!isGameActive) return;
        debt += 0.014;
        meterValEl.textContent = formatMoney(debt);
        if (debt > 14010) meterValEl.style.textShadow = '0 0 10px red';
        const pct = Math.min(((debt - 14000) / 50) * 100, 100);
        meterFillEl.style.height = pct + '%';
        playTick(debt > 14005 ? 1.2 : 1.0);
    }, 1000);
}

// 3. TTS INTEGRATION
async function speakText(text, voiceType) {
    const requestId = ++speechRequestId;
    if (!window.ttsReady || !window.EdgeTTS) {
        if (ttsRetries < MAX_TTS_RETRIES) {
            ttsRetries++;
            setTimeout(() => speakText(text, voiceType), 250);
        }
        return;
    }
    ttsRetries = 0;
    const voiceId = voiceType === 'protagonist' ? 'en-US-ChristopherNeural' : 'en-GB-SoniaNeural';
    try {
        speakIndicator.innerText = `[ AUDIO: ${voiceId} ]`;
        const tts = new window.EdgeTTS(text, voiceId, { rate: '+15%', volume: '100%' });
        const result = await tts.synthesize();
        if (requestId !== speechRequestId) return;
        if (currentSpeechUrl) {
            URL.revokeObjectURL(currentSpeechUrl);
            currentSpeechUrl = null;
        }
        const blob = new Blob([result.audio], { type: 'audio/mp3' });
        currentSpeechUrl = URL.createObjectURL(blob);
        audioPlayer.pause();
        audioPlayer.src = currentSpeechUrl;
        try { await audioPlayer.play(); } catch (e) { console.warn('Audio blocked:', e); }
        audioPlayer.onended = () => { if (requestId === speechRequestId) speakIndicator.innerText = ''; };
    } catch (e) {
        console.error('TTS Failed:', e);
        speakIndicator.innerText = '';
    }
}

// 4. MANIFOLD ATLAS INTEGRATION
function clearBackground() {
    document.getElementById('canvas-container').style.opacity = '0';
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = null;
}

function triggerBackground(type) {
    const container = document.getElementById('canvas-container');
    const canvas = document.getElementById('apocalypse-canvas');
    if (!type || type === 'none' || !window.MA) return clearBackground();

    container.style.opacity = '0.7';
    const mockTheme = () => 'night';

    if (type === 'earth' && window.MA.EarthGlobe) {
        if (!earthInstance) earthInstance = new window.MA.EarthGlobe(canvas, mockTheme);
        earthInstance.resize();
        earthInstance.spinRate = 0.5;
        const loop = () => { earthInstance.render(); animFrame = requestAnimationFrame(loop); };
        if (animFrame) cancelAnimationFrame(animFrame);
        loop();
    } else if (type === 'sky' && window.MA.SkyDome) {
        if (!skyInstance) skyInstance = new window.MA.SkyDome(canvas, mockTheme);
        skyInstance.resize();
        skyInstance.observerLat = 40.71;
        skyInstance.observerLon = -73.95;
        skyInstance.observerName = 'QUEENS';
        skyInstance.mode = 'full';
        const loop = () => { skyInstance.render(); animFrame = requestAnimationFrame(loop); };
        if (animFrame) cancelAnimationFrame(animFrame);
        loop();
    } else {
        clearBackground();
    }
}

// 5. SCENE RENDERER
function renderScene(sceneId, triggerEl = null) {
    const sceneData = SCENES[sceneId];
    if (!sceneData) return;

    const oldSlide = document.querySelector('.slide.active');
    const newSlide = document.createElement('section');
    newSlide.className = 'slide';
    newSlide.id = sceneId;

    // Apply loop scarring
    let scarClass = '';
    if (sceneData.isHub) {
        if (loopCount === 1) scarClass = 'scar-1';
        if (loopCount >= 2) scarClass = 'scar-2';
    }
    if (scarClass) newSlide.classList.add(scarClass);

    let html = `<div class="story-card ${sceneData.isHub ? 'glass-card' : ''}">`;
    html += `<h1 class="${loopCount >= 2 && sceneData.isHub ? 'glitch-text' : ''}">${sceneData.title}</h1>`;
    html += `<p class="read-text">${sceneData.text}</p>`;

    if (sceneData.choices) {
        html += `<div class="cloud-row">`;
        sceneData.choices.forEach(choice => {
            if (choice.type === 'cloud') {
                html += `<button class="thought-cloud" data-next="${choice.next}" type="button">
                            <h2>${choice.label}</h2><p>${choice.desc}</p>
                         </button>`;
            } else {
                const nextAttr = choice.next ? `data-next="${choice.next}"` : '';
                const winAttr = choice.isWin ? 'data-win="true"' : '';
                const loopAttr = choice.isLoop ? 'data-loop="true"' : '';
                html += `<button class="btn trap-btn" ${nextAttr} ${winAttr} ${loopAttr} type="button">${choice.label}</button>`;
            }
        });
        html += `</div>`;
    }
    html += `</div>`;
    newSlide.innerHTML = html;
    stageEl.appendChild(newSlide);

    // Transition
    if (oldSlide && triggerEl) {
        const rect = triggerEl.getBoundingClientRect();
        const x = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
        const y = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
        oldSlide.style.setProperty('--zoom-x', x + '%');
        oldSlide.style.setProperty('--zoom-y', y + '%');
        oldSlide.classList.add('zooming');
        audioPlayer.pause();

        setTimeout(() => {
            oldSlide.remove();
            newSlide.classList.add('active');
            triggerBackground(sceneData.bg);
            speakText(sceneData.text, sceneData.voice);
        }, 850);
    } else {
        newSlide.classList.add('active');
        triggerBackground(sceneData.bg);
        setTimeout(() => speakText(sceneData.text, sceneData.voice), 500);
    }
}

// 6. EVENT DELEGATION
document.addEventListener('click', (e) => {
    ensureAudioContext();
    const btn = e.target.closest('[data-next]');
    const winBtn = e.target.closest('[data-win]');

    if (winBtn) {
        isGameActive = false;
        clearInterval(meterInterval);
        audioPlayer.pause();
        clearBackground();
        const meterWrap = document.getElementById('toll-meter');
        meterWrap.style.borderColor = '#00ff41';
        meterFillEl.style.background = '#00ff41';
        meterValEl.style.color = '#00ff41';
        meterValEl.style.textShadow = '0 0 10px #00ff41';
        speakText('Order entered. The meter is stopped.', 'narrator');
    }

    if (btn) {
        if (btn.hasAttribute('data-loop')) loopCount++;
        renderScene(btn.dataset.next, btn);
    }
});

window.addEventListener('resize', () => {
    if (earthInstance && typeof earthInstance.resize === 'function') earthInstance.resize();
    if (skyInstance && typeof skyInstance.resize === 'function') skyInstance.resize();
});

// Boot
window.onload = () => {
    startMeter();
    renderScene('start');
};
