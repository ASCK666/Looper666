# Current state and dependency map

This document describes the **current runtime on `main` after the incremental ownership/dependency moves through PR #44**. It is intentionally descriptive, not aspirational. `TARGET_ARCHITECTURE.md` defines where the project should converge.

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

PR #33 moved the drums-vs-full rerender decision out of Events. PR #35 moved the preview STOP lifecycle beside `playRendered()` in the current combined-render implementation. PR #37 moved the complete drums-only preview-start action there as `playDrumsPreview()`. PR #39 moved the complete NEW DRUMS action, including its while-playing rerender rule, into `drums.js` as `generateNewDrums()`. PR #41 started P2 by changing `renderSequence(events)` to `renderSequence(events, sourceBuffer)` and making the Chopper source buffer explicit at every render call site. PR #44 continued P2 by changing that boundary to `renderSequence(events, sourceBuffer, cueMarkers)` and removing the renderer's implicit reads of Chopper cue positions.

The next source of complexity is no longer primarily handler placement. `renderSequence(events, sourceBuffer, cueMarkers)` still hides sample pitch/gain conditioning, Drum selection and tempo behind globals or DOM reads. The refactor should continue making those dependencies explicit, one simple input at a time, before moving more cross-domain workflows or extracting files.

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

P2 has now started:

- the Chopper source buffer is an explicit `renderSequence()` argument instead of a hidden renderer read;
- Chopper cue-marker positions are an explicit `renderSequence()` argument instead of hidden `markers` reads;
- maintained project checks cover deterministic full rendering, PUNCH rendering, full preview/rerender and SAVE paths with real browser execution.

These changes did **not** relocate feature state out of `core.js`, extract a renderer file, introduce modules or change audio algorithms.

## State inventory

| State family | Declared today | Main writers today | Main readers today | Target owner | Current issue |
|---|---|---|---|---|---|
| `ctx`, `liveBus`, `masterAnalyser`, meter runtime | `core.js` | `core.js`, master-volume UI path | all audio domains | Core | Mostly correct; master-volume state is still mutated directly from Events and its UI/gain refresh is not cleanly owned |
| `deckSource`, `deckBuffer`, `currentTrack`, `deckOutputGain` | `core.js` | `looper.js`, some `events.js` transport handlers | Looper UI, Events | Looper | Feature state physically lives in Core and transport state is still inspected from Events |
| AUTO Looper state and tape counter | `core.js` | `looper.js` | Looper UI, Events | Looper | Feature state physically lives in Core |
| `sampleBuffer`, `sampleName`, `markers`, `transients`, `selectedMarker` | `core.js` | `chopper.js` | Chopper, combined renderer, limited Events readers | Chopper | Behavioral writes are mostly Chopper-owned; `sampleBuffer` and cue positions now reach `renderSequence()` explicitly, but this state is still physically declared in Core |
| sample pitch / volume / condition profile | `core.js` | `chopper.js` | Chopper, combined renderer, Events status/rerender triggers | Chopper | Immediate control transitions are Chopper-owned; physical ownership and renderer reads remain unresolved |
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

The runtime still does not have a single clean dependency direction, but Events no longer owns the combined rerender decision, drums-only preview start, NEW DRUMS while-playing rule or STOP state transition, and the renderer no longer obtains its source audio buffer or cue positions implicitly.

## Observed cross-domain violations

### V1 — Core owns feature state physically

`core.js` declares Looper, Chopper, Drum and Renderer state alongside `AudioContext` infrastructure.

Consequence: a file can appear to depend only on Core while actually depending on another feature's mutable state.

Target: Core keeps only shared infrastructure; state moves gradually to its conceptual owner.

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

Do not continue emptying Events mechanically if the result is only to make `drums.js` a larger god-file. The next changes should remove hidden dependencies rather than merely relocate code.

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

Target: keep the renderer physically in `drums.js` until its inputs are explicit. Do not move full `playCurrentBeat()` merely for symmetry while `renderSequence()` still hides cross-domain dependencies.

### V4 — Drums contains the combined Chopper + Drums renderer

`drums.js::renderSequence(events, sourceBuffer, cueMarkers)` now receives both the Chopper source buffer and cue positions explicitly. It still directly reads or derives other external inputs such as:

- sample pitch through `samplePitchRate()`;
- sample volume/conditioner state;
- tempo from the DOM;
- Drum state through `ensureDrumSelection()`.

The signature is more truthful than before, but still understates several real dependencies and therefore still makes the renderer harder for a human reader to reason about.

Target: Renderer receives explicit inputs from Chopper and Drums rather than reaching into their mutable globals. Introduce these as ordinary function arguments one at a time; do **not** create a `RenderContext`, dependency container, service object or snapshot framework to solve this.

### V5 — Drums reacts to Chopper state

