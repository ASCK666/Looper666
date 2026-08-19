# Cassette layered reconstruction — implementation notes and retrospective

This document records the layer architecture, implementation logic, failure modes, and workflow lessons from the cassette reconstruction on branch `faceplate-190826`.

It is intentionally descriptive rather than a new visual specification. Binding geometry and material rules remain in the existing cassette specs.

## Current branch safety state

- active working branch: `faceplate-190826`;
- safety snapshot branch: `clean-200826`;
- `clean-200826` was created from commit `8a62cac2f6b4afe313827413c44746316881cb05` and must remain untouched unless explicitly used for recovery;
- no automatic merge is authorized.

## Why the cassette was split into layers

The original `faceplate.webp` is the visual source of truth, but its cassette is baked into one static image. The reconstruction separates only the cassette region so the reel mechanisms can rotate while the surrounding deck remains pixel-stable.

The chosen strategy is conservative:

1. keep the approved full faceplate as the base image;
2. cover/reconstruct only the cassette cavity;
3. place independently rotatable reel assets at fixed reel axes;
4. place the complete translucent cassette shell above the mechanism;
5. render changing cassette/track text in HTML/CSS rather than baking it into the shell;
6. add the approved amber light contribution in CSS;
7. restore the exact lower foreground support above the cassette;
8. restore the habitacle glass/reflections above the full cassette assembly.

The surrounding deck is never regenerated or repositioned to accommodate the cassette.

## Runtime layer order

The current runtime mounts the cassette layers in this back-to-front order:

```text
faceplate.webp / deck base
cassette-cavity.png
cassette-tape-path.png   (legacy compatibility layer; see below)
cassette-reel-left.png
cassette-reel-right.png
cassette-shell.png
cassette title HTML/CSS
cassette backlight CSS
cassette-support-foreground.png
cassette-glass-habitacle.png
```

The CSS uses the corresponding z-order:

- cavity: z 2;
- legacy tape-path: z 3;
- reels: z 4;
- shell: z 5;
- dynamic cassette title: z 6;
- backlight: z 7;
- support: z 8;
- glass: z 9.

The stage uses `display: contents` when enabled so the existing dynamic cassette title can remain correctly interleaved between shell and glass rather than being trapped in one stacking context.

## Geometry choices

The native coordinate system remains `1536 x 1024`.

Frozen cassette references:

- cassette box: global `x=497..1050`, `y=137..489` nominally;
- left reel center: approximately `(648,249)`;
- right reel center: approximately `(894,251)`;
- foreground support: approximately `x=483..1067`, `y=387..453`;
- glass region: approximately `x=484..1067`, `y=118..389`.

Static shell/cavity/support/glass assets are full-canvas transparent PNGs so they can be mounted at `(0,0)` with no rescaling or coordinate drift. The two reel assets are local `154 x 154` PNGs mounted around their fixed centers.

## Reel animation logic

The reel images rotate independently while their centers remain fixed. The current light physical calibration uses standard compact-cassette tape speed `4.75 cm/s` (`1 7/8 in/s`) and the visible current production radii:

- left radius: about `77.0 px`;
- right radius: about `76.75 px`;
- left period: about `1.848 s/turn`;
- right period: about `1.842 s/turn`.

This is deliberately not yet a full winding-radius simulation. A future simulation may vary angular speed as tape transfers, but must preserve the fixed linear tape speed.

## Integrity gate and fail-safe behavior

`js/cassette-runtime.staged.js` verifies every required binary before mounting the layered cassette. For each asset it checks:

- exact filename/path;
- width and height;
- alpha bounding box;
- SHA-256 hash.

Only after the complete package passes verification does the runtime mount and enable the layered cassette.

This is an important fail-safe: if one binary is wrong, misplaced, stale, or has a mismatched hash/bbox, the layered runtime does not partially mount. `bootstrap.js` catches the failure, unmounts the cassette runtime, and leaves the original `faceplate.webp` visible.

That fallback can look like a large visual rollback because the original baked cassette reappears and the reel animation disappears. It is not necessarily a Git rollback; it usually means the asset integrity gate refused the current package.

## Problems encountered

### 1. Original cassette visible briefly before the layered runtime

The base faceplate is loaded first. The cassette runtime then loads asynchronously, verifies all binaries, mounts them, synchronizes state, and enables the layered stage. Therefore details baked into the original cassette can be visible briefly before the layered cassette covers them.

