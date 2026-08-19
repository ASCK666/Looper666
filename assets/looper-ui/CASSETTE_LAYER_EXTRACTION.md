# Cassette layer extraction — step 3

This document freezes the layer-extraction work performed from the approved `faceplate.webp` baseline before any cassette reconstruction.

## Source of truth

- Branch: `faceplate-190826`
- Source asset: `assets/looper-ui/faceplate.webp`
- Source Git blob SHA: `b40f4620595fd56a9365a99bfdafaa40018acbe1`
- Native canvas: `1536 x 1024`

No production pixel is modified by this step.

## Exact foreground support extraction

The current deck support that visually hides the lower part of the cassette has been extracted pixel-for-pixel from the approved baseline.

Source rectangle:

- `x = 483..1067`
- `y = 387..453`
- extracted tight size: `585 x 67`

Generated local working files:

- `cassette_support_foreground.png` — full-canvas transparent layer, `1536 x 1024`
- `cassette_support_foreground_crop.png` — tight `585 x 67` crop
- `cassette_visible_reference.png` — untouched visual reference crop, source `x=497..1050`, `y=137..386`, size `554 x 250`

SHA-256 values:

- `cassette_support_foreground.png`: `ff751dd7eda90e2389ab856fa7a90b2d5a5dba72031aae29e0e6548ba0b1e75b`
- `cassette_support_foreground_crop.png`: `f154c3be5c32ee16581a4802dcae1646a5f61b8f2b6c8587842e34d8ae1be74e`
- `cassette_visible_reference.png`: `559c11960a67324db2c06c8dfa62352e5417fb516d8d26ca7c87d8d9ca0559d5`

These binary working files are not silently substituted for production assets. They are staging artifacts until explicitly reviewed and pushed.

## Foreground rule

The extracted support remains **in front of the cassette assembly** in the final compositing stack.

Its purpose is to preserve the exact current recessed appearance of the cassette, including the fact that its lower section is hidden by the deck/support.

Do not replace this with a straight artificial crop, a generic mask, or a redesigned support.

## Reel / tape mechanism specification

The animated mechanism sits behind the transparent cassette shell.

Each reel must read as a real cassette reel:

- circular hub;
- circular tape pack around the hub;
- concentric winding structure;
- clean, stable circular outer contour;
- realistic tape quantity split between left and right reels;
- no excessive reel thickness that would make rewinding physically implausible.

Forbidden reel artifacts:

- horizontal ridge, hump or "mini mountain" across the reel;
- flattened or pillow-shaped tape pack;
- cloudy blur inside the wound tape mass;
- diffuse dark smear joining the reels;
- non-mechanical decorative shapes;
- clockwork / gear reinterpretation;
- any reel geometry that is not rotationally coherent.

The lower tape path may exist mechanically, but it remains hidden where the full transparent cassette shell and foreground deck support hide it.

## Shell rule

The cassette shell is full and transparent/translucent. It does not have a large open hole in the middle. The mechanism is seen through the shell material.

The white label area stays part of the shell/static artwork. The changing cassette name is rendered by HTML/CSS.

## Lighting rule

The currently approved cassette/deck backlighting must be reproduced without inventing a new lighting design. The controllable on/off component should remain an HTML/CSS effect where practical.

## Depth order

Back to front:

1. deck/background cavity;
2. animated reel/tape mechanism;
3. full transparent cassette shell;
4. cassette name HTML/CSS;
5. CSS backlight contribution at the physically appropriate depth;
6. exact extracted lower foreground support / occlusion;
7. deck glass / reflections above the cassette assembly.

The mechanism must never render in front of the shell.

## Geometry lock

No deck element may move, resize, crop, stretch, reframe, relight or be redesigned during this work.

The cassette keeps the same approved position, apparent size and recessed depth relationship as the baseline.

## Step 3 status

Step 3 is complete when:

- foreground support is extracted from baseline pixels;
- its hashes are recorded;
- reel constraints are frozen;
- no production image/CSS/HTML/JS file is changed.
