# Cassette visual reference checkpoint

This file records the approved visual direction for the cassette/cabin rebuild on `feat/cassette-layer-extraction`.

The approved reference shown in the working session is a **visual target only**. It is not automatically a production raster source and must not silently replace repository artwork.

## Reference geometry

- canonical canvas: `1536 x 1024`
- cassette/cabin position: unchanged from the existing Looper faceplate coordinate system
- cassette visible dimensions: must remain unchanged
- reel centres: must remain at the existing calibrated positions
- lower cassette edge/crop: must remain exactly aligned with the accepted visual baseline
- no viewport-specific offsets are allowed

## Working-session reference fingerprint

The approved reference image used for visual comparison in this session had:

- dimensions: `1536 x 1024`
- SHA-256: `b6add51692bce866fe7d97f41f29285eb2ead433fea015e1aea9ac3f5d339e1b`

The repository source `assets/looper-ui/faceplate.webp` supplied for surgery had:

- dimensions: `1536 x 1024`
- SHA-256: `5ecb29006a3908d3cc111e8c00cd2aadb38f9a2098117fccb47522ba6189ca2b`

These fingerprints exist to prevent accidental substitution of a different visual source during later extraction work.

## Approved visual direction

The target direction is:

- rebuild the cassette and its immediate cabin as one coherent visual area;
- preserve the existing Looper deck geometry outside that area;
- keep the two real reel mechanisms aligned with the existing animation contract;
- use realistic magnetic-tape winding/path rather than inherited distorted tape shapes;
- use a clean, sharp blank white cassette label substrate;
- preserve the cabin glass and warm retro backlighting;
- allow local backlight/glass adjustment only when required to remove seams after layer separation;
- do not redesign unrelated controls or deck materials.

Any adjustment to cabin lighting, glass, cassette proportions, reel centres, or cassette position must be reported to the user before it is made.

## Mobile acceptance

The same canonical coordinates and one parent transform context must be used at desktop and phone sizes.

Acceptance requires:

- no reel/cassette drift at narrow mobile widths;
- no special mobile pixel offsets;
- cabin glass, cassette, label and reels stay registered to each other;
- no horizontal overflow caused by the new component;
- visual STOP and PLAY checks at representative phone width before cutover.
