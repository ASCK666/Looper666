# Cassette reconstruction baseline

This file freezes the production reference before any cassette reconstruction work.

## Reference asset

- Branch: `faceplate-190826`
- Baseline branch head at capture: `e8e307f9c3096679a29146c1763ff52682c35776`
- Asset: `assets/looper-ui/faceplate.webp`
- Git blob SHA: `b40f4620595fd56a9365a99bfdafaa40018acbe1`
- Canvas: exactly `1536 x 1024`
- Format: WebP, RGB
- The user-supplied working copy was verified with `git hash-object` and produced the same blob SHA: `b40f4620595fd56a9365a99bfdafaa40018acbe1`.

This asset is the geometric and visual source of truth. Any later reconstructed result must be compared against it.

## Cassette inspection window

For analysis only, the exact cassette/deck study crop is:

- `x = 430`
- `y = 70`
- `width = 690`
- `height = 400`
- inclusive source bounds: `x 430..1119`, `y 70..469`

This rectangle is an **inspection window, not an allowed edit mask**. It deliberately includes surrounding deck/frame/support context so cassette depth and occlusion can be reconstructed without moving anything.

## Measured visual anchors

Measured on the baseline asset at native resolution:

- Left reel visible circular anchor: center approximately `(648, 249)`, visible outer ring radius approximately `45 px`.
- Right reel visible circular anchor: center approximately `(894, 251)`, visible outer ring radius approximately `44 px`.
- Bright cassette label field detected in the baseline: `x 561..991`, `y 155..190` (`431 x 36 px`).

The reel values are visual anchors only. Final animation transform origins must be validated against the extracted mechanism asset before implementation.

## Lower cassette occlusion

The cassette is recessed in the deck and its lower portion is hidden by the existing foreground support. The top of that foreground occlusion is around the high-380s in source Y, but it is not to be treated as a straight synthetic cut.

The actual foreground silhouette must be extracted from the baseline source and preserved as-is. Do not expose the lower cassette merely to simplify layering or animation.

## Immutable geometry rule

The following are locked to the baseline:

- full deck position and scale;
- cassette apparent position and scale;
- cassette recessed depth relationship;
- lower cassette occlusion by the support;
- deck frame, buttons, displays, labels, screws, Beat Crate and all unrelated geometry;
- glass/window geometry and surrounding visual structure unless a later step explicitly extracts it into a foreground layer without changing its appearance.

No element may be shifted, resized, reframed, redesigned or "improved" to accommodate the new cassette.

## Surgical verification rule

Before any production image edit:

1. define an explicit allowed pixel mask;
2. preserve the baseline decoded image;
3. perform the edit only inside the allowed mask;
4. encode the production asset;
5. decode it again;
6. compare against the baseline;
7. require exactly `0` changed pixels outside the approved mask.

## Step 1 status

Step 1 changes documentation only. No pixel, image asset, CSS, HTML or JavaScript production change is authorized or performed by this baseline commit.
