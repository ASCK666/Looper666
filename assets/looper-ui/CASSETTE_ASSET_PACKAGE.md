# Cassette production asset package — activation gate

This file documents the exact binary asset names required by `js/cassette-runtime.js` before the layered cassette may be activated.

## Required production files

All files live under `assets/looper-ui/`:

- `cassette-cavity.png`
- `cassette-reel-left.png`
- `cassette-reel-right.png`
- `cassette-shell.png`
- `cassette-support-foreground.png`
- `cassette-glass-habitacle.png`

## Current package geometry

- cavity: cropped 554x250 transparent PNG, mounted at global `(497,137)`;
- left reel: 154x154 PNG, mounted around global center `(648,249)`;
- right reel: 154x154 PNG, mounted around global center `(894,251)`;
- shell: cropped 554x250 transparent PNG, mounted at global `(497,137)`, with continuous transparent/translucent cassette body, localized spindle apertures and static blank label material;
- support: cropped 585x67 transparent PNG, mounted at global `(483,387)`, exact baseline foreground support extraction;
- glass: cropped 604x278 transparent PNG, mounted at global `(477,111)`; its alpha follows the inner habitacle contour and contains only restrained glass tint/reflections, never cassette or frame pixels.

## Transparent habitacle glass and speed calibration

No converging side tape strands are mounted. A fixed CSS aperture clips the complete cartridge to the habitacle opening, while an opaque CSS cavity backing prevents baked faceplate details from showing through during insertion. The transparent glass PNG remains fixed above the moving cassette and uses the same full-opening geometry.

The abandoned tape-path binary is preserved by Git history rather than shipped with the application.

The light physical speed calibration remains based on standard compact-cassette tape speed `4.75 cm/s` (`1 7/8 in/s`) without simulating changing winding radius over time.

Measured current production-asset reel radii:

- left: approximately `77.0 px`;
- right: approximately `76.75 px`.

Using the frozen cassette width `554 px` mapped to approximately `100.5 mm`, the corresponding current turn periods are approximately:

- left: `1.848 s/turn`;
- right: `1.842 s/turn`.

These are current-state calibration values only; a future full winding simulation may vary angular speed as tape transfers between reels.

## Activation gate

The runtime must stay dormant until all six currently required binary assets exist at the exact paths above and have passed integrity verification.

`js/cassette-runtime.js` verifies exact filename, dimensions, alpha bbox and SHA-256 before mounting the cassette. Verified blobs are reused directly by the mounted images, avoiding a second network fetch. If one file does not match, the layered cassette is not partially mounted; bootstrap falls back to the original `faceplate.webp`.

`faceplate.webp` remains unchanged by this package. Dynamic cassette title text remains HTML/CSS.

## Production package hashes

SHA-256 values used by the current runtime integrity gate:

- `cassette-cavity.png`: `43c918622e23f0ba55280afaa3e88caa23ee2595991a49b6116d624f910bb52b`
- `cassette-reel-left.png`: `b1daef2f88a9d8e79c97b89ebcc7cb974703a4d240436928013e83786ab1c03e`
- `cassette-reel-right.png`: `6043c1b1c5a8bd5aba8386595c58cc251fcabd3b54646ca71b517ced16602daa`
- `cassette-shell.png`: `7abb476bf3bfa3bbb137949691ffca31ddcc176415d1314d3df0787de9ace70a`
- `cassette-support-foreground.png`: `def9953347a1c2caadf7b7336a1e42509653a3f53ee01fc632222e0fea0588e9`
- `cassette-glass-habitacle.png`: `813ad24a3fb287f37069afe75f4803f4c00497143b075b21543507f75eed3061`

These hashes are an integrity reference for the production package; they do not by themselves constitute visual approval or merge authorization.

For implementation history, failure modes and the safe binary workflow, see `CASSETTE_LAYERING_NOTES.md`.
