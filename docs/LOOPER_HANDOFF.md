# Looper handoff — current state, next steps, and hard limits

This document is the handoff reference for continuing the Looper UI work safely.

## 1. Current working state

- Repository: `ASCK666/Looper666`
- Current work branch: `fix/html-transparent-readouts`
- Current PR: `#82` — **Make Looper digital HTML readouts transparent**
- PR base: `fix/surgical-faceplate-digital-cleanup`
- The PR must remain unmerged until the visual result has been manually inspected and explicitly approved.
- The current PR is intentionally narrow. Before this handoff file was added, its only runtime file change was:
  - `assets/looper-ui/overlay.css`

### Current visual state

The six dynamic digital readouts use transparent HTML backgrounds so the cleaned panel material from the faceplate remains visible:

- `.asset-header-state-readout`
- `.asset-track-readout`
- `.asset-state-readout`
- `.asset-speed-percent-readout`
- `.asset-loop-readout`
- `.asset-speed-level-readout`

The cassette title is still rendered dynamically by HTML on top of the cassette label area. Because the baked cassette title still exists in the frozen faceplate, the HTML label currently uses a tightly bounded local background treatment to cover it.

A browser render has already confirmed that the six digital readouts no longer create black HTML plates. The cassette label treatment still deserves final visual judgment because any mismatch reads as a beige patch.

## 2. Absolute source of truth

The only production visual source of truth for the Looper is:

`assets/looper-ui/faceplate.webp`

Current production geometry:

- width: `1536 px`
- height: `1024 px`

The asset-editing rules are documented separately in:

`assets/looper-ui/ASSET_EDITING.md`

Read that file before any future asset operation.

## 3. HARD LIMIT: the faceplate is frozen

**Do not modify `assets/looper-ui/faceplate.webp` during the current HTML cleanup or cassette-animation steps.**

This means:

- do not regenerate it;
- do not inpaint it;
- do not clone or repaint any region;
- do not recolor it;
- do not change glass, plastic, labels, lighting, buttons, cassette, screws, Beat Crate, or chassis details;
- do not re-encode it “just to optimize” it;
- do not resize, crop, rotate, stretch, or change its canvas;
- do not replace it with an older Looper asset;
- do not silently swap in a generated approximation.

If a future task explicitly authorizes another asset edit, that must be treated as a separate task and must follow `ASSET_EDITING.md` exactly. Until then, the faceplate is read-only.

## 4. HARD LIMIT: do not use retired Looper artwork as the visual base

Older split/decorative Looper artwork must not become the production source of truth again.

In particular, do not rebuild the UI from retired deck/cassette assets or use them as a substitute for `faceplate.webp`.

The current architecture is:

1. fixed `faceplate.webp` underneath;
2. real HTML controls positioned over it;
3. dynamic HTML text/readouts over the appropriate baked panels;
4. future moving cassette parts as a separate transparent overlay asset.

## 5. HARD LIMIT: no automatic merge

Never merge a Looper visual PR automatically.

Required sequence:

1. small scoped change;
2. run checks;
3. produce a browser screenshot when appearance changes;
4. manually inspect the screenshot;
5. report the result;
6. merge only after explicit approval.

Do not force-reset `main`. Do not use force pushes to rewrite accepted Looper work. Do not collapse multiple visual stages into one unreviewed change.

## 6. Current step — finish HTML cleanup

### Goal

Finish the dynamic HTML layer without touching the frozen asset.

### Already done

The six digital deck readouts have `background: transparent` and render glyphs only.

### Remaining item

The cassette title overlay must visually merge with the actual cassette label area.

Current selector:

`.asset-cassette-label-readout`

Constraints for this selector:

- keep the title dynamic;
- text remains dark/black enough to look printed on the label;
- keep the overlay tightly bounded to the baked title area;
- do not create a large rectangular plate;
- do not cover cassette edges, reels, plastic, window, glass, or unrelated details;
- do not “solve” the mismatch by modifying `faceplate.webp`;
- avoid changing unrelated Looper CSS while tuning this one treatment.

### Completion criteria for HTML cleanup

The step is complete only when:

- all six digital readout backgrounds are transparent;
- their dynamic values remain legible and correctly aligned;
- the cassette title is legible and its local cover does not read as a pasted rectangle at normal browser size;
- the real transport/import controls remain clickable;
- the faceplate still loads as one `1536x1024` image;
- no unrelated layout has moved;
- a browser screenshot has been manually inspected.

## 7. Browser verification protocol

Green CI is not sufficient for visual approval.

For every appearance-changing Looper step:

