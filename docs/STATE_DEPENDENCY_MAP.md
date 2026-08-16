# Current state and dependency map

This document describes the **current runtime on `main` after the first incremental ownership moves**. It is intentionally descriptive, not aspirational. `TARGET_ARCHITECTURE.md` defines where the project should converge.

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
- **behavioral ownership:** increasingly concentrated in `looper.js`, `chopper.js` and `drums.js`, but combined-preview behavior still leaks into `events.js`.

The refactor should make those two notions converge without changing behavior.

## Progress since the first inventory

The following P1 ownership moves are now complete on `main`:

- sample loading is delegated by Events to `loadChopperSample()`;
- clearing Drum edits is delegated by Events to `clearDrumEdits()`;
- immediate sample-volume state/readout/live-audition gain handling is delegated to `updateSampleVolume()`;
- immediate sample-pitch state/audition/UI/waveform handling is delegated to `updateSamplePitch()`;
- the maintained project checks now run in GitHub Actions and include browser coverage for the Chopper volume/pitch paths.

These changes did **not** relocate feature state out of `core.js`, extract a renderer file, introduce modules or change audio algorithms. They only reduced feature knowledge and direct state transitions in `events.js`.

## State inventory

| State family | Declared today | Main writers today | Main readers today | Target owner | Current issue |
|---|---|---|---|---|---|
| `ctx`, `liveBus`, `masterAnalyser`, meter runtime | `core.js` | `core.js`, master-volume UI path | all audio domains | Core | Mostly correct; master-volume state is still mutated directly from Events and its UI/gain refresh is not cleanly owned |
| `deckSource`, `deckBuffer`, `currentTrack`, `deckOutputGain` | `core.js` | `looper.js`, some `events.js` transport handlers | Looper UI, Events | Looper | Feature state physically lives in Core and transport state is still inspected from Events |
| AUTO Looper state and tape counter | `core.js` | `looper.js` | Looper UI, Events | Looper | Feature state physically lives in Core |
| `sampleBuffer`, `sampleName`, `markers`, `transients`, `selectedMarker` | `core.js` | `chopper.js` | Chopper, combined renderer, Events readers | Chopper | Behavioral writes are now mostly Chopper-owned, but state is still declared in Core and renderer reads mutable Chopper state implicitly |
| sample pitch / volume / condition profile | `core.js` | `chopper.js` | Chopper, combined renderer, Events rerender/status paths | Chopper | Immediate control transitions are Chopper-owned; physical ownership and renderer reads remain unresolved |
| chop audition/playhead state | `core.js` | `chopper.js` | Chopper | Chopper | Physical ownership mismatch only; comparatively low-risk |
| `loopGridEvents` | `core.js` | Chopper grid logic | Chopper, combined renderer, Events | Chopper | Renderer consumes mutable Chopper state implicitly |
| drum folder handles / entries / files / decode cache | `core.js` | `drums.js` | Drums | Drums | Physical ownership mismatch only; good candidate for ownership grouping after Events cleanup |
| `currentDrumSelection`, generation number, velocities/edit state | `core.js` | `drums.js` | Drums, combined renderer, limited Events orchestration | Drums | Direct CLEAR mutation has been removed from Events, but renderer and some orchestration still depend on Drum state indirectly |
| `renderedFlip`, `flipSource`, `lastPreviewMode`, `isLoopPlaying`, loop playhead state | `core.js` | `drums.js` and `events.js` | Events, Chopper/Drums UI paths | Renderer | Combined-render state still has no explicit boundary and is heavily mutated from Events |
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
          └─────┬─────┘   └────┬──────┘   └────┬─────┘
                │               │               │
                │               └──────┬────────┘
                │                      │
                │              combined renderer
                │              currently in drums.js
                │                      │
                └──────────────┬───────┘
                               ▼
                         ┌───────────┐
                         │ events.js │
                         │ wiring +  │
                         │ preview   │
                         │ orchestration
                         └───────────┘
