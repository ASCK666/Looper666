# Cassette/cabin layer ownership

This checkpoint defines the next asset split before any runtime cutover.

It does not authorize unrelated redesign, geometry changes, or transport/audio changes.

## Shared coordinate contract

All visual layers use the canonical `1536 x 1024` Looper coordinate space and remain registered to one parent transform context.

No production layer may introduce a different cassette size, position, reel centre, or mobile-specific alignment offset.

## Planned visual ownership

### Deck base

Owns:

- Looper chassis outside the cassette/cabin area;
- surrounding panel material;
- controls and unrelated baked deck details.

Must not own a second visible copy of the cassette after cutover.

### Cabin / glass / local backlight

Owns only the immediate cassette bay presentation:

- cabin recess/background;
- glass/window material;
- cabin-local reflections;
- warm backlighting that belongs to the bay rather than to cassette material.

This layer stays fixed. It does not animate with PLAY/STOP.

Backlight/glass may be adjusted only to remove a visible seam or restore the approved visual target after separation. The user must be told before such an adjustment.

### Cassette fixed body

Owns:

- fixed shell/body;
- fixed cassette moulding and wear;
- clean blank white label substrate;
- fixed cassette-local reflections and shadows that belong to the cassette rather than the cabin;
- fixed tape-window framing and lower cropped cassette edge.

Must not contain rotating reel copies after cutover.

### Magnetic tape

Owns realistic dark magnetic tape packs/path around the reel mechanisms.

Requirements:

- physically credible reel winding geometry;
- no inherited warped/bulging tape shapes from prior damaged cassette edits;
- no independent animation in the first migration pass;
- no change to cassette or reel geometry in order to make the tape fit.

### Left reel / right reel

Own the existing real rotating mechanisms.

Requirements:

- preserve calibrated centres and visible diameter;
- preserve existing PLAY/STOP ownership;
- preserve `data-speed-level` coupling;
- only these rotating mechanisms receive continuous rotation;
- do not create a second transport state or animation controller.

### Dynamic label text

Remains real HTML above the cassette label substrate.

It must not be baked into raster artwork.

## Planned z-order

Back to front:

```text
0  deck base
10 cabin recess / local backlight
20 cabin glass/back reflections as required
30 magnetic tape
40 left + right reel mechanisms
50 fixed cassette body / shell
60 fixed cassette label substrate
70 front glass/reflections if required by the approved reference
80 dynamic HTML beat title
```

The exact split between cabin glass reflections and cassette-local reflections may be reduced after visual inspection. It must not be expanded merely for architecture neatness.

## First implementation gate

Before runtime changes, produce a static STOP composite and compare it against the approved visual reference.

Do not proceed to runtime cutover until:

- cassette dimensions and position match;
- lower crop matches;
- reel centres match;
- white label is sharp and correctly positioned;
- tape geometry is visually credible;
- cabin glass/backlight reads as one coherent bay;
- no seam appears against the untouched deck;
- the same alignment holds at representative phone width.

Any decision that changes these ownership boundaries or visual geometry must be reported to the user before implementation.
