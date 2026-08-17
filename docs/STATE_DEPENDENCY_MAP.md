# Current state and dependency map

This document describes the **current runtime on `main`**. The proactive ownership/dependency migration stabilized after PR #46; later feature and UI work is reflected here only when it changes a listed writer, dependency or ownership fact. It is intentionally descriptive, not aspirational. `TARGET_ARCHITECTURE.md` defines where the project should converge.

The map should be refreshed when a completed architecture step makes a listed writer, dependency or priority materially false. Documentation updates must remain separate from runtime ownership changes.

## Current script topology

`index.html` loads classic scripts in this order:

```text
bootstrap.js
   ↓
core.js
   ↓
looper.js
   ↓
practice.js
   ↓
chopper.js
   ↓
drums.js
   ↓
events.js
```

The arrows above are load-order dependencies, not clean module boundaries. Later files can implicitly read and write names declared by earlier files.

## Main finding

`core.js` still acts as both shared audio infrastructure **and** the physical declaration site for state owned conceptually by Looper, Chopper, Drums and the combined renderer.

This still produces two different notions of ownership:

- **physical declaration ownership:** mostly `core.js`;
- **behavioral ownership:** increasingly concentrated in `looper.js`, `chopper.js` and `drums.js`.

PR #33 moved the drums-vs-full rerender decision out of Events. PR #35 moved the preview STOP lifecycle beside `playRendered()` in the current combined-render implementation. PR #37 moved the complete drums-only preview-start action there as `playDrumsPreview()`. PR #39 moved the complete NEW DRUMS action, including its while-playing rerender rule, into `drums.js` as `generateNewDrums()`. PR #41 started P2 by changing `renderSequence(events)` to `renderSequence(events, sourceBuffer)` and making the Chopper source buffer explicit at every render call site. PR #44 continued P2 by adding explicit Chopper cue positions. PR #46 added the sample pitch rate as a plain scalar input, so the renderer no longer derives pitch from Chopper state internally.

The next source of complexity is no longer primarily handler placement. `renderSequence(events, sourceBuffer, cueMarkers, pitchRate)` still hides sample gain/conditioning, Drum selection and tempo behind globals or DOM reads. Those remaining dependencies are real, but the project is expected to keep changing. Broad architecture cleanup is therefore **paused after this stabilization point** rather than turning the renderer signature into a checklist of every current global read.

## Progress since the first inventory

The following P1 ownership moves are complete on `main`:

- sample loading is delegated by Events to `loadChopperSample()`;
- clearing Drum edits is delegated by Events to `clearDrumEdits()`;
- immediate sample-volume state/readout/live-audition gain handling is delegated to `updateSampleVolume()`;
- immediate sample-pitch state/audition/UI/waveform handling is delegated to `updateSamplePitch()`;
- combined-preview rerender mode selection and replay are delegated to `rerenderPreviewMode()` in the current renderer implementation;
- Drum edit rerenders reuse that same preview transition instead of duplicating the drums/full decision;
- preview STOP source/transport/mode/playhead cleanup is delegated to `stopCurrentBeat()` in the current renderer implementation;
- drums-only preview start is delegated to `playDrumsPreview()`, including audition stop, Drum selection, render, Renderer state/status and playback;
- NEW DRUMS is delegated to `generateNewDrums()`, including audition stop, selection regeneration and while-playing rerender in the previous preview mode.

P2 stabilization completed:

- the Chopper source buffer is an explicit `renderSequence()` argument instead of a hidden renderer read;
- Chopper cue-marker positions are explicit instead of hidden `markers` reads;
- sample pitch rate is an explicit scalar instead of an internal `samplePitchRate()` lookup;
- maintained project checks cover deterministic full rendering, PUNCH rendering, pitch rerender, full preview/rerender and SAVE paths with real browser execution.

These changes did **not** relocate feature state out of `core.js`, extract a renderer file, introduce modules or change audio algorithms.

## State inventory

