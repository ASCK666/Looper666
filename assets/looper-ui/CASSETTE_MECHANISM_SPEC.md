# Cassette mechanism reconstruction spec

This specification is binding for the cassette reconstruction on branch `faceplate-190826`.

## Scope

Only the cassette mechanism and its dedicated cassette layers may be rebuilt. The surrounding deck is immutable. Positions, dimensions, scale, framing, support geometry, controls, glass geometry, labels, screws, Beat Crate and all unrelated details must remain unchanged.

The cassette remains recessed in its existing holder. Its lower portion remains hidden by the existing foreground support exactly as in the approved baseline.

## Layer order

From back to front:

1. cassette mechanism animation;
2. full transparent/translucent cassette shell;
3. cassette name rendered in HTML/CSS over the white label field;
4. CSS-controlled cassette backlight as appropriate to reproduce the approved lighting;
5. foreground deck support / occlusion and deck glass according to their real depth.

The animated mechanism must always remain visually behind the cassette shell.

## Reel and tape geometry

The cassette mechanism must read as a realistic compact cassette mechanism, not as decorative clockwork or invented machinery.

Each reel must have:

- a centered circular hub;
- a distinct circular pack of magnetic tape wound concentrically around that hub;
- a clean, stable circular outer contour;
- plausible tape thickness for a rewound / partially wound cassette;
- subtle concentric tape texture only;
- no flattened horizontal mass through the center;
- no horizontal ridge, hump, "mini mountain" or wedge crossing the reel;
- no grey fog, smeared blur or soft amorphous mass around the wound tape;
- no oversized tape pack that would make rewinding physically implausible.

The left and right tape packs must remain visually distinct. The tape quantity may differ between sides, but both packs must remain mechanically plausible and circular.

The lower tape path may exist in the mechanism layer for physical coherence, but it remains hidden where the full cassette shell and foreground support hide it. It must not be exposed merely to make the animation more visible.

## Animation requirement

The animation concerns the complete visible rotating reel/hub mechanism, not only a cross, spoke or center glyph.

Rotation origins must be validated against the final extracted/generated mechanism asset before implementation. The current baseline visual anchors are approximately:

- left reel center: `(648, 249)` in native `1536 x 1024` faceplate coordinates;
- right reel center: `(894, 251)`.

These are alignment anchors, not permission to move or resize the cassette.

## Shell requirement

The cassette shell is a complete transparent/translucent plastic body in front of the mechanism. There is no large central hole through the shell. The mechanism is seen through the plastic.

The white cassette label area belongs to the shell/static visual layer, but the cassette/track name must not be baked into the image; it is rendered dynamically in HTML/CSS.

## Lighting

Do not invent a new lighting treatment. Reproduce the existing approved amber cassette/deck backlighting. The controllable on/off component should be implemented in HTML/CSS where practical so it can transition without regenerating image assets.

## Validation

Reject the result if any of the following occurs:

- a reel reads as non-circular or horizontally flattened;
- a horizontal hump/ridge appears through the tape pack;
- blur or fog obscures the wound tape geometry;
- the tape packs are implausibly thick;
- decorative clockwork or unrelated machinery appears;
- the mechanism renders in front of the cassette shell;
- the lower cassette becomes more exposed than in the baseline;
- any surrounding deck element moves, changes size, is reframed or is visually redesigned.

The production goal is deliberately conservative: a realistic transparent compact cassette with a physically readable rotating mechanism, while preserving the approved deck exactly.
