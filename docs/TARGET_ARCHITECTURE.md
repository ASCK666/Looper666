# Target architecture — Scratch Practice

This document is the architectural contract for the simplification work.

The goal is not to modernize the stack or rewrite the product. The goal is to make the existing vanilla HTML/CSS/JavaScript application easier to reason about while preserving all user-visible behavior.

## Non-negotiable constraints

1. Preserve the current product features and local-first behavior.
2. No framework migration.
3. No TypeScript migration during this refactor.
4. No state-management library.
5. No dependency-injection container.
6. No large rewrite.
7. No visual redesign mixed with an ownership move.
8. No audio-algorithm change mixed with an ownership move.
9. No new `*-polish`, `*-layout`, `compat`, `legacy-fix` or override runtime layer unless a separate architectural review proves it is necessary.
10. Every migration step must reduce or leave unchanged the number of cross-domain dependencies.
11. Every state has exactly one owning domain.
12. A domain may read another domain only through an explicit public function or an explicit immutable input passed to it; direct cross-domain mutation is forbidden.

## Target runtime shape

```text
UI / events
   |
   +------> Looper ------+
   +------> Chopper -----+----> Renderer ----> Core
   +------> Drums -------+
   +------> Practice
```

`Core` is infrastructure, not a global application store.

`Renderer` combines explicit Chopper and Drums inputs. It does not own their editing state.

`events.js` wires DOM events to public feature functions. It must not contain business rules, persistence decisions, audio rendering logic or feature state transitions.

## Domain ownership

### Core

Owns only shared audio/runtime infrastructure:

- `AudioContext` lifecycle;
- master/live bus;
- master analyser and meter primitives;
- reusable audio conversion/decoding helpers;
- generic, dependency-free helpers that are genuinely shared.

Core must not own Looper, Chopper or Drum editing state.

### Looper

Owns:

- current beat / deck track state;
- deck source and transport state;
- AUTO speed state and tape-counter state;
- beat library state;
- Looper persistence and folder/cache policy;
- cassette/Looper presentation derived from Looper state.

Only Looper may mutate Looper state.

### Chopper

Owns:

- loaded sample;
- markers and transient analysis state;
- selected marker;
- sample pitch and sample volume;
- chop audition state;
- chop placement/grid state;
- Chopper presentation derived from Chopper state.

Only Chopper may mutate Chopper state.

### Drums

Owns:

- drum libraries and selected drum files;
- decode cache for drums;
- drum pattern selection;
- drum edit/velocity state;
- drum-specific effects/settings;
- Drums presentation derived from Drums state.

Only Drums may mutate Drum state.

### Renderer

Owns only transient render/playback state for the combined loop.

Inputs must be explicit snapshots/arguments from Chopper and Drums. Renderer must not reach into their mutable state implicitly.

Renderer is responsible for:

- building the complete Chopper + Drums render;
- playing/stopping the rendered preview when this is not domain-specific transport;
- returning rendered buffers/blobs to callers.

Renderer must not own persistence or UI.

### Events

Owns no product state.

Allowed responsibilities:

- startup;
- DOM event registration;
- translating a DOM event into one public domain call;
- switching top-level UI modes where that behavior is purely application shell/navigation.

Forbidden responsibilities:

- deciding how a feature works;
- directly editing another domain's state variables;
- building audio renders;
- persistence logic;
- duplicating domain error-handling/business rules.

### Practice

Practice remains a separate frozen domain until its redesign is explicitly started. The architecture refactor must not opportunistically rewrite Practice.

## Allowed target dependencies

```text
events -> looper
events -> chopper
events -> drums
events -> renderer
events -> practice

looper -> core
chopper -> core
drums -> core
renderer -> core

renderer <- explicit input from chopper
renderer <- explicit input from drums
```

Dependencies to remove over time:

- Chopper directly mutating Drum state;
- Drums directly reading/mutating Chopper mutable state;
- Chopper reaching into Looper persistence;
- `events.js` implementing feature behavior;
- feature files depending on script-load order for undeclared mutable globals;
- Core becoming the owner of feature state.

## Looper visual ownership

The same single-owner rule applies to visual materials.

The current cassette is baked into one composite image, which couples shell plastic, magnetic tape, reels, label and reflections. Future cassette work must migrate toward independent visual ownership rather than repeatedly retouching that composite.

Target ownership:

```text
Deck base          -> chassis / surrounding deck
Cassette shell     -> plastic body and shell-local shading
Cassette tape      -> magnetic tape material
Left reel          -> left rotating mechanism
Right reel         -> right rotating mechanism
Cassette label     -> static paper substrate
HTML               -> dynamic beat title
Looper transport   -> PLAY/STOP and speed state
```

The detailed extraction, z-order, coordinate, cutover and verification contract is defined in:

`docs/CASSETTE_LAYERED_ARCHITECTURE.md`

This migration is a visual-asset ownership refactor. It must not be mixed with audio, transport, Practice or unrelated UI architecture work.

## Migration sequence

1. Remove only proven dead/historical code.
2. Inventory the real state/dependency graph from the cleaned runtime.
3. Establish ownership while keeping classic scripts.
4. Reduce shared global state and direct cross-domain mutation.
5. Make dependencies explicit; ES modules are optional and come only after ownership is stable.
6. Prefer behavioral regression tests over tests that freeze implementation location.

## Refactor gate for every PR

Every architecture PR must answer:

1. Which single ownership/dependency problem does this PR remove?
2. Which domain owns the affected state before and after?
3. Did the number of cross-domain reads/writes decrease or stay equal?
4. Did user-visible behavior remain unchanged?
5. Were unrelated visual/audio changes excluded?
6. Did the relevant regression suite pass?
7. Did this PR add a new abstraction/file? If yes, what independent responsibility and contract justify it?

If these questions cannot be answered clearly, the PR is too broad.

## Definition of success

The refactor is complete enough when a maintainer can understand the runtime with this sentence:

> Core provides shared audio infrastructure. Looper, Chopper and Drums each own their state and behavior. Renderer combines explicit Chopper and Drum inputs. Events only wires the UI. Practice remains independent.

The objective is fewer concepts and fewer hidden relationships, not a larger architecture diagram.
