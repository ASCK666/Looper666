# Cassette layer migration plan

This plan turns the approved Looper cassette into an independently owned visual component without redesigning the deck or changing Looper behavior.

It is an implementation plan only. Work starts only when the cassette migration is explicitly requested.

## Scope

The migration is surgical:

- keep the approved Looper faceplate as the visual reference;
- keep every non-cassette region unchanged;
- remove the baked cassette completely from the deck/base asset;
- rebuild only the pixels needed behind the removed cassette;
- move the cassette and its immediately required local visual surround into independently owned layer(s);
- preserve the existing reel animation and existing Looper transport/audio behavior.

No unrelated UI, controls, layout, audio, Practice or product behavior may change in this migration.

## Geometry contract

The cassette must remain visually identical in geometry to the approved baseline.

- Canonical deck space remains exactly `1536 x 1024`.
- Cassette position must not change.
- Cassette visible width and height must not change.
- Cassette aspect ratio must not change.
- Left and right reel centres must not move.
- Label position and dimensions must not change.
- Surrounding deck geometry must not be reframed, stretched or redesigned.

Store source rectangles and reel centres in canonical 1536 x 1024 coordinates. Runtime placement must derive from those canonical coordinates rather than viewport-specific magic numbers.

## Target ownership

### Deck/base asset

Owns the deck with the baked cassette fully removed.

The edit to the base asset must be limited to the smallest approved cassette-removal/reconstruction region. Outside that region, decoded output pixels must remain unchanged.

The reconstructed area behind the cassette must represent only the deck/bay material that should exist when the cassette component is not baked into the image. It must not invent a new deck design.

### Cassette component

Owns the cassette and any cassette-local pixels that must move with its visual ownership to avoid seams or double ownership.

Prefer the smallest useful layer set. Expected responsibilities are:

- shell / fixed cassette body;
- magnetic tape;
- left reel;
- right reel;
- static label substrate;
- optional reflections or local surround only when separation is necessary for visual fidelity.

Dynamic beat title text remains HTML and must not be baked into an image.

## Asset surgery rules

- Start from the approved repository asset; do not regenerate the whole faceplate.
- Define the allowed edit mask before modifying the base asset.
- Decode the final encoded asset and verify exactly `0` changed pixels outside the allowed mask.
- Preserve source geometry and encoding dimensions.
- Do not opportunistically retouch neighbouring controls, labels, screws, lighting, textures or chrome.
- Do not use generated replacement artwork as the production source unless separately and explicitly approved.
- If extracting one material damages another, stop broad retouching and change layer ownership instead of widening the repair indefinitely.

## Migration stages

### A. Freeze baseline

Capture the accepted cassette in Chromium at the canonical desktop view and representative mobile widths.

Capture at minimum:

- STOP state;
- PLAY state frame 1;
- PLAY state frame 2;
- representative speed state if reel timing varies with `data-speed-level`.

These images are comparison references, not replacement production assets.

### B. Build the deck/base without the cassette

Remove the baked cassette from the base asset and reconstruct only the newly exposed deck/bay region.

Acceptance:

- no cassette ghost remains;
- no double ownership remains;
- no visible seam outside the approved local region;
- no pixel outside the edit mask changes.

### C. Extract/build cassette layers off-runtime

Produce the required cassette layer assets using the approved baseline as source.

Document for each layer:

- provenance;
- canonical source rectangle;
- expected dimensions;
- alpha/transparency behavior;
- visual responsibility;
- any intentional antialiasing overlap with another layer.

### D. Static STOP parity

Compose the new base plus cassette layer stack without animation.

Do not cut over until the STOP-state composition is visually equivalent to the approved baseline at normal desktop size, native-resolution inspection and phone widths.

Numerical image checks support manual review; they do not replace it.

### E. Runtime cutover

Replace the baked cassette ownership exactly once.

- Mount one cassette stack aligned to the canonical deck coordinates.
- Keep the stack decorative and `pointer-events: none`.
- Keep existing real DOM controls and hit targets unchanged.
- Do not introduce duplicate cassette pixels in the base.
- Do not change transport or audio state ownership.

### F. Preserve reel animation

Reconnect the existing reel animation to the new left/right reel layers.

- Existing Looper PLAY/STOP state remains the source of truth.
- Existing `data-speed-level` coupling remains the source of truth where used.
- No second cassette PLAY/STOP state is allowed.
- No independent visual playback timer may decide whether the cassette is playing.
- Only the reels rotate during the initial migration.
- Shell, tape, label and local surround remain fixed.

## Mobile / responsive acceptance contract

Mobile support is part of the migration, not a follow-up polish pass.

- The full cassette stack must use one shared parent coordinate/transform context.
- All child geometry must scale from the canonical 1536 x 1024 coordinate system.
- No desktop/mobile-specific JavaScript offsets are allowed for layer alignment.
- Cassette, reels, label, reflections and surround must retain mutual alignment at all supported widths.
- Aspect ratio must remain stable in portrait phone layouts.
- Reel centres must not drift during responsive resizing or animation.
- Layer scaling must not create horizontal page overflow.
- Clipping must not cut off required cassette-local shadows/reflections.
- Decorative layers must never replace or shrink the real DOM touch targets.
- Test at least one narrow portrait phone viewport in addition to desktop Chromium.
- Where existing responsive tests cover Looper geometry, strengthen them rather than creating a separate mobile rendering system.

## Verification

Before merge:

- run `git diff --check`;
- run focused asset/render and responsive checks;
- run `python3 tools/test_all.py`;
- inspect desktop STOP and PLAY screenshots manually;
- inspect narrow phone STOP and PLAY screenshots manually;
- verify no motion outside reel regions between PLAY frames;
- verify no cassette ghosting in the base asset;
- verify no edit outside the approved base-asset mask;
- verify user-visible transport/audio behavior is unchanged.

Asset/runtime migration must remain a small, reviewable PR. Any aesthetic improvement beyond parity belongs in a later explicitly approved change.
