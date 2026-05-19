# Playback Toggle Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn both playback buttons into play/pause toggles so active audio can be paused and resumed in place.

**Architecture:** Keep the single-file HTML app structure. Add focused UI-state helpers and lightweight playback-source tracking inside `daily_speaking_practice.html`, then extend the existing Node assertion suite in `test_daily_speaking_practice.mjs` to cover the new toggle behavior.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Node `assert`

---

### Task 1: Add failing tests for toggle state support

**Files:**
- Modify: `test_daily_speaking_practice.mjs`

- [ ] Add assertions for pause-icon styling and button-state helper functions.
- [ ] Add assertions that recording playback and model-answer playback route through toggle logic.
- [ ] Run `node test_daily_speaking_practice.mjs` and verify the new assertions fail before implementation.

### Task 2: Implement shared play/pause button rendering

**Files:**
- Modify: `daily_speaking_practice.html`

- [ ] Add pause-icon CSS.
- [ ] Add helpers that switch button icon, accessible label, and title between play and pause states.
- [ ] Track which playback source is active so unrelated controls return to play when interrupted.
- [ ] Run the targeted test command and verify the new UI-state assertions pass.

### Task 3: Convert both controls into toggles

**Files:**
- Modify: `daily_speaking_practice.html`

- [ ] Change prompt-recording playback so repeated clicks pause and resume the same `Audio` element.
- [ ] Change model-answer playback so repeated clicks pause and resume generated audio, and pause/resume speech synthesis when using fallback voice.
- [ ] Reset the affected control on `ended`, interruption, and playback failure.
- [ ] Run `node test_daily_speaking_practice.mjs` and verify the full suite passes.