| State family | Declared today | Main writers today | Main readers today | Target owner | Current issue |
|---|---|---|---|---|---|
| `ctx`, `liveBus`, `masterAnalyser`, meter runtime | `core.js` | `core.js`, master-volume UI path | all audio domains | Core | Mostly correct; master-volume state is still mutated directly from Events and its UI/gain refresh is not cleanly owned |
| `deckSource`, `deckBuffer`, `currentTrack`, `deckOutputGain` | `core.js` | `looper.js`, some `events.js` transport handlers | Looper UI, Events | Looper | Feature state physically lives in Core and transport state is still inspected from Events |
| AUTO Looper state and tape counter | `core.js` | `looper.js` | Looper UI, Events | Looper | Feature state physically lives in Core |
| `sampleBuffer`, `sampleName`, `markers`, `transients`, `selectedMarker` | `core.js` | `chopper.js` | Chopper, combined renderer, limited Events readers | Chopper | Behavioral writes are mostly Chopper-owned; `sampleBuffer` and cue positions reach `renderSequence()` explicitly, but this state is still physically declared in Core |
| sample pitch / volume / condition profile | `core.js` | `chopper.js` | Chopper, combined renderer, Events status/rerender triggers | Chopper | Pitch rate is explicit at the render boundary; sample gain/conditioning and physical ownership remain unresolved |
| chop audition/playhead state | `core.js` | `chopper.js` | Chopper, renderer play/stop lifecycle | Chopper | Physical ownership mismatch remains; renderer interacts with playhead behavior during preview start/stop |
| `loopGridEvents` | `core.js` | Chopper grid logic | Chopper, combined renderer, limited Events workflows | Chopper | Render events are passed explicitly to `renderSequence()`, but some renderer/rerender orchestration still obtains them through Chopper helpers |
| drum folder handles / entries / files / decode cache | `core.js` | `drums.js` | Drums | Drums | Physical ownership mismatch only |
| `currentDrumSelection`, generation number, velocities/edit state | `core.js` | `drums.js` | Drums, combined renderer | Drums | CLEAR, drums-only PLAY and NEW DRUMS transitions are behaviorally owned in Drums/current renderer; physical ownership mismatch and renderer-internal selection lookup remain |
| `renderedFlip`, `flipSource`, `lastPreviewMode`, `isLoopPlaying`, loop playhead state | `core.js` | mainly `drums.js`, with remaining `events.js` full-preview/invalidation/save paths | Events, Chopper/Drums UI paths | Renderer | Rerender, drums-only PLAY and STOP are renderer-owned; full-preview start and a few invalidation/save writes are still split with Events |
| Practice drill state | `practice.js` | `practice.js` | Events through Practice functions | Practice | Keep frozen during architecture work |

## Current dependency graph

```text
                         ┌─────────────┐
                         │  core.js    │
                         │ audio +     │
                         │ shared      │
                         │ feature     │
                         │ globals     │
                         └──────┬──────┘
                ┌───────────────┼────────────────┐
                │               │                │
          ┌─────▼─────┐   ┌────▼──────┐   ┌────▼─────┐
          │ looper.js │   │chopper.js │   │ drums.js │
          └─────┬─────┘   └────┬──────┘   │ + NEW   │
                │               │          │ DRUMS   │
                │               └──────┬───┴─────────┘
                │                      │
                │              combined renderer
                │              currently in drums.js
                │              + rerenderPreviewMode()
                │              + playDrumsPreview()
                │              + stopCurrentBeat()
                │              + explicit sourceBuffer
                │              + explicit cueMarkers
                │              + explicit pitchRate
                │                      │
                └──────────────┬───────┘
                               ▼
                         ┌───────────┐
                         │ events.js │
                         │ wiring +  │
                         │ remaining │
                         │ full PLAY │
                         │ /save/UI  │
                         └───────────┘
```

The runtime still does not have a single clean dependency direction, but Events no longer owns the combined rerender decision, drums-only preview start, NEW DRUMS while-playing rule or STOP state transition, and the renderer no longer obtains its source audio buffer, cue positions or pitch rate implicitly.

## Observed cross-domain violations

### V1 — Core owns feature state physically

`core.js` declares Looper, Chopper, Drum and Renderer state alongside `AudioContext` infrastructure.

Consequence: a file can appear to depend only on Core while actually depending on another feature's mutable state.

