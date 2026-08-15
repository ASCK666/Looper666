# Scratch Practice V91 — code ownership

Scratch Practice is a local Looper + Chopper. It is split by responsibility so visual changes do not require touching the deterministic Web Audio engine. It contains no remote application calls, model integration or generated-content subsystem.

## Reading order for a new maintainer

1. Read `index.html` to understand the three visible work areas.
2. Read `js/core.js` for shared Web Audio state and dependency-free helpers.
3. Read the feature file being changed: `looper.js`, `chopper.js` or `drums.js`.
4. Read `js/events.js` last: it wires the DOM to the feature functions but must
   not become a second implementation layer.
5. Run `python3 tools/test_all.py` before and after every small change.

## Runtime files

- `index.html` — application structure only
- `css/base.css` — generated production CSS; never hand-edit
- `js/bootstrap.js` — boot diagnostics / uncaught-error capture
- `js/core.js` — shared audio state, meters, WAV helpers, transient detection
- `js/looper.js` — beat library, IndexedDB fallback, local folder connection, cassette transport
- `js/practice.js` — legacy Practice implementation; frozen pending redesign
- `js/chopper.js` — sample import, conditioner, waveform, markers, pads and placement grid
- `js/drums.js` — grooves, local drum libraries, velocity, PUNCH and render engine
- `js/events.js` — UI bindings and application startup

V91 keeps classic scripts because their shared Web Audio state is intentionally
loaded in a fixed order. New behavior should stay in its owning file; avoid
adding another global compatibility layer.

## Current dependency direction

The intended direction is `events.js -> feature -> core.js`. The application is
not there yet, so V91 documents the remaining exceptions instead of hiding them:

- `drums.js` still contains `renderSequence()` and `playRendered()`, which render
  the complete Chopper + Drums loop.
- Chopper export reaches `saveBlobToBeatDirectory()` in `looper.js` through the
  event wiring.
- Several audio-state variables remain shared globals created by `core.js`.

`refreshCassetteUI()` is the first corrected boundary: it now lives in
`looper.js`, beside the deck state it displays. Its public name is unchanged so
the move has no effect on callers or classic-script loading.

## Progressive migration contract

- Move one responsibility at a time; never combine an ownership move with a
  visual redesign or audio-algorithm change.
- Keep the existing function name and behavior during a move.
- Add a focused regression invariant for every new ownership boundary.
- Keep direct `index.html` opening functional while classic scripts remain.
- Introduce ES modules only after the engines have explicit inputs and outputs;
  that later step will make the local HTTP server the supported development path.
- Prefer a small number of cohesive files. Split a file only when the extracted
  responsibility has an independent contract and independent tests.

## Next safe ownership moves

1. Move the shared master-volume view out of `chopper.js` without changing its
   audio graph.
2. Isolate Looper persistence behind a small storage contract while keeping the
   current in-memory fallback.
3. Extract the complete-loop renderer from `drums.js` only after its current
   Chopper and Drum inputs have dedicated tests.
4. Reduce `events.js` to startup and event wiring.

## CSS source architecture

Human edits belong in `css/src/`:

- `tokens.css`
- `base.css`
- `layout.css`
- `looper.css`
- `chopper.css`
- `drums.css`
- `practice.css` (frozen)
- `responsive.css`
- `utilities.css`
- `shared.css`

`tools/build_css.py` builds the single `css/base.css` file from these sources.

## Regression rules

1. Never move file-library JavaScript as part of a CSS refactor.
2. LOOPER must retain import, folder connection and PREV/PLAY/STOP/NEXT/AUTO behavior.
3. CHOPPER must retain sample import, 16 pads and the 16×16 placement matrix.
4. DRUMS must retain KICK/SNARE/HI-HAT folder selectors and fallback inputs.
5. Do not add BPM detection to imported Looper beats.
6. Practice CSS/JS stays unchanged until its planned rebuild.
7. Do not add a new override stylesheet; fix the owning CSS source.
8. Keep product identity and runtime free of remote model dependencies.
9. Run `python tools/test_all.py` before packaging.
10. Keep `tests/js_health.py`, `tests/core_unit.js`, `tests/assets_health.py` and
    `tests/audio_assets.py` green when removing or relocating runtime code.

## Persistence and permissions

If IndexedDB is unavailable, imported beats fall back to memory for the current tab. Folder connection asks for read access; write access is requested only when SAVE BEAT needs it.
