# Cassette depth / mask specification

This file defines the geometry and depth separation for the cassette reconstruction on branch `200826-clean-deck`.

The source of truth remains `assets/looper-ui/faceplate.webp`, baseline Git blob SHA `b40f4620595fd56a9365a99bfdafaa40018acbe1`, canvas `1536 x 1024`.

## Scope of this step

This step defines geometry only. It does **not** authorize a production pixel edit yet.

The goal is to lock the exact depth logic before the current cassette is removed: cassette behind shell, shell behind glass, and the existing lower deck support remaining in front so the cassette stays recessed exactly as in the approved faceplate.

## Measured depth regions

Coordinates below are native `1536 x 1024` source pixels.

### 1. Glass / viewing aperture reference

Current inner viewing region:

- left: `x = 477`
- top: `y = 111`
- right: `x = 1080`
- bottom: `y = 388`

Current inner-habitacle alpha region: `(477, 111) .. (1080, 388)`.

This is **not** an edit rectangle. It is the region whose glass tint/reflections must visually remain above the cassette assembly in the final stack.

The surrounding black deck/window frame remains immutable.

### 2. Current visible cassette footprint

Measured visible cassette body envelope before lower support occlusion:

- left edge: approximately `x = 497`
- top edge: approximately `y = 137`
- right edge: approximately `x = 1050`
- visible lower limit: `y = 387`

Reference rectangle: `(497, 137) .. (1050, 387)`.

This is the cassette reconstruction footprint, not permission to alter neighboring pixels indiscriminately. The final approved edit mask must follow the actual cassette silhouette / required cleanup area rather than blindly fill this rectangle.

### 3. Nominal full cassette geometry behind the support

The cassette must continue behind the lower foreground support rather than ending at the visible cut line.

For reconstruction layout, use the locked nominal cassette box:

- `x = 497 .. 1050`
- `y = 137 .. 489`

Nominal size: `554 x 353 px` including endpoints.

The lower part from approximately `y = 387` downward is intentionally hidden in the assembled UI. It exists so the shell/mechanism geometry remains physically coherent and the cassette reads as inserted into the deck.

Do **not** reveal this lower portion to make implementation easier.

### 4. Foreground lower support — hard keep-out

The existing lower support in front of the cassette begins at the strong source edge around `y = 387/388`.

Conservative foreground reference:

- left: `x = 483`
- top: `y = 387`
- right: `x = 1067`
- bottom: `y = 453`

Reference rectangle: `(483, 387) .. (1067, 453)`.

This region is a **hard preserve / foreground occluder** for cassette reconstruction. The real silhouette and rounded/angled details must be retained from the baseline; do not replace it with a synthetic straight bar.

The cassette layers must pass behind this foreground support.

### 5. Cassette label field

Measured bright label field:

- `x = 560 .. 992`
- `y = 154 .. 191`

The static shell asset keeps the physical white label/paper area, but the cassette name itself must not be baked into that asset. Runtime text is HTML/CSS.

### 6. Reel anchors

Baseline visual centers:

- left reel: approximately `(648, 249)`
- right reel: approximately `(894, 251)`

Visible ring radii in the flattened source are approximately `45 px` and `44 px` respectively.

These values lock placement only. They do not prescribe tape-pack thickness. The rebuilt mechanism must remain physically rewindable: tape mass can transfer from one reel to the other without both reels being simultaneously overfilled.

## Final depth stack

Back to front:

1. cleaned deck/background behind cassette;
2. animated cassette mechanism (reels + physically coherent tape path);
3. complete transparent/translucent cassette shell;
4. cassette name rendered in HTML/CSS on the white label area;
5. CSS cassette backlight / glow system;
6. preserved glass/window tint and reflections;
7. preserved lower deck support / other true foreground occluders.

The animated mechanism is always behind the shell. The shell is never treated as a hollow frame with a large center cutout.

## Backlight separation note

The current baseline contains baked amber illumination around the cassette window. Because the target implementation requires a controllable CSS `on/off` backlight, removal of baked illumination will be handled as its own explicitly bounded cleanup operation.

Do not expand the cassette edit mask to the entire window merely for convenience. The backlight cleanup mask must be defined separately before that edit is executed.

## Immutable surroundings

Everything outside explicitly approved cassette/backlight masks remains unchanged pixel-for-pixel. In particular:

- deck frame;
- transport controls;
- displays;
- right-side buttons;
- screws;
- Beat Crate;
- current window/support geometry;
- cassette placement and apparent scale.

No resize, move, reframe, creative redesign or opportunistic cleanup is allowed.

## Verification gate before first production pixel edit

Before changing `faceplate.webp`:

1. generate the actual binary allowed mask(s) at `1536 x 1024`;
2. verify protected support pixels are excluded;
3. verify all pixels outside allowed masks remain locked;
4. keep the baseline decoded raster for comparison;
5. after encoding, decode and require `outside_changed_pixels == 0`.

Step 2 is complete only when the mask geometry is reviewable independently from the production asset.
