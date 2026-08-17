# Scratch Practice — current code ownership

Scratch Practice is a local-first Looper + Chopper/Drum workstation built with
vanilla HTML, CSS and JavaScript. The runtime deliberately stays small: classic
scripts, Web Audio, local browser storage/file APIs and no application server.

This file is the maintainer orientation guide. For the detailed **current** state
and dependency graph, read `STATE_DEPENDENCY_MAP.md`. For the desired direction,
read `TARGET_ARCHITECTURE.md`. Do not duplicate a refactor roadmap here.

## Reading order for a maintainer

1. Read `index.html` for the visible workstation structure and runtime load order.
2. Read `js/core.js` for shared Web Audio infrastructure and generic helpers.
3. Read the feature file being changed: `looper.js`, `chopper.js` or `drums.js`.
4. Read `js/events.js` last. It wires DOM events and still contains a few documented
   cross-domain workflows, but it must not become a second implementation layer.
5. Read `STATE_DEPENDENCY_MAP.md` before changing ownership or shared state.
6. Run `python3 tools/test_all.py` before and after a small change.

## Runtime files

The browser loads classic scripts in this order:

```text
bootstrap.js -> core.js -> looper.js -> practice.js -> chopper.js -> drums.js -> events.js
```

- `index.html` — application structure and explicit runtime manifest
- `css/base.css` — maintained primary runtime stylesheet
- `css/clean-ui.css` — maintained late cascade for the intentional lean workstation UI
- `js/bootstrap.js` — boot diagnostics and retirement of stale app caches/workers
- `js/core.js` — shared audio infrastructure, meter primitives, WAV helpers and generic utilities
- `js/looper.js` — Beat Crate, imports, persistence and cassette transport
- `js/practice.js` — frozen Practice implementation
- `js/chopper.js` — sample import/conditioning, waveform, markers, pads and placement grid
- `js/drums.js` — Drum folders/selections, patterns, edits, effects and the current combined renderer
- `js/events.js` — DOM wiring plus the remaining explicitly documented cross-domain workflows

Classic-script order is still part of the runtime contract. Do not add a compatibility
layer to hide that fact. If ownership work later makes imports materially clearer,
reassess modules then; they are not a proactive goal.

## Current ownership boundary

The intended direction is `events -> feature/renderer -> core`, but the current
runtime is intentionally stabilized rather than being mechanically refactored to
match the target diagram.

Important current facts:

- `core.js` still physically declares several feature-state families; this is known debt.
- `drums.js` currently contains the combined Chopper + Drums renderer.
- renderer source buffer, cue markers and sample pitch rate are explicit inputs;
  other hidden inputs are documented in `STATE_DEPENDENCY_MAP.md` and are deferred
  until feature work makes a narrow boundary worth changing.
- `events.js` still owns some full-preview, save and master-volume orchestration;
  those are documented exceptions, not invitations for a broad cleanup.
- Drum-local feedback writes to `#drumStatus`; `drums.js` must not use the
  Chopper/combined `#chopStatus` sink.
- Practice remains frozen unless a Practice change is explicitly requested.

The active rule is boy-scout cleanup around the feature being changed: remove a
complete obsolete responsibility or a hidden dependency only when the resulting
flow is simpler for a human reader.

## CSS ownership

There is **no CSS generator pipeline**. The two deployed stylesheets are maintained
directly and loaded in this order:

```text
css/base.css
css/clean-ui.css
```

`base.css` is the primary component/layout stylesheet. `clean-ui.css` is the
existing, intentionally late lean-UI layer. Do not create a third override/theme
stylesheet. When replacing a rule or component path, remove the retired declaration
in the same change and verify the full cascade with the CSS health/redundancy tests.

See `CSS_WORKFLOW.md` for the edit/test contract.

## Change contract

- Move or remove one complete responsibility at a time.
- Do not combine an ownership move with an audio-algorithm change.
- Do not create setters, service objects, contexts or wrappers that only hide a global.
- Do not split files merely to make the tree look more architectural.
- When a mechanism is replaced, delete the old listener/helper/selector/path in the same change.
- Keep the three hidden Drum folder file inputs: they are the real fallback when
  `showDirectoryPicker()` is unavailable, not duplicate UI.
- Keep the header master gain/meter. The retired lower vertical master display must not return.
- Add or update a focused regression invariant when a responsibility boundary changes.

## Regression gate

Run:

```bash
python3 tools/test_all.py
```

The maintained suite checks runtime/dead-code contracts, JS health, deterministic
audio behavior, the full CSS cascade, responsive layout, Chopper/Drum UI, master/PUNCH,
HTTP serving and Chromium interactions. GitHub Actions runs the same suite on pull
requests and pushes to `main`.

## Persistence and permissions

Imported beats use IndexedDB when available and fall back to memory for the current
tab when it is not. Folder access is user initiated. Beat-folder write permission is
requested only when SAVE needs it. Drum folder handles/files remain local to the browser.