```

The diagram is still intentionally uncomfortable: the runtime does not yet have a single clean dependency direction. The important improvement is that several Chopper and Drum state transitions no longer live in Events.

## Observed cross-domain violations

### V1 — Core owns feature state physically

`core.js` declares Looper, Chopper, Drum and Renderer state alongside `AudioContext` infrastructure.

Consequence: a file can appear to depend only on Core while actually depending on another feature's mutable state.

Target: Core keeps only shared infrastructure; state moves gradually to its conceptual owner.

### V2 — Events still contains feature/control orchestration

Events no longer performs the Chopper sample-load, immediate volume, immediate pitch or Drum-clear state transitions.

Remaining violations include:

- direct mutation of `masterVolumePercent`;
- direct inspection of playback/preview state such as `isLoopPlaying`, `lastPreviewMode` and `sampleBuffer` to decide rerenders;
- multi-step Chopper/Drum workflows such as NEW DRUMS and combined preview/play/stop behavior;
- status/error presentation coupled to those workflows.

Target: Events should translate a DOM input to one public domain/renderer call and own no product state or business transition.

### V3 — Events directly owns combined-preview orchestration

`events.js` reads/writes `renderedFlip`, `lastPreviewMode`, `isLoopPlaying`, `flipSource` and loop playhead state, and decides whether to call `renderDrumsOnly()` or `renderSequence()`.

`rerenderPreviewMode()`, `playCurrentBeat()` and `stopCurrentBeat()` are the clearest remaining concentration of this problem.

Target: move this behavior behind an explicit renderer/preview API. Do not create `renderer.js` until its inputs are explicit enough that extraction is mechanical rather than architectural invention.

### V4 — Drums contains the combined Chopper + Drums renderer

`drums.js::renderSequence(events)` directly reads Chopper state such as:

- `sampleBuffer`;
- `markers`;
- sample pitch;
- sample volume/conditioner state.

It also obtains Drum state internally through `ensureDrumSelection()`.

Target: Renderer receives explicit immutable/snapshot inputs from Chopper and Drums rather than reaching into their mutable globals.

### V5 — Drums reacts to Chopper state

Drum selection currently uses `sampleBuffer` to derive density, and drum-edit rerender paths query Chopper grid/sample state.

This coupling may be product behavior rather than accidental coupling. It must be preserved, but expressed through explicit inputs/queries instead of shared mutable variables.

### V6 — Script order is part of the API

Classic scripts rely on earlier files having declared functions and state names. There is no import declaration showing those dependencies locally.

Target: first establish small domain APIs while keeping classic scripts. ES modules are not required until ownership is stable.

## What is already reasonably owned

Not every relationship requires movement.

- Looper persistence, folder scanning and beat-library behavior already live in `looper.js`; the main problem is the state they depend on being globally declared and some transport inspection in Events.
- Chopper waveform/marker algorithms and the immediate sample load/volume/pitch transitions now live in `chopper.js`.
- Drum library loading, patterns, editing, velocities and CLEAR behavior mostly live in `drums.js`.
- Practice is already isolated enough to remain frozen.

This matters because the migration should **not** split files simply to make the tree look more architectural.

## Priority order derived from the graph

### P1 — Finish removing feature-state mutation/orchestration from `events.js`

Completed:

1. Chopper sample-load workflow;
2. Drum CLEAR transition;
3. Chopper immediate sample-volume transition;
4. Chopper immediate sample-pitch transition.

Remaining high-value boundaries:

1. combined-preview rerender/play/stop orchestration;
2. NEW DRUMS while-playing orchestration;
3. master-volume path, but only when a complete responsibility can move — do **not** add a setter that merely hides the global assignment;
4. remaining save/transport workflows where Events still knows domain internals.

Do not move renderer code to a new file during these passes.

### P2 — Make Renderer inputs explicit while it still lives in `drums.js`

Refactor `renderSequence()` toward arguments/snapshots for:

- Chopper sample buffer;
- markers/grid events;
- pitch/volume/conditioning parameters;
- Drum selection/effects;
- tempo/bars.

Exit condition: the combined renderer no longer reads Chopper mutable globals directly.

### P3 — Extract `renderer.js`

Only after P2.

At that point extraction should be mostly a mechanical ownership move, not a redesign.

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

## Current recommended runtime boundary

**Move one combined-preview transition out of `events.js` without extracting `renderer.js` yet.**

The best next candidates are the existing rerender/play/stop paths because Events currently decides render mode and directly mutates renderer-owned state.

The step must remain narrow:

- one public operation owned by the current renderer implementation;
- no new runtime file;
- no state relocation;
- no visual change;
- no audio algorithm change;
- explicit behavioral test for the moved preview transition;
- full `Project checks` green before merge.

This continues the same incremental strategy: remove one hidden relationship at a time before changing the physical file topology.
