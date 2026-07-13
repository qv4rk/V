let mediaRecorder = null;
let recordedChunks = [];
let activeStream = null;
let activeAudioContext = null;

async function startRecording(streamId, filename) {
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
  recordedChunks = [];

  mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };
  mediaRecorder.onstop = async () => {
    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    try {
      await chrome.downloads.download({ url, filename, saveAs: false });
      chrome.runtime.sendMessage({ type: 'recording-saved' });
    } catch (e) {
      chrome.runtime.sendMessage({ type: 'recording-error', error: e.message || String(e) });
    } finally {
      URL.revokeObjectURL(url);
      stream.getTracks().forEach((t) => t.stop());
      audioContext.close();
      activeStream = null;
      activeAudioContext = null;
    }
  };
  mediaRecorder.start();
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  } else {
    if (activeStream) activeStream.getTracks().forEach((t) => t.stop());
    if (activeAudioContext) activeAudioContext.close();
    chrome.runtime.sendMessage({ type: 'recording-error', error: 'nothing was recording' });
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'offscreen-start') {
    startRecording(msg.streamId, msg.filename).catch((e) => {
      chrome.runtime.sendMessage({ type: 'recording-error', error: e.message || String(e) });
    });
  } else if (msg.type === 'offscreen-stop') {
    stopRecording();
  }
});
