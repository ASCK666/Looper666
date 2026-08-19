# Cassette production asset package — staged activation gate

This file documents the exact binary asset names required by `js/cassette-runtime.staged.js` before the layered cassette may be activated on branch `faceplate-190826`.

## Required production files

All files live under `assets/looper-ui/`:

- `cassette-cavity.png`
- `cassette-tape-path.png`
- `cassette-reel-left.png`
- `cassette-reel-right.png`
- `cassette-shell.png`
- `cassette-support-foreground.png`
- `cassette-glass-habitacle.png`

## Current package geometry

- cavity: full 1536x1024 transparent PNG, visible alpha confined to cassette area `x=497..1050`, `y=137..386`;
- tape path: full 1536x1024 transparent PNG, visible alpha confined to `x=558..989`, `y=243..305`; it contains the two static tape strands extracted directly from the approved baseline faceplate pixels and remains behind the rotating reels and shell;
- left reel: 154x154 PNG, mounted around global center `(648,249)`;
- right reel: 154x154 PNG, mounted around global center `(894,251)`;
- shell: full 1536x1024 transparent PNG with continuous transparent/translucent cassette body, two localized spindle apertures and static blank label material. The current shell has a narrowly bounded local transparency correction along the two tape-strand corridors so the physical tape remains visible through the plastic without any duplicate tape layer above the shell;
- support: full 1536x1024 transparent PNG, exact baseline foreground support extraction;
- glass: full 1536x1024 transparent PNG, visible alpha confined to the full habitacle glass region `x=484..1067`, `y=118..389`.

## Tape-path and speed calibration

The two tape strands are static mechanism geometry. They do not rotate with the reels. Their RGB pixels are copied directly from the approved `faceplate.webp` baseline through narrow feathered masks, without repainting or recoloring. The left strand follows the original outward lower-left route, the right strand follows the original outward lower-right route, and both stop at the same lower separator region as the baseline.

The tape strands remain physically below the cassette shell at runtime. Visibility through the shell is provided by the shell artwork's local translucency; no tape copy is rendered above the shell.

The light physical speed calibration uses the standard compact-cassette tape speed of `4.75 cm/s` (`1 7/8 in/s`) without simulating changing winding radius over time.

Measured current production-asset reel radii:

- left: approximately `77.0 px`;
- right: approximately `76.75 px`.

Using the frozen cassette width `554 px` mapped to approximately `100.5 mm`, the corresponding current turn periods are approximately:

- left: `1.848 s/turn`;
- right: `1.842 s/turn`.

These are current-state calibration values only; a future full winding simulation may vary angular speed as tape transfers between reels.

## Activation gate

The runtime must stay dormant until all seven binary assets exist at the exact paths above and have been visually checked as one composite. The branch must not activate missing or placeholder assets.

`faceplate.webp` remains unchanged by this package. Dynamic cassette title text remains HTML/CSS.

## Production package hashes

SHA-256 values used by the runtime integrity gate:

- `cassette-cavity.png`: `b5e897e4be61695fa5e5c6ab628f9322b5c06e7a16b2f33bcfbdb97412e1517f`
- `cassette-tape-path.png`: `42b4c1eedfbd60a6de40aab6e651bbafffd9d7f62a8f3c0f5f0b1e9e67dc320d`
- `cassette-reel-left.png`: `b1daef2f88a9d8e79c97b89ebcc7cb974703a4d240436928013e83786ab1c03e`
- `cassette-reel-right.png`: `6043c1b1c5a8bd5aba8386595c58cc251fcabd3b54646ca71b517ced16602daa`
- `cassette-shell.png`: `006ab4bfc5a9684caf7f3ab32cfa8d0b72097ff8ea3e2d3c1b2d7bbb02b983ba`
- `cassette-support-foreground.png`: `ff751dd7eda90e2389ab856fa7a90b2d5a5dba72031aae29e0e6548ba0b1e75b`
- `cassette-glass-habitacle.png`: `1ebdcd2a3080899a4a5042a8e99eeda8d8fc943420ffedbd29532e673aab3837`

These hashes are an integrity reference for the staged package; they do not by themselves constitute visual approval or merge authorization.
