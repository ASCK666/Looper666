# Cassette production asset package — step 22

This document freezes the exact binary asset package expected by the staged cassette runtime on branch `faceplate-190826`.

The binary files listed here are candidate production assets and are **not yet present in the repository** at the time this document is committed. The runtime must remain dormant until all files are present at the exact paths below and their hashes match.

## Runtime asset paths

All files belong in `assets/looper-ui/`:

- `cassette-cavity.png`
- `cassette-reel-left.png`
- `cassette-reel-right.png`
- `cassette-shell.png`
- `cassette-support-foreground.png`
- `cassette-glass-habitacle.png`

These names match the defaults in `js/cassette-runtime.staged.js`.

## Frozen geometry

Native Looper faceplate: `1536 x 1024`.

Reel axes:

- left: `(648,249)` global;
- right: `(894,251)` global.

Reel assets are `154 x 154` and rotate around their exact image centers.

The shell uses the localized spindle-aperture candidate documented in `CASSETTE_SHELL_APERTURES.md`:

- documented aperture radius: `29 px`;
- rasterized cardinal zero-alpha radius: `28 px` on both sides;
- no broad central opening;
- wound tape remains behind transparent shell material outside the localized drive apertures.

## Frozen binary signatures

### `cassette-cavity.png`

- size: `1536 x 1024`
- non-transparent bbox: `[497,137,1051,387]` (right/bottom exclusive)
- SHA-256: `b5e897e4be61695fa5e5c6ab628f9322b5c06e7a16b2f33bcfbdb97412e1517f`

### `cassette-reel-left.png`

- size: `154 x 154`
- non-transparent bbox: `[0,0,154,154]`
- SHA-256: `b1daef2f88a9d8e79c97b89ebcc7cb974703a4d240436928013e83786ab1c03e`

### `cassette-reel-right.png`

- size: `154 x 154`
- non-transparent bbox: `[0,0,154,154]`
- SHA-256: `6043c1b1c5a8bd5aba8386595c58cc251fcabd3b54646ca71b517ced16602daa`

### `cassette-shell.png`

- size: `1536 x 1024`
- non-transparent bbox: `[497,137,1051,387]`
- SHA-256: `6b4d8b6b40377bb1a2971ba3e5c753f3cf62f2c27fde44e88654082a0b57bd4b`
- owns the static blank white label material;
- changing cassette/track name remains HTML/CSS only.

### `cassette-support-foreground.png`

- size: `1536 x 1024`
- non-transparent bbox: `[483,387,1068,454]`
- SHA-256: `ff751dd7eda90e2389ab856fa7a90b2d5a5dba72031aae29e0e6548ba0b1e75b`
- this is the exact foreground support extraction and remains above the cassette.

### `cassette-glass-habitacle.png`

- size: `1536 x 1024`
- non-transparent bbox: `[484,118,1068,390]`
- SHA-256: `1ebdcd2a3080899a4a5042a8e99eeda8d8fc943420ffedbd29532e673aab3837`
- represents the complete habitacle pane, not a cassette-shaped overlay;
- remains above mechanism, shell, title, backlight and support.

## Runtime stacking

Back to front:

```text
faceplate / deck cavity
cassette-cavity.png
cassette-reel-left.png + cassette-reel-right.png
cassette-shell.png
cassette title HTML/CSS
CSS cassette backlight
cassette-support-foreground.png
cassette-glass-habitacle.png
```

No reel pixels may ever be promoted above `cassette-shell.png` or the habitacle glass.

## Activation gate

Do not enable `cassette-layered-runtime-enabled` until all of the following are true:

1. all six binaries exist under `assets/looper-ui/`;
2. all SHA-256 values match this document;
3. native dimensions and alpha bounds match;
4. the staged CSS/JS are loaded without changing unrelated Looper UI behavior;
5. a static comparison confirms that the surrounding deck is unchanged;
6. the surgical verifier reports zero changed pixels outside the allowed cassette/window region for any faceplate edit;
7. the final animated browser view is visually reviewed at native geometry.

`assets/looper-ui/faceplate.webp` remains unchanged by this package freeze.
