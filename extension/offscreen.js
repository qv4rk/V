let mediaRecorder = null;
let recordedChunks = [];
let activeStream = null;
let activeAudioContext = null;
let detectorRafId = null;
let armed = false;

// Chunked so a large ArrayBuffer doesn't blow the call stack via
// String.fromCharCode.apply — same approach as the Archiver's bufferToBase64.
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

const SILENCE_RMS_THRESHOLD = 0.02;
const SOUND_FRAMES_REQUIRED = 3;

function cleanup() {
  if (detectorRafId) { cancelAnimationFrame(detectorRafId); detectorRafId = null; }
  if (activeStream) { activeStream.getTracks().forEach((t) => t.stop()); activeStream = null; }
  if (activeAudioContext) { activeAudioContext.close(); activeAudioContext = null; }
  armed = false;
  mediaRecorder = null;
}

async function startRecording(streamId, filename, waitForSound) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId
      }
    },
    video: false
  });

  // Route the captured stream back to the speakers — tabCapture mutes the
  // tab's normal output once claimed, so without this loopback the user
  // would stop hearing the doc being read while it's being recorded.
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(audioContext.destination);

  activeStream = stream;
  activeAudioContext = audioContext;

  if (waitForSound) {
    armed = true;
    chrome.runtime.sendMessage({ type: 'capture-armed' });
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let soundFrames = 0;

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sumSquares += v * v;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      if (rms > SILENCE_RMS_THRESHOLD) {
        soundFrames++;
        if (soundFrames >= SOUND_FRAMES_REQUIRED) {
          detectorRafId = null;
          armed = false;
          beginActualRecording(stream, filename);
          return;
        }
      } else {
        soundFrames = 0;
      }
      detectorRafId = requestAnimationFrame(tick);
    };
    detectorRafId = requestAnimationFrame(tick);
  } else {
    beginActualRecording(stream, filename);
  }
}

function beginActualRecording(stream, filename) {
  recordedChunks = [];
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };
  mediaRecorder.onstop = async () => {
    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
    try {
      const buffer = await blob.arrayBuffer();
      const base64 = bufferToBase64(buffer);
      chrome.runtime.sendMessage({ type: 'recording-blob', base64, mimeType: blob.type, filename });
    } catch (e) {
      chrome.runtime.sendMessage({ type: 'recording-error', error: e.message || String(e) });
    } finally {
      cleanup();
    }
  };
  mediaRecorder.start();
  chrome.runtime.sendMessage({ type: 'capture-started' });
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  } else if (armed) {
    // Stopped before any sound was detected — nothing to save.
    cleanup();
    chrome.runtime.sendMessage({ type: 'capture-cancelled' });
  } else {
    cleanup();
    chrome.runtime.sendMessage({ type: 'recording-error', error: 'nothing was recording' });
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'offscreen-start') {
    startRecording(msg.streamId, msg.filename, !!msg.waitForSound).catch((e) => {
      cleanup();
      chrome.runtime.sendMessage({ type: 'recording-error', error: e.message || String(e) });
    });
  } else if (msg.type === 'offscreen-stop') {
    stopRecording();
  }
});
