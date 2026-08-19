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

## Cassette reconstruction constraints

The cassette may be rebuilt, but the surrounding deck is locked. The reconstruction must preserve the current composition, placement, scale, depth relationship and visual integration of the cassette within the existing deck.

### Deck geometry is immutable

- Do not change any other part of the deck while rebuilding the cassette.
- All existing deck positions and dimensions must remain exactly where they are and at the same size.
- Do not move, resize, crop, stretch, reframe, repaint, relight or reinterpret adjacent deck elements to make the cassette fit.
- The cassette itself must remain in the same location and at the same apparent scale as the current approved composition.
- Preserve the current recessed placement: the cassette remains inserted into its holder, including the existing occlusion of its lower portion by the deck/support.
- No opportunistic redesign, layout adjustment or creative geometry change is allowed outside the explicitly approved cassette work.

### Required cassette layer architecture

Build the cassette as separate composited layers rather than one baked static object. From back to front:

1. **Animated cassette mechanism**
   - Contains the complete rotating reel/hub mechanisms that support the magnetic tape, not only a cross, spoke or decorative center glyph.
   - The tape follows its physically coherent path, including the lower path through the cassette mechanism.
   - The lower tape path may exist in the mechanism layer while remaining visually hidden by the cassette shell; it must not be exposed merely to make the animation visible.
   - Rotation must read as the cassette mechanism turning behind the shell.

2. **Transparent cassette shell**
   - The cassette shell is a complete transparent/translucent plastic body placed in front of the mechanism.
   - It is not a shell with a large central hole cut through it; the mechanism is seen through the transparent plastic.
   - Preserve the shell's material cues, reflections, tint and depth so the mechanism reads through plastic rather than through an empty opening.
   - Preserve the white cassette label area as part of the shell/static artwork.
   - Do not bake the cassette/track name into the shell artwork.

3. **Cassette name in HTML/CSS**
   - Render the cassette/track name dynamically in HTML/CSS over the white label area.
   - Keep the label text independent from the static shell asset so runtime content can change without regenerating imagery.

4. **CSS-controlled cassette backlight**
   - Reproduce the currently approved cassette/deck backlighting rather than inventing a new lighting treatment.
   - Implement the controllable light component in CSS where practical so it can support explicit on/off states and transitions.
   - The off state must preserve the underlying cassette/deck appearance; the on state adds only the approved backlight effect.

5. **Deck glass above the cassette assembly**
   - The deck glass/window remains above the mechanism, shell, label text and cassette lighting in the final visual stack.
   - Preserve the existing glass appearance, reflections, tint, texture and geometry unless a separate change explicitly targets the glass itself.

### Composition requirement

The purpose of the layered reconstruction is to make the cassette mechanism animatable while preserving the approved deck exactly. The final assembled result must occupy the same visual footprint as the current cassette and must not cause any movement, resizing or alteration elsewhere in the deck.

## Recommended safety check

For a local edit, keep a copy of the decoded image before modification and a binary mask of the approved region. After saving and decoding the new `faceplate.webp`, compare the two pixel arrays and fail the edit if any changed pixel lies outside the mask.

Pseudo-check:

```python
changed = np.any(after != before, axis=2)
outside = changed & (allowed_mask == 0)
assert outside.sum() == 0
```

This convention is intentionally strict: local Looper asset work must be surgical and reversible.

## Cassette binary pre-push gate

The following gate is mandatory before any new cassette PNG is presented as push-ready.

1. **Reread the binding cassette specs first.**
   - Do not rely on remembered geometry or an older candidate state.

2. **Composite against the current production stack locally.**
   - Use the exact current cavity, reel, shell, support and glass assets.
   - Review a native-resolution static composite.
   - Review an animated composite when the change can interact with moving reels.

3. **Validate the allowed region before handoff.**
   - Compute the candidate alpha bbox.
   - Confirm it is fully inside the explicit region allowed for that asset.
   - Reject the candidate before handoff if it spills outside the allowed region.

4. **Validate file identity before handoff.**
   - Confirm exact canvas dimensions.
   - Confirm the exact destination repository path, including directory names.
   - Compute and record SHA-256.
   - Compute and record Git blob SHA when practical.

5. **Binary upload and runtime activation are separate operations.**
   - Never update the runtime integrity table merely because a binary was intended to be pushed.
   - After upload, fetch the binary from the intended branch and exact path.
   - Confirm the remote blob is the expected candidate.
   - Only then update runtime SHA-256/bbox metadata.

6. **Interpret fallback correctly.**
   - If the layered cassette disappears and the original baked faceplate returns, first suspect an integrity-gate failure.
   - Verify current branch HEAD, changed filenames, remote asset path, hash and bbox before diagnosing a Git rollback.

7. **Preserve a recovery point for risky binary work.**
   - Keep an explicit safety branch/snapshot when a sequence of binary experiments could destabilize the runtime.
   - Do not continue normal work on the safety branch.

For the detailed cassette reconstruction history and failure modes, see `CASSETTE_LAYERING_NOTES.md`.