Target: Core keeps only shared infrastructure; state moves gradually to its conceptual owner when feature work makes that movement valuable.

### V2 — Events still contains feature/control orchestration

Events no longer performs the Chopper sample-load, immediate volume, immediate pitch, Drum-clear, NEW DRUMS, combined rerender, drums-only PLAY or preview STOP state transitions.

Remaining violations include:

- direct mutation of `masterVolumePercent`;
- direct inspection of playback/preview state such as `isLoopPlaying`, `lastPreviewMode` and `sampleBuffer` in several handlers;
- the cross-domain full-preview `playCurrentBeat()` workflow;
- save/render flows that still know Renderer and Looper internals;
- remaining renderer-state writes such as full-preview mode/buffer assignment, PUNCH invalidation and saved-render assignment;
- status/error presentation coupled to those workflows.

Target: Events should translate a DOM input to one public domain/renderer call and own no product state or business transition.

Do not continue emptying Events mechanically if the result is only to make `drums.js` a larger god-file. Revisit a remaining workflow when product work actually touches it or when a complete responsibility can disappear without adding a new layer.

### V3 — Combined-preview lifecycle is only partially renderer-owned

The previous violation was broader: Events implemented rerender decisions, drums-only preview start and STOP state cleanup. Those parts are now fixed.

Current state:

- `drums.js::rerenderPreviewMode()` owns the drums-vs-full rerender decision, `renderedFlip` replacement, `lastPreviewMode` update and replay for rerenders;
- `rerenderAfterDrumEdit()` delegates to that same operation;
- `drums.js::playDrumsPreview()` owns the complete drums-only preview start, including chop-audition stop, Drum selection, rendering, mode/status update and playback;
- `drums.js::generateNewDrums()` owns Drum regeneration plus the while-playing request to rerender the previous preview mode;
- `drums.js::stopCurrentBeat()` owns active preview-source shutdown plus transport/mode/playhead cleanup;
- Events still implements full `playCurrentBeat()`, including grid collection, full rendering, preview buffer/mode assignment, status and playback;
- some Events handlers still inspect renderer state before deciding whether to request a rerender or invalidate a rendered preview.

Target: do not move full `playCurrentBeat()` merely for symmetry. Revisit it only when renderer ownership is needed by feature work or when the move removes more coupling than it adds.

### V4 — Drums contains the combined Chopper + Drums renderer

`drums.js::renderSequence(events, sourceBuffer, cueMarkers, pitchRate)` now receives the Chopper source buffer, cue positions and pitch rate explicitly. It still directly reads or derives other external inputs such as:

- sample gain and conditioning state;
- tempo from the DOM;
- Drum state through `ensureDrumSelection()`.

Those reads remain debt, but making every one an argument now would lengthen the call sites before the product boundaries have stabilized. `sampleGain` was specifically reassessed after PR #46 and deferred: adding a fifth scalar argument would expose one read while leaving the conditioner profile implicit, so it does not currently close a meaningful boundary.

Target: when a future feature touches one of these inputs, prefer a small explicit value/query if it makes the local data flow clearer. Do **not** create a `RenderContext`, dependency container, service object or snapshot framework to solve the whole set at once.

### V5 — Drums reacts to Chopper state

Drum selection still uses `sampleBuffer` to derive density, and renderer/rerender paths query Chopper grid/sample state.

This coupling may be product behavior rather than accidental coupling. It must be preserved. Make it explicit only when changing the affected behavior, rather than pre-emptively moving state around.

### V6 — Script order is part of the API

Classic scripts rely on earlier files having declared functions and state names. There is no import declaration showing those dependencies locally.

Target: keep classic scripts during active product evolution. ES modules are not required unless later ownership changes make imports materially clearer.

## What is already reasonably owned

Not every relationship requires movement.

- Looper persistence, folder scanning and beat-library behavior already live in `looper.js`; the main problem is the state they depend on being globally declared and some transport inspection in Events.
- Chopper waveform/marker algorithms and the immediate sample load/volume/pitch transitions live in `chopper.js`.
- Drum library loading, patterns, editing, velocities, CLEAR and NEW DRUMS behavior mostly live in `drums.js`; Drum-local feedback writes to `#drumStatus` rather than the Chopper/combined status sink.
- The current combined renderer, its rerender transition, drums-only PLAY and STOP lifecycle live together in `drums.js`; its source audio buffer, cue positions and pitch rate are explicit inputs.
- Practice is isolated enough to remain frozen.

