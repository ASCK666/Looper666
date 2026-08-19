# Cassette extraction baseline

This directory is the staging area for the Looper cassette layer migration.

The work is surgical. It starts from the approved repository asset and must not redraw or regenerate the deck from scratch.

## Immutable geometry

Canonical source canvas: `1536 x 1024`.

Current cassette positioning reference, inherited from the accepted reel-animation runtime:

- left: `30.5%`
- top: `10.7%`
- width: `38.7%`
- height: `27.6%`

For the non-destructive reference extraction only, the enclosing integer source box is:

- `x0 = 468`
- `y0 = 109`
- `x1 = 1064`
- `y1 = 393`

This box is an enclosure/reference coordinate space. It is **not** approval to erase that full rectangle from the deck asset.

Reel centres remain fixed at the existing calibrated positions (approximately `648.0, 248.9` and `893.5, 248.9` in canonical pixels). Final extraction must preserve those centres exactly as validated by the existing runtime/tests.

## First reversible step

`tools/extract_cassette_reference.py` creates a full-canvas transparent reference layer from the current `assets/looper-ui/faceplate.webp`.

The copied pixels remain at their original canonical coordinates. The output is for inspection and mask design only; it is not a production replacement asset and does not alter `faceplate.webp`.

Expected local output:

`test-artifacts/cassette-reference.png`

## Rules before production extraction

- Start only from the current approved repository `faceplate.webp`.
- Do not resize, crop/reframe, rotate or move the cassette geometry.
- Do not invent replacement deck/cassette pixels.
- Do not modify the runtime or animation during the reference-extraction step.
- Do not neutralize the baked cassette until the silhouette/effects mask has been visually reviewed.
- The final removal mask must follow cassette-owned pixels and cassette-local effects rather than blindly removing the full reference rectangle.
- Non-cassette deck pixels remain owned by the faceplate.
- Mobile alignment must derive from the same canonical coordinates; no viewport-specific correction offsets.
- Any production asset edit requires decoded-pixel verification against the approved source and `0` changed pixels outside its approved mask.


## First runtime cutover

The first runtime cutover intentionally uses one static `cassette-static.webp` layer for the cabin/cassette materials while retaining the already-calibrated exact reel crops from `faceplate.webp`. This keeps PLAY/STOP and speed ownership unchanged while STOP/PLAY/mobile parity is validated. Separate lossless reel files remain a later asset-only follow-up after this runtime gate.