This is a bootstrap sequencing effect, not proof that those details exist in one of the layered assets.

### 2. Mechanism content hidden by the shell

A mechanism element placed physically below the shell can disappear if the shell pixels over that area are too opaque. An attempted workaround duplicated the element above the shell as an optical/transmission copy. That was rejected because it made mechanism pixels read as if they were painted on top of the cassette.

The correct depth rule is unchanged: mechanism below shell; never duplicate mechanism above shell just to force visibility.

### 3. Reusing already-composited baseline pixels can double material effects

Pixels copied directly from `faceplate.webp` already contain the visual influence of the original cassette plastic, glass, lighting, and surrounding composition. If those same pixels are then placed under the reconstructed shell and glass, they are effectively composited through material effects a second time. A literal pixel copy is therefore not automatically a literal final visual match.

### 4. Baseline reel geometry and current reel geometry differ

The current production reel/tape-pack assets are larger than the visible reel geometry in the original baseline. Coordinates that visually touched a baseline reel can end up hidden behind the current larger reel. This made attempts to transfer small tape details directly from baseline coordinates unreliable.

### 5. Wrong repository path during binary upload

One binary was uploaded to `assets/cassette-tape-path.png` instead of `assets/looper-ui/cassette-tape-path.png`. The runtime correctly continued reading the old file at the expected path.

For binary handoff, the destination repository path must be treated as part of the asset contract, not as a user-interface detail.

### 6. Candidate alpha bounds exceeded the allowed cassette region

A later tape-path candidate used a mask whose alpha bbox extended outside the locked cassette box. It should never have been presented as push-ready. The runtime integrity guard was not updated to accept it, which prevented that invalid candidate from becoming active.

This exposed a process problem: candidate validation must finish before binary handoff, not after.

### 7. Hash/bbox mismatch looked like a full rollback

When a new binary was pushed while the runtime still expected the previous binary hash/bbox, `verifyAssetPackage()` failed. The fail-safe then left only `faceplate.webp`, producing the appearance of an old design with no animation.

The correct diagnosis order for this symptom is:

1. inspect the current branch HEAD;
2. inspect the last changed filenames;
3. verify the binary at the exact runtime path;
4. compare its Git blob/hash/bbox with the runtime `EXPECTED` entry;
5. only then consider an actual branch rollback.

## Side tape-strand experiment — abandoned

The attempts to reproduce visible side tape strands beside the two reels are explicitly abandoned as of this note.

Do not continue, refine, regenerate, tangent-fit, extract, or otherwise reintroduce those side strands unless the user explicitly reopens that visual requirement.

`cassette-tape-path.png` is currently retained only because the staged runtime package still expects that binary and its integrity metadata. Its presence in the package must not be interpreted as an active requirement to make visible side strands.

If this legacy layer is removed later, do it as one coordinated cleanup: runtime asset list, `EXPECTED` guard, CSS z-order/commentary, shell transparency corrections if relevant, and package documentation must be updated together. Do not remove only the PNG.

## Safe binary-asset workflow from now on

Before any new cassette PNG is handed off for Git upload:

1. reread all binding cassette specs;
2. build the candidate locally against the current production assets;
3. inspect a native-resolution static composite;
4. inspect animation if the change can affect moving layers;
5. verify the candidate alpha bbox is inside its explicit allowed region;
6. verify dimensions and exact destination repository path;
7. compute SHA-256 and Git blob SHA locally;
8. only then provide the binary for upload;
9. after upload, verify the remote file on the intended branch and exact path;
10. confirm the remote blob matches the candidate before changing runtime hashes/bboxes;
11. update the runtime guard and documentation only after remote binary verification;
12. keep the safety branch untouched throughout the experiment.

A binary push and a runtime integrity update are two separate operations. Never assume one succeeded because the other was requested.

## Stable design principles to preserve

- `faceplate.webp` remains the visual source of truth for the surrounding deck;
- no whole-faceplate regeneration for a cassette-local correction;
- cassette position, scale, framing, support and glass geometry stay fixed;
- mechanism remains behind shell and glass;
- dynamic title stays HTML/CSS;
- reel rotation centers remain fixed;
- integrity failure must fail safe to the approved base faceplate rather than mount a partial cassette;
- no automatic merge;
- `clean-200826` remains a recovery snapshot while work continues on `faceplate-190826`.