The migration should **not** split files simply to make the tree look more architectural.

## Priority order derived from the graph

### P1 — Remove complete domain workflows from `events.js` when ownership is obvious

Completed:

1. Chopper sample-load workflow;
2. Drum CLEAR transition;
3. Chopper immediate sample-volume transition;
4. Chopper immediate sample-pitch transition;
5. combined-preview rerender transition;
6. preview STOP lifecycle;
7. drums-only preview-start lifecycle;
8. NEW DRUMS while-playing lifecycle.

Remaining P1 candidates still exist, notably full `playCurrentBeat()`, master-volume and save/transport workflows. They are **deferred**, not queued. A move that only transfers a cross-domain block into `drums.js` without reducing hidden dependencies should be rejected.

The master-volume guard still applies: do **not** add a setter that merely hides the global assignment.

### P2 — Renderer input stabilization

Completed:

1. Chopper source buffer — `renderSequence(events, sourceBuffer)`;
2. Chopper marker/cue positions — `renderSequence(events, sourceBuffer, cueMarkers)`;
3. sample pitch rate — `renderSequence(events, sourceBuffer, cueMarkers, pitchRate)`.

The broad P2 checklist is now **paused**. Remaining candidates are known but not automatically scheduled:

- sample gain / conditioner profile;
- Drum selection;
- tempo and effects/DOM reads.

`events`/grid events are already an explicit argument and should stay that way.

Do not introduce a broad render-state object. A longer truthful signature can be useful, but only while each added argument removes enough hidden coupling to justify the extra plumbing. PR #46 is the current stopping point for proactive renderer cleanup.

### P3 — Extract `renderer.js`

Deferred while the product is changing.

Extraction should happen only if later feature work makes the combined renderer easier to understand as a separate file. It must not be used as a mechanism to hide unresolved globals.

### P4 — Move physical state declarations out of Core

Deferred while the product is changing.

Do not move dozens of globals just to improve the tree. Move a state family when a feature needs a stable public boundary or when the current declaration site materially obstructs change.

### P5 — Reassess classic scripts versus ES modules

Deferred. If later dependencies are already obvious through small public APIs, ES modules may remain unnecessary.

## Architectural metrics to track

Do not optimize line count. Track these instead:

- number of product-state writes performed by `events.js`;
- number of complete feature workflows implemented by `events.js` instead of delegated through one public call;
- number of Chopper mutable globals read directly by the combined renderer;
- number of feature-state variables physically declared in `core.js`;
- number of direct cross-domain mutations;
- number of runtime files whose correctness depends on undocumented load order.

A future architecture change should make at least one of these counts go down and none go up without explicit justification.

Use the human-readability gate before accepting a cleanup: a reader should be able to explain the changed data flow from the function signature and nearby calls without first searching the whole repository, and the new plumbing must be simpler than the hidden relationship it replaces.

## Current recommended runtime boundary

**Freeze broad architecture cleanup after PR #46 and resume it only from feature-driven pressure.**

The renderer now receives the most important Chopper render inputs that were cheap and clear to expose: source audio, cue positions and pitch rate. The remaining hidden inputs are documented, but proactively threading all of them through every call site would start increasing local plumbing before their ownership has stabilized.

For upcoming product work:

- if a feature changes sample gain/conditioning, reassess that boundary then;
- if a feature changes Drum generation/render selection, make the selection dependency explicit only as needed;
- if tempo/effects become a development pain point, remove the relevant DOM/global read in a narrow PR;
- if a feature touches a remaining Events workflow, move one complete responsibility only when ownership is obvious;
- keep `renderer.js` extraction, Core state relocation and ES modules off the proactive roadmap.

This is the stabilization endpoint, not a claim that the architecture is final. The project should now evolve with **boy-scout cleanup around the feature being changed**, rather than continuing a predetermined refactor checklist.