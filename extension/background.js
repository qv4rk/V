let mediaRecorder;
let audioChunks = [];
let currentChapter = "0";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "START_CAPTURE") {
    currentChapter = message.chapter;

    chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
      if (!stream) return;

      const audioContext = new AudioContext();
      const streamSource = audioContext.createMediaStreamSource(stream);
      streamSource.connect(audioContext.destination);

      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);

        chrome.downloads.download({
          url: url,
          filename: `FeistTech_Ch_${currentChapter}_${Date.now()}.webm`,
          saveAs: false
        });
      };

      mediaRecorder.start();
    });
  }

  if (message.action === "STOP_CAPTURE" && mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
});
