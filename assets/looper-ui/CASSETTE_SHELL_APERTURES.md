# Cassette shell spindle apertures — step 12

This clarification is binding for the cassette reconstruction on branch `faceplate-190826`.

## Physical shell rule

The cassette shell remains a complete transparent/translucent plastic body. There is no large central opening through the cassette face.

The shell does, however, contain the two real localized mechanical openings required around the reel-drive hubs so the deck spindle/drive mechanism can engage each reel.

## Fixed centers

- left drive/reel axis: approximately `(648,249)` in the native `1536 x 1024` faceplate;
- right drive/reel axis: approximately `(894,251)`.

These openings are centered on the fixed reel axes and must not be used as permission to move or resize the cassette.

## Visual requirement

- no single large window joining the two reels;
- no broad central cutout;
- the wound tape pack remains behind transparent plastic;
- only the local hub/drive engagement zones read as true shell openings;
- the two openings remain visually separate and mechanically plausible;
- shell tint, reflections and material continuity remain visible around the openings;
- mechanism rotation remains behind the shell everywhere except the physical spindle apertures themselves.

## Current candidate geometry

The step-12 candidate uses a conservative circular aperture radius of `29 px` around each fixed axis while the candidate reel asset radius is `77 px`. This radius is a reviewable candidate value, not authorization to alter any surrounding deck geometry.

## Validation

Reject any shell candidate if it reads as a cassette with one large central hole, if the two apertures merge visually, if the tape pack appears outside the shell material, or if the deck/cassette placement changes.
