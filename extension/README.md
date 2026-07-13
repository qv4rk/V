# Feist Doc Audio Capture

Manifest V3 extension that records whatever audio a browser tab is
currently playing — e.g. Google Docs' "Listen to this document" — and
saves it as a `.webm` file via the popup's Start/Stop buttons.

## Load it in Kiwi Browser (Android)

1. Get the `extension/` folder onto the device (sync this repo, or copy
   the folder via a file manager / cloud drive).
2. In Kiwi: menu (⋮) → **Extensions**.
3. Turn on **Developer mode** (top right).
4. Tap **Load unpacked** and pick the `extension/` folder.
5. Pin the extension if you want its icon visible in the toolbar.

## Use it

1. Open the Google Doc, start "Listen to this document".
2. Tap the extension icon → **Start Capture**.
3. Let it play through. The tab keeps sounding normal — capture loops
   the audio back to the speakers so you still hear it.
4. Tap the icon → **Stop & Save**. The `.webm` lands in Downloads.

## Two things to verify before relying on this

- **Whether tab audio capture even sees the "Listen to this doc" voice.**
  `chrome.tabCapture` reliably grabs `<audio>`/`<video>`/Web Audio
  output. Google's read-aloud feature may or may not route through that
  same graph depending on which TTS engine it's using — do a 10-second
  test capture first before trusting it for a long document.
- **Kiwi's tabCapture/offscreen support on Android.** Kiwi is one of the
  few Android browsers that expose desktop-only extension APIs, but
  `chrome.offscreen` needs a reasonably recent Chromium base (109+).
  Check `chrome://version` in Kiwi if Start Capture errors out.

If capture comes back silent, the fallback is: keep the tab's audio
routed through the device's normal output and use Android's built-in
screen/system audio recorder instead — that grabs it below the browser,
so it doesn't depend on which graph the TTS engine uses.
