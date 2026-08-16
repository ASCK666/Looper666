# Current state and dependency map

This document describes the **current runtime as observed after the proven dead-code cleanup**. It is intentionally descriptive, not aspirational. `TARGET_ARCHITECTURE.md` defines where the project should converge.

No runtime change belongs in the same PR as this first inventory.

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

`core.js` currently acts as both shared audio infrastructure **and** the physical declaration site for state owned conceptually by Looper, Chopper, Drums and the combined renderer.

This produces two different notions of ownership:

- **physical declaration ownership:** mostly `core.js`;
- **behavioral ownership:** spread across `looper.js`, `chopper.js`, `drums.js` and `events.js`.

The refactor should make those two notions converge without changing behavior.

## State inventory

| State family | Declared today | Main writers today | Main readers today | Target owner | Current issue |
|---|---|---|---|---|---|
| `ctx`, `liveBus`, `masterAnalyser`, meter runtime | `core.js` | `core.js`, master-volume UI path | all audio domains | Core | Mostly correct; master volume mutation is currently wired from Events/Chopper UI code |
| `deckSource`, `deckBuffer`, `currentTrack`, `deckOutputGain` | `core.js` | `looper.js`, some `events.js` handlers | Looper UI, Events | Looper | Feature state physically lives in Core and is directly inspected from Events |
| AUTO Looper state and tape counter | `core.js` | `looper.js` | Looper UI, Events | Looper | Feature state physically lives in Core |
| `sampleBuffer`, `sampleName`, `markers`, `transients`, `selectedMarker` | `core.js` | `chopper.js` and `events.js` sample-load handlers | Chopper, Drums renderer, Events | Chopper | Direct cross-file mutation; renderer reaches into Chopper mutable state |
| sample pitch / volume / condition profile | `core.js` | `events.js`, `chopper.js` | Chopper, Drums renderer | Chopper | Events implements state transitions instead of delegating one domain call |
| chop audition/playhead state | `core.js` | `chopper.js` | Chopper | Chopper | Physical ownership mismatch only; comparatively low-risk |
| `loopGridEvents` | `core.js` | Chopper grid logic | Chopper, Drums renderer, Events | Chopper | Renderer consumes mutable Chopper state implicitly |
| drum folder handles / entries / files / decode cache | `core.js` | `drums.js` | Drums | Drums | Physical ownership mismatch only; good first candidate for ownership grouping after Events cleanup |
| `currentDrumSelection`, generation number, velocities/edit state | `core.js` | `drums.js` | Drums, renderer, Events | Drums | Renderer and Events depend on mutable Drum state implicitly |
| `renderedFlip`, `flipSource`, `lastPreviewMode`, `isLoopPlaying`, loop playhead state | `core.js` | `drums.js` and `events.js` | Events, Chopper/Drums UI paths | Renderer | Combined-render state has no explicit domain and is mutated from Events |
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
                         │ business  │
                         │ mutations │
                         └───────────┘
```

The diagram is intentionally uncomfortable: the runtime does not currently have a single clean dependency direction.

## Observed cross-domain violations

### V1 — Core owns feature state physically

`core.js` declares Looper, Chopper, Drum and Renderer state alongside `AudioContext` infrastructure.

Consequence: a file can appear to depend only on Core while actually depending on another feature's mutable state.

Target: Core keeps only shared infrastructure; state moves gradually to its conceptual owner.

### V2 — Events directly mutates Chopper state

The sample-load and control handlers in `events.js` directly assign values including:

- `sampleBuffer`;
- `sampleName`;
- `sampleConditionProfile`;
- `samplePitchSemitones`;
- `transients`;
- `sampleVolumePercent`;
- `masterVolumePercent`.

`events.js` also performs feature workflows such as marker reset/placement and preview rerender decisions.

Target: Events should translate DOM input to one Chopper/Core public call and own no product state.

### V3 — Events directly owns combined-preview orchestration

`events.js` reads/writes `renderedFlip`, `lastPreviewMode` and `isLoopPlaying`, and decides whether to call `renderDrumsOnly()` or `renderSequence()`.

Target: move this behavior behind an explicit renderer/preview API. Do not create `renderer.js` until its inputs are explicit.

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

- Looper persistence, folder scanning and beat-library behavior already live in `looper.js`; the main problem is the state they depend on being globally declared.
- Chopper waveform/marker algorithms mostly live in `chopper.js`.
- Drum library loading, patterns, editing and velocities mostly live in `drums.js`.
- Practice is already isolated enough to remain frozen.

This matters because the migration should **not** split files simply to make the tree look more architectural.

## Priority order derived from the graph

### P1 — Remove feature-state mutation from `events.js`

Why first:

- it immediately establishes the target rule that Events owns no product state;
- it reduces cross-domain writers without changing the module system;
- it exposes the public functions each domain actually needs.

Recommended sequence inside P1:

1. Chopper sample-load workflow;
2. Chopper pitch/volume setters and rerender trigger boundary;
3. master-volume setter into Core;
4. combined-preview rerender orchestration behind a temporary explicit API owned by the current renderer implementation.

Do not move renderer code to a new file during the same passes.

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
- number of Chopper mutable globals read directly by the combined renderer;
- number of feature-state variables physically declared in `core.js`;
- number of direct cross-domain mutations;
- number of runtime files whose correctness depends on undocumented load order.

Each architecture PR should make at least one of these counts go down and none go up without explicit justification.

## First recommended runtime PR

**Move the Chopper sample-load workflow out of `events.js` and behind one Chopper-owned function, without moving state declarations yet.**

This is deliberately small:

- no new file;
- no visual change;
- no audio algorithm change;
- no state relocation;
- same event handler input/output behavior;
- one fewer business workflow owned by Events.

That PR should be the first proof that the target architecture can be reached incrementally rather than through a rewrite.
