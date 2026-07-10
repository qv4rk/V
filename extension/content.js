window.addEventListener('FeistTech_Audio_Start', (e) => {
    chrome.runtime.sendMessage({ action: "START_CAPTURE", chapter: e.detail.chapter });
});

window.addEventListener('FeistTech_Audio_Stop', () => {
    chrome.runtime.sendMessage({ action: "STOP_CAPTURE" });
});