Drum selection still uses `sampleBuffer` to derive density, and renderer/rerender paths query Chopper grid/sample state.

This coupling may be product behavior rather than accidental coupling. It must be preserved, but expressed through explicit inputs/queries instead of shared mutable variables.

### V6 — Script order is part of the API

Classic scripts rely on earlier files having declared functions and state names. There is no import declaration showing those dependencies locally.

Target: first establish small domain APIs while keeping classic scripts. ES modules are not required until ownership is stable.

## What is already reasonably owned

Not every relationship requires movement.

- Looper persistence, folder scanning and beat-library behavior already live in `looper.js`; the main problem is the state they depend on being globally declared and some transport inspection in Events.
- Chopper waveform/marker algorithms and the immediate sample load/volume/pitch transitions live in `chopper.js`.
- Drum library loading, patterns, editing, velocities, CLEAR and NEW DRUMS behavior mostly live in `drums.js`.
- The current combined renderer, its rerender transition, drums-only PLAY and STOP lifecycle live together in `drums.js`; its source audio buffer and cue positions are now explicit inputs.
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

Remaining P1 candidates still exist, notably full `playCurrentBeat()`, master-volume and save/transport workflows. They are **not** automatically the next work. A move that only transfers a cross-domain block into `drums.js` without reducing hidden dependencies should be rejected.

The master-volume guard still applies: do **not** add a setter that merely hides the global assignment.

### P2 — Make Renderer inputs explicit while it still lives in `drums.js`

This is the recommended active phase.

Completed:

1. Chopper source buffer — `renderSequence(events, sourceBuffer)`;
2. Chopper marker/cue positions — `renderSequence(events, sourceBuffer, cueMarkers)`.

Continue through small, ordinary arguments, one dependency at a time. Suggested order:

3. sample pitch rate as one scalar input;
4. sample gain/conditioning inputs, split further if one PR would combine unrelated state;
5. Drum selection;
6. tempo/effects only where doing so removes a real hidden read.

`events`/grid events are already an explicit argument and should stay that way.

Do not introduce a broad render-state object. A longer but truthful function signature is preferable to an opaque context object while the dependency set is still being understood.

Exit condition: the combined renderer no longer reads Chopper mutable globals directly and its call sites make the data flow obvious to a human reader.

### P3 — Extract `renderer.js`

Only after P2.

At that point extraction should be mostly a mechanical ownership move, not a redesign. If extraction does not make the code easier to follow, it remains optional.

### P4 — Move physical state declarations out of Core

After public domain boundaries exist, group state with its owner.

Do not move dozens of globals first: doing so before boundaries exist would mostly relocate the same coupling.

Suggested order:

1. Drum library/edit state;
2. Chopper sample/edit state;
3. Looper deck/AUTO state;
4. Renderer preview state.

### P5 — Reassess classic scripts versus ES modules

Only after P1–P4. If the remaining dependencies are already obvious through small public APIs, ES modules may be optional.

## Architectural metrics to track

Do not optimize line count. Track these instead:

- number of product-state writes performed by `events.js`;
- number of complete feature workflows implemented by `events.js` instead of delegated through one public call;
- number of Chopper mutable globals read directly by the combined renderer;
- number of feature-state variables physically declared in `core.js`;
- number of direct cross-domain mutations;
- number of runtime files whose correctness depends on undocumented load order.

Each architecture PR should make at least one of these counts go down and none go up without explicit justification.

A useful human-readability test is also required: after a PR, a reader should be able to explain the changed data flow from the function signature and nearby calls without first searching the whole repository for hidden globals.

## Current recommended runtime boundary

**Make the sample pitch rate one explicit scalar argument of `renderSequence()` while the renderer remains in `drums.js`.**

Today `renderSequence(events, sourceBuffer, cueMarkers)` still calls `samplePitchRate()` internally even though playback rate directly controls sample timing and pitch inside the render. Passing the already-derived rate makes that dependency visible without exposing broader Chopper state.

The step must remain narrow:

- extend `renderSequence()` with one plain numeric pitch-rate argument;
- use that argument for `AudioBufferSourceNode.playbackRate` and the existing audible-duration calculation;
- update every runtime and direct-test call site explicitly, preserving current behavior;
- do **not** combine sample gain or conditioning state into the same PR;
- leave Drum selection, tempo and effects for later PRs;
- no `RenderContext`, config/service object or dependency container;
- no full `playCurrentBeat()` ownership move;
- no new runtime file;
- no state relocation;
- no visual or audio algorithm change;
- existing pitch-rerender, full-render and direct-render regressions must remain green;
- full `Project checks` green before merge.

This continues the deliberate P2 strategy: make one hidden data dependency visible at a time, with ordinary JavaScript arguments that a human reader can follow locally.
