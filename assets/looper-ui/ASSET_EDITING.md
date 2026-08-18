# Looper faceplate editing convention

`assets/looper-ui/faceplate.webp` is the single visual source of truth for the Looper.

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

## Recommended safety check

For a local edit, keep a copy of the decoded image before modification and a binary mask of the approved region. After saving and decoding the new `faceplate.webp`, compare the two pixel arrays and fail the edit if any changed pixel lies outside the mask.

Pseudo-check:

```python
changed = np.any(after != before, axis=2)
outside = changed & (allowed_mask == 0)
assert outside.sum() == 0
```

This convention is intentionally strict: local Looper asset work must be surgical and reversible.
