# Model Answer Playback Timer Design

## Goal
Show the user how long a model answer has been playing, and when available, the total duration of the model-answer audio.

## Chosen behavior
- Add a small playback-time readout near the model-answer read-aloud control.
- For generated MP3 playback, display `elapsed / total` once metadata is available, for example `0:12 / 0:47`.
- For browser speech-synthesis fallback, display elapsed time only, for example `0:12`, because total duration is not reliably exposed.
- Reset the timer when playback ends, when a new prompt is selected, or when model-answer playback is interrupted by another audio action.

## Approach
Reuse the page's existing timing style and single-file architecture. Add focused helper functions for formatting and rendering model-answer playback time so generated-audio and browser-voice paths can share the same UI without affecting prompt-recording timing.

## Testing
Extend the existing Node-based HTML assertions with coverage for the new timer element and helper functions, plus direct unit-style checks for the time formatter.
