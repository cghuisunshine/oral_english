# Model Answer Playback Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visible model-answer playback timer that shows elapsed time and, when available, total duration.

**Architecture:** Keep the existing single-file HTML app structure. Add a dedicated timer element and small helper functions in `daily_speaking_practice.html`, then route both generated-audio playback and speech-synthesis playback through those helpers. Extend the existing Node assertion test file instead of introducing a new test harness.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Node `assert`

---

### Task 1: Add failing tests for timer markup and formatting

**Files:**
- Modify: `test_daily_speaking_practice.mjs`

- [ ] Add assertions for a model-answer playback timer element and helper functions.
- [ ] Add direct tests for formatted elapsed/total time strings.
- [ ] Run `node test_daily_speaking_practice.mjs` and verify the new assertions fail because the timer does not exist yet.

### Task 2: Implement timer UI and playback updates

**Files:**
- Modify: `daily_speaking_practice.html`

- [ ] Add a compact timer readout beside the model-answer read button.
- [ ] Add helpers for formatting, rendering, starting, and stopping model-answer playback timing.
- [ ] Update generated MP3 playback to show elapsed and total duration when available.
- [ ] Update speech-synthesis fallback to show elapsed time only.
- [ ] Reset the readout on playback end, prompt change, and playback interruption.
- [ ] Run `node test_daily_speaking_practice.mjs` and verify the new tests pass.

### Task 3: Verify the full page behavior

**Files:**
- Review: `daily_speaking_practice.html`
- Run: `node test_daily_speaking_practice.mjs`

- [ ] Confirm existing tests remain green.
- [ ] Inspect the changed markup and playback flow for regressions in prompt recording and sentence highlighting.
