# Feist Doc Audio Capture

Manifest V3 extension that records whatever audio a browser tab is
currently playing — e.g. Google Docs' "Listen to this document" — and
saves it as a `.webm` file.

Like the FeistTech Archiver extension, this has no popup — Kiwi's popup
rendering is unreliable, so `action` is empty and clicking the toolbar
icon instead opens (or refocuses) a singleton **Recorder tab**
(`recorder.html`). That tab lists your open tabs and lets you start/stop
capture on whichever one is playing the doc's voice.

## Load it in Kiwi Browser (Android)

1. Get the `extension/` folder onto the device (sync this repo, or copy
   the folder via a file manager / cloud drive).
2. In Kiwi: menu (⋮) → **Extensions**.
3. Turn on **Developer mode** (top right).
4. Tap **Load unpacked** and pick the `extension/` folder.
5. Pin the extension if you want its icon visible in the toolbar.

## Use it

1. Tap the extension icon → it opens the **Recorder** tab.
2. Find the doc/chat tab in the list (Google Docs, Sheets, Slides,
   Gemini, ChatGPT, Claude, and a few others get a colored badge — any
   other tab still works, it just shows a plain "tab" badge) and tap
   **● Capture**.
3. Switch to that tab and press its read-aloud/listen button. With
   "Wait for audio before recording" checked (the default), the capture
   sits **armed** — silently monitoring the tab's volume — and only
   starts the actual recording the instant real audio is detected, so
   you don't end up with 5-10 seconds of dead silence at the start from
   switching tabs and clicking play. Uncheck it if you'd rather start
   recording immediately on Capture.
4. The tab keeps sounding normal throughout — capture loops the audio
   back to the speakers so you still hear it.
5. Tap **■ Stop & Save** in the status bar when done. The `.webm` lands
   in Downloads. (Hitting Stop while still armed, before any sound
   arrived, just cancels — nothing is saved.)
6. Switch back to the doc tab any time — the Recorder tab keeps running
   in the background and you can flip back to it to stop the capture.

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

## Known limitation

The recorded audio is base64-encoded and passed from the offscreen
document to the background service worker over `chrome.runtime`
messaging (`chrome.downloads` isn't reliably reachable from inside the
offscreen document itself, which is what caused the "Cannot read
properties of undefined (reading 'download')" error in the first pass).
That message has a practical size ceiling — fine for a document-length
recording, but a multi-hour capture could theoretically hit it. Not
expected to matter for "listen to this doc" use, flagging it in case a
very long capture ever comes back empty.
