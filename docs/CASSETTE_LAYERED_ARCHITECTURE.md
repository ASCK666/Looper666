# Cassette layered architecture — target design

This document defines the target visual architecture for the Looper cassette.

It exists because the current single-image cassette is a composite: clear plastic, tape, reels, label, reflections and shadows are baked together in `assets/looper-ui/faceplate.webp`. Local retouching of one material can therefore distort another material even when the edit is carefully masked. Repeated texture repair of that composite is not a scalable path.

The current reel animation on `feat/cassette-reel-animation` is considered the stable runtime baseline. The purpose of this architecture is not to replace working transport behavior. It is to make future cassette visual work independently editable and testable.

## 1. Goals

The target must make these operations independent:

- edit clear-plastic shell texture without altering tape;
- edit tape without altering shell texture;
- animate left and right reels without redrawing the cassette body;
- change the white label substrate without touching plastic;
- render the beat title dynamically in HTML without baked duplicate text;
- preserve transport/audio behavior exactly;
- compare each material/layer against an approved baseline independently.

The target is a layered cassette component, not a new application framework.

## 2. Non-goals

This migration must not:

- rewrite Looper transport or audio code;
- introduce React/Vue/Svelte, TypeScript, a state library or a rendering engine;
- add a second transport state machine for visuals;
- redesign the cassette geometry during extraction;
- mix dynamic button backlighting into the cassette migration;
- use generated artwork as the production source without separate explicit approval;
- keep polishing the current baked cassette indefinitely instead of migrating the architecture.

## 3. Source-of-truth model

### Before migration

`assets/looper-ui/faceplate.webp` is the visual source of truth for the full deck, including the baked cassette.

### During migration

The existing faceplate remains the approved runtime baseline. New cassette layers are built and validated off to the side. They do not replace the live cassette until STOP-state parity is accepted.

### After cutover

There must be exactly two visual ownership domains:

1. **Deck base** — chassis, controls, glass, surrounding panel material.
2. **Cassette component** — shell, tape, reels, label substrate and cassette-local reflections.

The cassette must no longer be simultaneously owned by both the deck base and the layered cassette stack. A one-time cutover must neutralize/remove the baked cassette from the deck base or provide an explicitly approved opaque local cassette backplate so duplicate cassette pixels cannot ghost through transparent layers.

Do not keep two production cassette sources after cutover.

## 4. Proposed asset structure

Recommended directory:

```text
assets/looper-ui/cassette/
  cassette-shell.webp
  cassette-tape.webp
  cassette-reel-left.webp
  cassette-reel-right.webp
  cassette-label.webp
  cassette-reflections.webp        # optional, only if shell/reflection ownership cannot stay together
  cassette-occlusion-mask.svg      # geometry/masking only; no invented visual styling
  README.md                         # canonical coordinates and provenance
```

The exact file split may be reduced if two layers are truly inseparable. It must not be expanded merely for stylistic neatness.

### Layer responsibilities

#### `cassette-tape.webp`

Owns only the dark magnetic-tape material visible behind/around the reels.

It must not contain:

- reel hubs;
- shell highlights;
- white label pixels;
- dynamic text.

#### `cassette-reel-left.webp` / `cassette-reel-right.webp`

Own the complete rotating mechanism visible inside each reel aperture.

They must be extracted from an approved source so their material, hub shape and lighting are coherent with the cassette. They are the only continuously rotating raster layers.

#### `cassette-shell.webp`

Owns the fixed plastic body: transparent/amber plastic, edges, screw seats, moulding details and shell-local shading.

The shell layer must use real alpha where underlying tape/reels need to remain visible. It must not contain baked copies of the reel mechanisms.

#### `cassette-label.webp`

Owns only the static paper/white label substrate and its static material texture.

The beat name remains HTML text above this layer.

#### `cassette-reflections.webp` — optional

Use only if separating front-surface highlights from the shell materially improves editability. If the shell and reflections can remain a single coherent static raster, prefer fewer layers.

#### `cassette-occlusion-mask.svg`

May define apertures/occlusion boundaries. SVG is acceptable for geometry and masks. It must not become replacement artwork for the photographic/painted cassette materials.

## 5. Runtime stack and z-order

The cassette should be one absolutely positioned, pointer-events-none component aligned to the existing 1536×1024 Looper coordinate system.

Back to front:

```text
0  deck base / cassette bay
10 cassette-tape
20 left reel + right reel
30 cassette-shell
40 cassette-label
50 cassette-reflections (only if separated)
60 dynamic HTML beat title
```

The shell sits in front of the tape and reels because the real cassette body visually occludes them. The label sits on the shell. Dynamic title text sits on the label.

Recommended DOM shape:

```html
<div class="asset-cassette-stack" aria-hidden="true">
  <img class="asset-cassette-tape" ...>
  <img class="asset-cassette-reel asset-cassette-reel-left" ...>
  <img class="asset-cassette-reel asset-cassette-reel-right" ...>
  <img class="asset-cassette-shell" ...>
  <img class="asset-cassette-label" ...>
  <img class="asset-cassette-reflections" ...> <!-- optional -->
</div>
```

The existing dynamic cassette title remains a separate real HTML element, not part of `aria-hidden` decorative imagery.

## 6. Coordinate contract

All cassette geometry is calibrated in the canonical `1536 × 1024` faceplate coordinate space.

Rules:

