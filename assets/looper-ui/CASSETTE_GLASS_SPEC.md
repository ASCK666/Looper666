# Cassette glass naturalness spec — step 10

This specification is binding for the cassette reconstruction on branch `faceplate-190826`.

## Goal

The deck glass must remain visually natural and must continue to read as the same physical window already present in the approved faceplate. It is a foreground layer above the cassette assembly, not a decorative effect.

## Geometry lock

- Native faceplate: `1536 x 1024`.
- Glass reference region remains `x=484..1067`, `y=118..389`.
- Do not move, resize, crop, rotate, reframe or reshape the window.
- The glass remains above mechanism, shell, cassette title and cassette lighting.

## Visual source of truth

Use the approved baseline faceplate as the source for glass character whenever possible.

Preserve or reproduce:

- the existing tint and darkness of the window;
- the existing edge response and depth;
- subtle low-contrast reflections already implied by the baseline;
- local variation rather than one uniform overlay.

Do not invent a new glossy treatment merely to make the glass more visible.

## Natural reflection requirement

Reject synthetic-looking reflections such as:

- one large straight diagonal white stripe;
- perfectly symmetric highlights;
- broad milky haze covering the reels;
- strong bloom that hides shell/mechanism detail;
- mirror-like chrome reflections inconsistent with the current deck;
- heavy blur used to fake depth.

Preferred reflection behavior:

- low contrast;
- irregular/asymmetric;
- sparse;
- soft-edged without becoming foggy;
- strongest near plausible glass edges or existing baseline reflection zones;
- transparent enough that the cassette remains clearly readable underneath.

The glass should be noticed as material when looking for it, but should not become the main visual subject.

## Layering

Back to front:

```text
faceplate / deck cavity
cassette mechanism
transparent cassette shell
cassette title HTML/CSS
CSS backlight contribution
exact lower support foreground
glass / reflections foreground
```

The glass must never render behind the animated reels.

## Validation

The glass candidate is accepted only if:

1. the deck geometry is unchanged;
2. the cassette remains readable through it;
3. no synthetic diagonal highlight dominates the window;
4. no fog or blur obscures reel geometry;
5. the static composite still reads like the approved deck rather than a newly redesigned window.

This step does not authorize any faceplate pixel edit by itself.
