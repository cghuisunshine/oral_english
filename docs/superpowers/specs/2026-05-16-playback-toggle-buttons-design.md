# Playback Toggle Buttons Design

## Goal
Let the user pause either kind of playback from the same button that started it.

## Chosen behavior
- The model-answer button changes from play to pause while a model answer is playing.
- The prompt-recording button changes from play to pause while the user's recording is playing.
- Clicking a pause-state button pauses that playback; clicking it again resumes playback.
- If another audio action interrupts playback, or playback ends or fails, the affected button returns to the play state.
- Browser speech-synthesis fallback follows the same model-answer button behavior when pause/resume is supported.

## Approach
Keep the existing two controls and make each one a stateful toggle. Add a small shared helper for rendering play/pause button state, track whether active playback belongs to the model answer or the prompt recording, and update the buttons from real playback lifecycle events instead of only from click handlers.

## Testing
Extend the existing Node-based HTML assertions with coverage for pause-icon styling, toggle helper functions, and the play/pause branches for both recording playback and model-answer playback.