- store source rectangles/centres in documented canonical pixels;
- express runtime placement as percentages derived from those canonical values;
- use a single parent `.asset-cassette-stack` bounding box so all child layers share one transform context;
- no child may independently compensate for viewport scaling with magic JS offsets;
- use `transform-origin: 50% 50%` for reel rotation after the reel raster has already been cropped around its true centre;
- preserve aspect ratio at all responsive sizes;
- do not animate the cassette parent container.

`assets/looper-ui/cassette/README.md` should eventually record the final source boxes and reel centres once extraction is approved.

## 7. Animation contract

Transport remains owned by Looper. Visual layers only reflect existing state.

Allowed runtime inputs:

- `#looper.asset-playing` or the equivalent existing transport-derived class;
- existing `data-speed-level` for visual speed coupling;
- future explicit immutable presentation values owned by Looper, if needed.

Forbidden:

- a second PLAY/STOP state variable for the cassette;
- independent timers that decide whether playback is active;
- audio changes made solely to support animation;
- rotation of shell/tape/label layers.

### Reel motion

Only the two reel layers rotate.

A later realism pass may vary left/right angular velocity as tape transfers, but that is a separate feature. It must not be mixed into initial layered extraction.

### Tape transfer — later optional stage

If realistic tape-pack transfer is added later, represent it as a dedicated tape-state visual layer or masked scale/radius change behind the shell. Do not repaint the shell to simulate changing tape volume.

## 8. Migration sequence

The migration should be deliberately staged.

### Stage A — freeze the current accepted baseline

Use the visually accepted reel-animation state as the baseline. Do not perform more shell/tape cleanup on the baked cassette during extraction work.

Deliverable: baseline STOP screenshot and PLAY screenshots in Chromium.

### Stage B — extract layers without changing runtime

Produce the cassette assets in `assets/looper-ui/cassette/` while the application still uses the current faceplate.

Requirements:

- provenance documented for every layer;
- exact canvas/crop geometry recorded;
- alpha edges inspected at native resolution;
- no generative replacement of missing material unless separately authorized.

### Stage C — build a static layered STOP composite

Render the new layer stack in an isolated test page or temporary verification harness.

Acceptance criterion: at normal browser size and native-resolution inspection, the layered STOP cassette must be visually equivalent to the approved baseline before any animation is enabled.

Do not proceed because a numerical image metric is green if the manual visual comparison is worse.

### Stage D — runtime cutover

Introduce `.asset-cassette-stack` and neutralize the baked cassette ownership exactly once.

The cutover PR must contain no aesthetic redesign. Its job is architectural parity.

### Stage E — connect existing reel animation

Move the already working reel rotation onto `cassette-reel-left.webp` and `cassette-reel-right.webp`.

PLAY/STOP and speed coupling must remain driven by existing Looper state.

### Stage F — future independent visual improvements

Only after the layered component is accepted may shell, tape, label or reflections be improved independently. Each material gets its own scoped PR.

## 9. Verification contract

### Asset-level checks

For every layer:

- expected dimensions and alpha mode;
- no unexpected opaque pixels outside the intended silhouette;
- no baked dynamic beat title;
- no duplicated ownership across layers unless explicitly documented for antialiasing/edge blending.

### STOP-state browser check

Capture full `#looper` in Chromium and inspect:

- cassette geometry and alignment;
- shell/tape coherence;
- label/title;
- reels at rest;
- transport row;
- surrounding deck pixels for seams from the cutover.

### PLAY-state browser check

Capture at least two PLAY frames and verify:

- both reels move;
- shell/tape/label pixels are stable frame-to-frame;
- no motion exists outside reel regions;
- reel centres do not drift;
- responsive resizing preserves alignment.

### Regression tests

`tests/asset_render.py` should eventually assert structural contracts, not exact stylistic implementation details:

- stack exists and aligns to the cassette bounding box;
- reel layers are distinct and rotate only in PLAY;
- shell/tape/label remain non-rotating;
- STOP disables reel motion;
- `data-speed-level` affects reel timing if that behavior is retained;
- natural deck geometry remains 1536×1024 until a separately approved base-asset migration changes it.

## 10. Retouch-to-architecture escalation rule

A local composite retouch is the wrong tool when the defect crosses material ownership boundaries.

Stop retouching and switch to a layer extraction/refactor when **any** of these becomes true:

- fixing shell texture changes tape appearance;
- fixing tape changes shell/reflections;
- the same visual defect has already required two correction iterations;
- the allowed edit mask must be expanded repeatedly to hide side effects;
- the new version is not clearly better than the last accepted baseline at normal size;
- a material needs independent motion, transparency or state-dependent appearance;
- more effort is being spent preserving unrelated baked pixels than solving the requested visual defect.

This is a design constraint, not merely a workflow preference.

## 11. PR sizing rules

Do not implement the whole migration in one PR.

Recommended PR sequence:

1. docs/architecture only;
2. asset extraction only, not used at runtime;
3. static layered STOP composition/cutover;
4. reel-animation migration to the extracted reel layers;
5. optional tape-transfer realism;
6. optional shell/reflection improvements;
7. dynamic backlighting remains separate from all cassette work.

Each PR must have one visual/architectural purpose and must remain unmerged until its browser render is explicitly approved when appearance changes.

## 12. Definition of success

The cassette architecture is successful when this statement is true:

> The deck owns the deck. The cassette shell owns plastic. The tape owns tape. Each reel owns its rotating mechanism. The label owns paper. HTML owns the dynamic beat title. Looper transport owns PLAY/STOP state. Editing or animating one of those does not require repainting the others.

The objective is not more layers. The objective is independent ownership so a one-hour visual correction does not become a day of destructive composite retouching.
