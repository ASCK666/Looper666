# Cassette production layer contract — step 5

This contract defines the exact geometry and z-order for the reconstructed cassette before any production asset is swapped in.

## Global coordinate system

- Native Looper faceplate: `1536 x 1024`
- All production cassette layers must be authored against this coordinate system or against the local cassette box defined below with no rescaling drift.
- No surrounding deck geometry may move or resize.

## Cassette local box

Nominal cassette box used for the layered reconstruction:

- global left: `497`
- global top: `137`
- global width: `554`
- nominal full height: `353`
- nominal global bottom: `489`

The lower portion extends behind the existing foreground support. It is intentionally not fully visible.

Local coordinate origin for cassette assets is therefore global `(497,137)`.

## Fixed local anchors

### Left reel

- global center: approximately `(648,249)`
- local center: approximately `(151,112)`
- current visible outer-ring reference radius: approximately `45 px`

### Right reel

- global center: approximately `(894,251)`
- local center: approximately `(397,114)`
- current visible outer-ring reference radius: approximately `44 px`

Final mechanism art may refine the tape-pack radius, but the reel axes themselves must not drift from these anchors without explicit visual review.

### White label field

Baseline reference:

- global: `x=561..991`, `y=155..190`
- cassette-local: `x=64..494`, `y=18..53`

The shell/static layer owns the white label material. The changing track/cassette name is HTML/CSS only.

## Foreground support lock

Existing lower deck support / occlusion:

- global `x=483..1067`
- global `y=387..453`

This support remains visually above the cassette and hides its lower portion. Do not replace it with a straight crop.

The exact baseline extraction created during step 3 is the reference foreground asset.

## Glass reference

Current viewing-window/glass reference region:

- global `x=484..1067`
- global `y=118..389`

Glass/reflections must render above the cassette assembly. Its appearance and geometry must match the approved baseline rather than introducing a new window treatment.

## Required production layers

The planned production assets are logically:

1. `cassette-mechanism` — transparent background, animated content only;
2. `cassette-shell` — complete transparent/translucent cassette shell, including static white label material;
3. HTML/CSS cassette title — runtime text;
4. CSS backlight — runtime on/off lighting contribution;
5. `cassette-support-foreground` — exact lower support/occlusion from baseline;
6. `cassette-glass-foreground` — glass/reflections above the assembly.

A combined foreground asset may eventually contain support + glass only if doing so preserves the approved baseline exactly and does not prevent correct lighting depth.

## Mechanism contract

The mechanism layer is behind the shell at all times.

It must contain two independently rotatable reel/tape assemblies centered on the fixed anchors.

Each wound tape pack must be mechanically readable as a true circular winding:

- circular outer tape contour;
- circular/concentric winding texture;
- no horizontal ridge / mini-mountain;
- no cloudy or smeared blur;
- no flattened tape pillow;
- no clockwork, gears or decorative mechanisms;
- no excessive tape thickness that makes full rewind impossible.

Tape quantity must remain physically plausible: when one side gains tape, the other can lose it. The visual design must leave enough radial capacity for rewind/play animation states.

The real lower tape route may be represented in the mechanism, but it stays hidden where the shell/support hide it.

## Shell contract

The shell is a full cassette body, transparent/translucent plastic, in front of the mechanism.

- no large central hole;
- mechanism seen through plastic;
- realistic plastic tint/reflection/refraction cues;
- no baked changing title;
- label field stays static;
- same apparent cassette scale and placement as baseline.

## Runtime stacking contract

Back to front:

```text
faceplate / deck cavity
cassette mechanism (animated)
cassette shell (transparent)
cassette title HTML/CSS
cassette backlight CSS contribution(s) at calibrated depth
exact lower support foreground
deck glass / reflections
```

No animation may ever promote reel pixels above the shell or glass.

## Visual no-op requirement before activation

Code can be prepared before final assets are accepted, but until activation the current faceplate must remain visually unchanged.

The new layered system must be enabled only after:

- mechanism asset approval;
- shell asset approval;
- foreground/glass approval;
- static composite comparison against the current faceplate;
- successful surgical pixel-bound verification for any faceplate edit.

## Step 5 status

Step 5 is complete when this geometry/layer contract is frozen. It does not authorize a production faceplate edit by itself.
