# FeistTech Reading Room extension v0.2

Kiwi test build.

- Select any open HTTP/HTTPS tab.
- Choose 1, 2, or 3 narrators.
- Narrators rotate by paragraph.
- The extension models the page as sections of three paragraphs for later MP3 export/merge.
- Voice labels hide raw locale codes and translate locale into readable language/country when the browser exposes it.

## Audio export plan
The current browser SpeechSynthesis API plays audio but does not expose encoded MP3 bytes. The next engine step is to reuse Reading Room's working Edge-TTS synthesis path. That gives us the same per-section MP3 download architecture as the main Reading Room: three-paragraph section files, then page-level merge/export.