1. open the real application in Chromium/Chrome through the existing browser test environment;
2. wait for `window.__SP.ready === true`;
3. verify `.looper-faceplate` loaded with `naturalWidth === 1536`;
4. capture the full `#looper` element at a desktop viewport;
5. inspect the PNG manually, not just via assertions;
6. check at least the readouts, cassette, transport row, Beat Crate and page controls for displacement or opaque masks.

Temporary render workflows are allowed only when necessary to obtain a screenshot, but they must be removed afterward so they do not remain in the final PR diff.

### Known browser-smoke issue at this handoff

`tests/browser_smoke.py` has recently timed out while waiting for the imported test WAV to update `#cassetteBeatName` to `test-beat.wav`.

Important:

- this timeout appeared independently of the transparent-readout CSS change;
- do not weaken, skip, delete, or falsely mark the test as passing just to get a green check;
- diagnose it separately if it persists;
- layout/CSS checks that run before that timeout have been passing.

## 8. Next step after HTML cleanup — cassette animation

Do not begin this until the HTML cleanup screenshot is accepted.

### Required architecture

The base faceplate stays static and frozen.

Create a **separate transparent moving-parts asset/layer** for only the cassette elements that need motion.

The animation layer must:

- align exactly over the cassette in `faceplate.webp`;
- contain only moving parts needed for the effect;
- not recreate or replace the entire cassette/deck;
- preserve the fixed cassette body from `faceplate.webp`;
- remain visually invisible outside the intended moving regions.

### Runtime behavior

- animation starts only when the real deck state is `PLAYING`;
- animation stops immediately when playback stops;
- STOP must leave the overlay in a stable, non-animated state;
- changing/unloading a beat must not leave animation running;
- visual animation state must reflect the actual audio/transport state, not invent its own state machine.

### Validation

Verify in browser:

- PLAY starts both audio and cassette animation;
- STOP stops both;
- repeated PLAY/STOP does not duplicate animation nodes/timers;
- resizing does not break cassette alignment;
- no visual drift occurs over the frozen faceplate.

Keep this work on its own branch/PR stacked after the accepted HTML cleanup branch.

## 9. Later step — dynamic button backlighting

This is deliberately postponed.

Reason: the current button glow/backlighting is baked into `faceplate.webp`.

Do not attempt dynamic backlighting during HTML cleanup or cassette animation.

When this work is eventually authorized, first design the migration separately. Likely requirements will include:

- deciding which baked glows must be neutralized in a future explicitly authorized asset edit;
- recreating button illumination as runtime overlays;
- low illumination for inactive buttons;
- strong illumination for active buttons;
- PLAY pulsing when playback is available but not active.

No baked-light changes are authorized by this handoff document.

## 10. Scope discipline for every future change

Before editing anything, write down:

- exact goal;
- exact files allowed to change;
- exact selectors/functions/assets allowed to change;
- what must remain untouched;
- how the result will be visually verified.

During implementation:

- make the smallest possible diff;
- one visual purpose per commit when practical;
- do not opportunistically “clean up” unrelated code;
- do not introduce a second visual architecture;
- do not change audio behavior to solve a CSS problem;
- do not change asset pixels to solve an HTML problem;
- do not hide a failing functional test to obtain green CI.

After implementation:

- inspect the diff;
- confirm no unexpected files changed;
- run tests;
- capture and inspect the browser result;
- stop before merge and request/await approval.

## 11. Branching order from here

Recommended stacked sequence:

1. `fix/surgical-faceplate-digital-cleanup` — frozen asset base;
2. `fix/html-transparent-readouts` — current HTML cleanup;
3. new branch from the accepted HTML-cleanup head for cassette animation;
4. separate future branch for backlighting work if/when authorized.

Do not mix the later stages into PR #82.

## 12. Short handoff checklist

Before continuing, verify all of the following:

- [ ] I have read this file.
- [ ] I have read `assets/looper-ui/ASSET_EDITING.md`.
- [ ] I will not modify `faceplate.webp` unless a new explicit authorization is given.
- [ ] I will not use retired Looper artwork as the new visual base.
- [ ] I will keep the current change scoped to HTML/CSS until HTML cleanup is accepted.
- [ ] I will manually inspect a browser screenshot after visual changes.
- [ ] I will not merge automatically.
- [ ] I will not force-reset `main` or rewrite accepted work.
- [ ] I will isolate cassette animation in a later branch/PR.
- [ ] I will leave dynamic backlighting for its explicitly approved future step.

If any requested change conflicts with these limits, stop and get explicit approval before proceeding.
