# Looper faceplate editing convention

`assets/looper-ui/faceplate.webp` is the single visual source of truth for the Looper until an explicitly approved layered-asset migration changes ownership for a specific component.

## Rules

1. **Never regenerate the whole faceplate for a local correction.**
   - Use the current repository version of `faceplate.webp` as the input.
   - Prefer deterministic/local editing: mask, inpainting, clone/texture repair, or another explicitly bounded operation.

2. **Every edit must have an explicit allowed region.**
   - Define the smallest possible pixel mask/rectangle/polygon before editing.
   - The operation must not modify pixels outside that allowed region.
   - After encoding the final WebP, decode it again and verify that the number of changed pixels outside the allowed mask is exactly `0`.

3. **Preserve the asset geometry.**
   - Keep the canvas at exactly `1536 x 1024` unless a separate change explicitly approves a new geometry.
   - Do not crop, resize, stretch, rotate, or reframe the faceplate during a local retouch.

4. **Preserve unrelated visual details exactly.**
   - Do not alter buttons, labels, screws, Beat Crate, cassette geometry, lighting, glow, texture, chrome, glass, or any other area unless that area is explicitly part of the requested edit.
   - Do not "improve" adjacent areas opportunistically.

5. **Do not replace the faceplate with a newly generated approximation.**
   - Generative image output may be used only as a disposable visual reference when explicitly requested.
   - It must not silently replace `faceplate.webp` or become the new production master.

6. **Keep dynamic UI content out of the baked asset when practical.**
   - Values that change at runtime (track title, transport state, counters, speed values, etc.) should be rendered by HTML/CSS/JS over the faceplate.
   - The corresponding asset area should contain only the static panel/material needed underneath the runtime content.

7. **One visual purpose per commit.**
   - Keep each asset retouch isolated in its own commit when practical.
   - The commit message must describe the exact repaired/cleaned region.

8. **Verify visually before merge.**
   - Inspect the edited asset at native resolution.
   - If the change affects the runtime Looper appearance, run the browser/UI checks and inspect the resulting screenshot manually.
   - Green CI alone is not considered visual approval.

9. **Do not merge automatically.**
   - Asset edits stay on a branch/PR until the visual result has been reviewed.

10. **Stop when retouching reaches diminishing returns.**
   - Do not keep making exploratory passes on the same visual defect just because another small change is possible.
   - After at most **two correction iterations for the same defect**, stop and present the current before/after result plus objective diff/mask evidence.
   - A third iteration is allowed only after a new explicit user request that identifies what is still wrong; treat it as a newly scoped correction rather than automatic polishing.
   - If a new pass broadens the changed area, reduces fidelity to the approved source, or makes the result less clearly better, keep or restore the last better/approved result instead of continuing.

11. **Escalate composite-material defects to architecture instead of widening the retouch.**
   - If correcting one baked material changes another material (for example shell plastic vs magnetic tape), stop local retouching.
   - If the edit requires independent motion, transparency, state-dependent appearance or repeated reconstruction of adjacent materials, the problem is architectural rather than pixel-local.
   - For the cassette, follow `docs/CASSETTE_LAYERED_ARCHITECTURE.md` instead of continuing shell/tape/reel repair inside one composite raster.
   - A layered migration must be a separate explicitly scoped PR sequence; it is not permission to redesign unrelated Looper artwork.

## Recommended safety check

For a local edit, keep a copy of the decoded image before modification and a binary mask of the approved region. After saving and decoding the new `faceplate.webp`, compare the two pixel arrays and fail the edit if any changed pixel lies outside the mask.

Pseudo-check:

```python
changed = np.any(after != before, axis=2)
outside = changed & (allowed_mask == 0)
assert outside.sum() == 0
```

This convention is intentionally strict: local Looper asset work must be surgical and reversible. When a defect cannot be repaired surgically without damaging another visual material, stop editing the composite and change the visual ownership model instead.
