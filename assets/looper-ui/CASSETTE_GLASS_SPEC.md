# Cassette glass naturalness spec — step 10

This specification is binding for the cassette reconstruction on branch `200826-clean-deck`.

## Goal

The deck glass must remain visually natural and must continue to read as the same physical window already present in the approved faceplate. It is a foreground layer above the cassette assembly, not a decorative effect.

## Geometry lock

- Native faceplate: `1536 x 1024`.
- The inner-habitacle glass mask occupies alpha bounds `x=477..1080`, `y=111..388` in the native canvas; the physical lower support masks its bottom edge.
- Preserve this rounded inner-opening contour; do not derive the window shape from the cassette box.
- The glass remains above mechanism, shell, cassette title and cassette lighting.

## Habitacle integration requirement

The glass must read as the glass of the complete deck habitacle / viewing bay, not as a transparent film placed directly on the cassette.

- the pane spans the full glass reference region and visually belongs to the surrounding bay;
- the transparent PNG contains glass-only optical contributions and no frame, support or cassette pixels;
- its depth cues must be strongest at the bay edges, corners and plausible frame contact zones rather than centered on the cassette body;
- low-level tint may exist across the full pane, but cassette readability must remain high;
- reflections and edge response must follow the habitacle/window as a whole, not the shape of the cassette;
- no rectangular or local overlay should visually terminate on the cassette footprint;
- the cassette must clearly read as recessed behind this foreground pane.

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
glass / reflections foreground, below the lower support lip
exact lower support foreground
```

The glass must never render behind the animated reels, but the physical lower support lip remains in front of it.

## Validation

The glass candidate is accepted only if:

1. the deck geometry is unchanged;
2. the cassette remains readable through it;
3. no synthetic diagonal highlight dominates the window;
4. no fog or blur obscures reel geometry;
5. the static composite still reads like the approved deck rather than a newly redesigned window;
6. the pane reads as belonging to the complete habitacle rather than being laid directly on the cassette.

This step does not authorize any faceplate pixel edit by itself.
