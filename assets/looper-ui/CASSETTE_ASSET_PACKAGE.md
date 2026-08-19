# Cassette production asset package — staged activation gate

This file documents the exact binary asset names required by `js/cassette-runtime.staged.js` before the layered cassette may be activated on branch `faceplate-190826`.

## Required production files

All files live under `assets/looper-ui/`:

- `cassette-cavity.png`
- `cassette-reel-left.png`
- `cassette-reel-right.png`
- `cassette-shell.png`
- `cassette-support-foreground.png`
- `cassette-glass-habitacle.png`

## Current package geometry

- cavity: full 1536x1024 transparent PNG, visible alpha confined to cassette area `x=497..1050`, `y=137..386`;
- left reel: 154x154 PNG, mounted around global center `(648,249)`;
- right reel: 154x154 PNG, mounted around global center `(894,251)`;
- shell: full 1536x1024 transparent PNG with continuous transparent/translucent cassette body, two localized spindle apertures and static blank label material;
- support: full 1536x1024 transparent PNG, exact baseline foreground support extraction;
- glass: full 1536x1024 transparent PNG, visible alpha confined to the full habitacle glass region `x=484..1067`, `y=118..389`.

## Activation gate

The runtime must stay dormant until all six binary assets exist at the exact paths above and have been visually checked as one composite. The branch must not activate missing or placeholder assets.

`faceplate.webp` remains unchanged by this package. Dynamic cassette title text remains HTML/CSS.

## Step 21 candidate hashes

SHA-256 values of the candidate package prepared for manual Git upload:

- `cassette-cavity.png`: `b5e897e4be61695fa5e5c6ab628f9322b5c06e7a16b2f33bcfbdb97412e1517f`
- `cassette-reel-left.png`: `b1daef2f88a9d8e79c97b89ebcc7cb974703a4d240436928013e83786ab1c03e`
- `cassette-reel-right.png`: `6043c1b1c5a8bd5aba8386595c58cc251fcabd3b54646ca71b517ced16602daa`
- `cassette-shell.png`: `6b4d8b6b40377bb1a2971ba3e5c753f3cf62f2c27fde44e88654082a0b57bd4b`
- `cassette-support-foreground.png`: `ff751dd7eda90e2389ab856fa7a90b2d5a5dba72031aae29e0e6548ba0b1e75b`
- `cassette-glass-habitacle.png`: `1ebdcd2a3080899a4a5042a8e99eeda8d8fc943420ffedbd29532e673aab3837`

These hashes are an integrity reference for the staged package; they do not by themselves constitute visual approval or runtime activation.
