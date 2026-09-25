# FeistTech Reading Room — portable extension prototype

Manifest V3 browser extension prototype.

## Current behavior
- Reads paragraph text from the current page.
- Choose 1, 2, or 3 narrators.
- Narrators rotate once per paragraph: A; A/B; or A/B/C.
- Uses browser speech synthesis for the first portable prototype.
- Stop control cancels current narration.

## Load unpacked
Open your Chromium browser's Extensions page, enable Developer mode, choose **Load unpacked**, and select this folder.

## Next integration
Port the Reading Room Edge-TTS voice catalog/synthesis adapter into a shared core, add readable country/language grouping, RSVP synchronization, paragraph highlighting, pause/resume, and an embeddable website module.
