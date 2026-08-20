# Cassette production asset package — staged activation gate

This file documents the exact binary asset names required by `js/cassette-runtime.staged.js` before the layered cassette may be activated on branch `faceplate-190826`.

## Required production files

All files live under `assets/looper-ui/`:

- `cassette-cavity.png`
- `cassette-reel-left.png`
- `cassette-reel-right.png`
- `cassette-shell.png`
- `cassette-support-foreground.png`

## Current package geometry

- cavity: full 1536x1024 transparent PNG, visible alpha confined to cassette area `x=497..1050`, `y=137..386`;
- left reel: 154x154 PNG, mounted around global center `(648,249)`;
- right reel: 154x154 PNG, mounted around global center `(894,251)`;
- shell: full 1536x1024 transparent PNG with continuous transparent/translucent cassette body, two localized spindle apertures and static blank label material. The current shell still contains a narrowly bounded transparency correction created during the abandoned side-strand experiments; keep it unchanged unless a separate cleanup is explicitly approved;
- support: full 1536x1024 transparent PNG, exact baseline foreground support extraction;
- glass: fixed CSS pane spanning the complete measured habitacle region `x=484..1067`, `y=118..389`; its center remains clear and only edge/reflection contributions are drawn.

## CSS glass, retired tape path and speed calibration

No converging side tape strands are mounted. A fixed CSS aperture clips the complete cartridge to the glass opening, while an opaque CSS cavity backing prevents baked faceplate details from showing through during insertion. The fixed CSS glass spans the same full aperture instead of reading as a small plate attached to the cassette.

`cassette-tape-path.png` is retained only as reconstruction history. It is no longer mounted or checked by the runtime integrity gate.

The light physical speed calibration remains based on standard compact-cassette tape speed `4.75 cm/s` (`1 7/8 in/s`) without simulating changing winding radius over time.

Measured current production-asset reel radii:

- left: approximately `77.0 px`;
- right: approximately `76.75 px`.

Using the frozen cassette width `554 px` mapped to approximately `100.5 mm`, the corresponding current turn periods are approximately:

- left: `1.848 s/turn`;
- right: `1.842 s/turn`.

These are current-state calibration values only; a future full winding simulation may vary angular speed as tape transfers between reels.

## Activation gate

The runtime must stay dormant until all five currently required binary assets exist at the exact paths above and have passed integrity verification.

`js/cassette-runtime.staged.js` verifies exact filename, dimensions, alpha bbox and SHA-256 before mounting the cassette. If one file does not match, the layered cassette is not partially mounted; bootstrap falls back to the original `faceplate.webp`. This can look like a design rollback plus lost animation even when Git history itself has not rolled back.

`faceplate.webp` remains unchanged by this package. Dynamic cassette title text remains HTML/CSS.

## Production package hashes

SHA-256 values used by the current runtime integrity gate:

- `cassette-cavity.png`: `b5e897e4be61695fa5e5c6ab628f9322b5c06e7a16b2f33bcfbdb97412e1517f`
- `cassette-reel-left.png`: `b1daef2f88a9d8e79c97b89ebcc7cb974703a4d240436928013e83786ab1c03e`
- `cassette-reel-right.png`: `6043c1b1c5a8bd5aba8386595c58cc251fcabd3b54646ca71b517ced16602daa`
- `cassette-shell.png`: `006ab4bfc5a9684caf7f3ab32cfa8d0b72097ff8ea3e2d3c1b2d7bbb02b983ba`
- `cassette-support-foreground.png`: `ff751dd7eda90e2389ab856fa7a90b2d5a5dba72031aae29e0e6548ba0b1e75b`

These hashes are an integrity reference for the staged package; they do not by themselves constitute visual approval or merge authorization.

For implementation history, failure modes and the safe binary workflow, see `CASSETTE_LAYERING_NOTES.md`.
