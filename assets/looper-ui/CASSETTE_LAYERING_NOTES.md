# Cassette layered reconstruction — implementation notes and retrospective

This document records the layer architecture, implementation logic, failure modes, and workflow lessons from the cassette reconstruction now cleaned on branch `200826-clean-deck`.

It is intentionally descriptive rather than a new visual specification. Binding geometry and material rules remain in the existing cassette specs.

## Current branch safety state

- active working branch: `200826-clean-deck`;
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
7. restore the habitacle glass/reflections above the full cassette assembly;
8. restore the exact lower foreground support above the glass edge.

The surrounding deck is never regenerated or repositioned to accommodate the cassette.

## Runtime layer order

The current runtime mounts the cassette layers in this back-to-front order:

```text
faceplate.webp / deck base
cassette cavity opaque CSS backing
cassette-cavity.png
cassette aperture mask
  cassette cartridge
  cassette-reel-left.png
  cassette-reel-right.png
  cassette-shell.png
cassette title HTML/CSS
cassette backlight CSS
cassette-glass-habitacle.png
cassette-support-foreground.png
```

The CSS uses the corresponding z-order:

- cavity: z 2;
- opaque cavity backing: z 1;
- fixed aperture mask containing the moving cartridge: z 3;
- inside the cartridge: reels z 2, shell z 3, dynamic title z 4;
- backlight: z 7;
- glass: z 8;
- support: z 9.

The stage fills the faceplate. A fixed mask clips cartridge motion to the measured habitacle aperture. Inside it, the cartridge wrapper moves the reels, shell and dynamic title together while the opaque cavity backing, lower support and habitacle glass remain fixed. The backing prevents the cassette baked into `faceplate.webp` from ghosting through during motion; the mask prevents the moving shell from crossing the deck frame.

## Geometry choices

The native coordinate system remains `1536 x 1024`.

Frozen cassette references:

- cassette box: global `x=497..1050`, `y=137..489` nominally;
- left reel center: approximately `(648,249)`;
- right reel center: approximately `(894,251)`;
- foreground support: approximately `x=483..1067`, `y=387..453`;
- inner-habitacle glass alpha bounds: `x=477..1080`, `y=111..388`; the lower support masks its bottom edge.

Shell, cavity, support and glass are cropped to their alpha bounds and positioned in native faceplate percentages, avoiding four unnecessary 1536x1024 decode surfaces. The glass occupies 604x278 at global `(477,111)` and is not derived from the cassette silhouette. The support occupies 585x67 at `(483,387)` and renders above it. The two reel assets are local `154 x 154` PNGs mounted around their fixed centers.

## Reel animation logic

The reel images rotate independently while their centers remain fixed. The current light physical calibration uses standard compact-cassette tape speed `4.75 cm/s` (`1 7/8 in/s`) and the visible current production radii:

- left radius: about `77.0 px`;
- right radius: about `76.75 px`;
- left period: about `1.848 s/turn`;
- right period: about `1.842 s/turn`.

This is deliberately not yet a full winding-radius simulation. A future simulation may vary angular speed as tape transfers, but must preserve the fixed linear tape speed.

## Insertion and responsive behavior

Loading or switching a beat restarts one cartridge insertion animation. Desktop uses a short `-9%` drop with mild perspective and a small seating overshoot; screens at or below `760px` use a faster `-6%` drop and reduced tilt. `prefers-reduced-motion` disables both insertion and reel rotation.

## Integrity gate and fail-safe behavior

`js/cassette-runtime.js` verifies every required binary before mounting the layered cassette. For each asset it checks:

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

## Side tape-strand experiment — retired

Earlier baseline-derived PNG attempts were abandoned because their geometry was difficult to keep tangent to the larger production reels and the integrity gate made each binary iteration expensive.

The later CSS replacement was also removed after visual review: the two lines converging toward the cassette center read as decorative bands rather than believable tape transport. The runtime must not draw those side strands.

The abandoned tape-path binary was removed from the deployable tree; its reconstruction history remains available in Git.

The production cavity is now fully opaque. This is intentional: the fallback faceplate still contains the rejected V-shaped route, and a translucent cavity allowed it to leak through the otherwise correct shell. The horizontal cassette details remain supplied by the production shell rather than the fallback artwork.

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
- `clean-200826` remains a recovery snapshot while cleanup continues on `200826-clean-deck`.
