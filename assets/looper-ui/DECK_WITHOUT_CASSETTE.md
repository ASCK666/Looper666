# Deck without cassette — canonical asset

This branch isolates the approved **Looper deck without cassette** as a visual source asset. It is intentionally separate from cassette reconstruction/runtime work.

## Canonical source

- asset: `assets/looper-ui/deck.png`
- canonical canvas: `1536 x 1024`
- format: PNG, preserved from the working-session source without resize/reframe
- expected SHA-256: `cde9e0137fca8acb13c05ea575bc051f8a034d509e0bb2c6947ea001a85f228e`

## Ownership

This asset owns the Looper deck/chassis **without a cassette**. It is the clean base to use when rebuilding the cassette/cabin as independent layers.

It must not acquire a baked cassette, reel animation, cassette label, cassette-local reflections, or cassette-local backlight.

## Geometry contract migrated from cassette extraction docs

All cassette/cabin work placed over this deck uses the canonical `1536 x 1024` coordinate system.

The established cassette/cabin registration must preserve:

- cassette size and position;
- calibrated reel centres (approximately `648.0, 248.9` and `893.5, 248.9` canonical pixels unless a later explicitly approved calibration supersedes them);
- lower cassette edge / encastrement in the cabin;
- one shared transform context at desktop and mobile;
- no viewport-specific correction offsets.

The historical cassette reference enclosure used during extraction was `x=468..1064`, `y=109..393`; it is a reference coordinate space, **not** an erase mask for this deck.

## Layer contract for future cassette rebuild

Back to front, the intended independent visual ownership is:

1. this deck base;
2. cassette-bay retro backlight;
3. reel/tape mechanisms, with PLAY/STOP and speed animation ownership unchanged;
4. fixed cassette plastic shell;
5. cabin glass/front structure, including the foreground lip that keeps the lower cassette edge visually encastrée;
6. dynamic HTML label text where applicable.

The deck itself remains fixed and does not participate in PLAY/STOP animation.

## Visual constraints

- Do not redraw or regenerate unrelated deck controls/materials while working on the cassette.
- Do not move/resize the deck to make a cassette layer fit.
- Cassette layers must fit this canonical deck instead.
- The cabin/glass is the nearest raster layer to the user and may occlude the lower cassette edge.
- Reel centres and visible diameter must remain registered to the animation contract.
- Mobile uses the same canonical geometry; no special mobile offsets.

## Provenance

This file was migrated from the working-session asset previously kept outside Git as:

`interface_looper_rétro_futuriste_et_beat_crate.png`

The branch exists specifically so this clean deck source cannot be confused with the current runtime faceplate or with experimental cassette composites.
