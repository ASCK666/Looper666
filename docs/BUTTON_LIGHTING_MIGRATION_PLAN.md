# Button lighting migration plan

This plan removes baked button backlighting from the approved Looper visual and restores lighting as dynamic CSS while preserving the exact control geometry and existing UI behavior.

It is deliberately separate from the cassette migration. Do not combine cassette extraction and button-lighting work in the same runtime/asset PR.

## Scope

The migration is visual surgery only:

- preserve every button's existing geometry, position, label, symbol and base material;
- remove only baked backlighting, glow or illuminated-state pixels that prevent clean dynamic state rendering;
- reconstruct the neutral/off material underneath those removed light effects;
- reproduce ON-state illumination with CSS;
- keep real DOM controls, handlers, keyboard behavior and Looper state ownership unchanged.

No audio, transport, feature logic, Practice behavior or unrelated deck redesign belongs in this work.

## Geometry contract

The canonical deck space remains exactly `1536 x 1024`.

For every affected control:

- visible button position must remain unchanged;
- visible width and height must remain unchanged;
- icon/text placement must remain unchanged;
- corner geometry and surrounding panel spacing must remain unchanged;
- the real DOM hit target must not shrink or move;
- CSS lighting must not affect layout dimensions.

Do not use glow, border or shadow values that alter box geometry or push neighbouring controls.

## Asset surgery contract

The asset edit should create a truthful neutral/off baseline.

- Start from the approved repository asset.
- Define the smallest allowed mask for each button-lighting correction.
- Remove only baked light emission, illuminated colour cast and glow that belongs to dynamic UI state.
- Preserve the button's physical material, printed labels, bevels, screws, deck texture and neighbouring surfaces unless they are inside the explicitly approved lighting-removal mask.
- Reconstruct the neutral/off appearance from the approved source material; do not modernize or redesign the control.
- Decode the final encoded asset and verify exactly `0` changed pixels outside the approved mask(s).
- Treat one visual purpose per commit as the default.
- Do not use generated replacement artwork as production pixels unless separately and explicitly approved.

If removing the light requires broad reconstruction of unrelated materials, stop and reassess the ownership boundary instead of widening the retouch mechanically.

## CSS lighting ownership

Dynamic illumination belongs to CSS/presentation state, not to a second interaction state machine.

Use existing DOM/state signals whenever possible, for example existing classes, attributes or `aria-pressed` state already derived from product behavior.

Allowed presentation effects include, when visually appropriate:

- local `box-shadow` glow;
- pseudo-element halo;
- controlled inset illumination;
- text/icon glow;
- opacity/intensity changes;
- small colour/intensity transitions.

Constraints:

- CSS must reflect existing application state; it must not decide product state.
- Do not add an independent button ON/OFF model solely for visuals.
- Do not duplicate transport state in JavaScript for lighting.
- Do not change audio or transport timing to support animation/glow.
- Prefer one predictable lighting implementation over multiple stacked override layers.
- Keep the existing stylesheet ownership rules; do not add a new theme/polish/compat stylesheet.

## OFF-state acceptance

Before implementing dynamic glow, establish a clean neutral baseline.

For each affected button:

- no baked active glow remains;
- the control still reads as the same physical button;
- label/icon legibility is preserved;
- neighbouring panel material remains unchanged;
- the neutral state does not look artificially flattened or newly redesigned.

Manual visual approval is required before treating the neutral asset as the new baseline.

## ON-state acceptance

CSS must recreate illumination without changing control geometry.

- Glow must originate from the correct button region.
- Halo must not obscure labels/icons.
- Light spill must be visually controlled and must not incorrectly illuminate unrelated controls.
- ON/OFF contrast must remain readable at desktop and phone sizes.
- Effects must remain stable during hover/focus/pressed states where those states already exist.
- Accessibility/focus indication must not be removed merely to match the artwork.

## Mobile / responsive acceptance contract

Mobile support is required from the first implementation.

- Button and glow geometry must scale with the existing responsive control, not with hard-coded viewport coordinates.
- Do not add separate JavaScript positioning offsets for desktop and mobile.
- CSS effects must remain centred on the same DOM element across viewport sizes.
- Glow radius/intensity must not create horizontal page overflow on narrow phones.
- Required light spill must not be clipped by responsive containers unless clipping is intentionally part of the physical design.
- Labels/icons must remain readable at narrow portrait widths.
- Real touch targets must retain the project's existing mobile sizing and must not be replaced by decorative image hotspots.
- Verify that adjacent buttons remain visually distinct when the UI is compressed.
- Test at least one narrow portrait phone viewport in addition to desktop Chromium.
- Strengthen existing responsive/browser tests instead of building a separate mobile-only lighting path.

## Recommended migration sequence

### A. Inventory dynamic lights

List every button/light that is actually state-dependent and identify its existing source-of-truth state.

Do not include static decorative highlights merely because they are bright.

### B. Remove baked dynamic light from the asset

Neutralize one coherent button/light family at a time using explicit masks and post-encode pixel-diff validation.

### C. Validate the neutral visual baseline

Capture desktop and phone screenshots before adding dynamic CSS lighting.

The controls must still look physically correct when OFF.

### D. Add CSS ON-state lighting

Implement lighting from existing DOM state signals.

Keep selectors local and explicit. Do not introduce a generic lighting framework unless multiple controls demonstrably share the same complete visual contract.

### E. Validate interaction states

Check OFF, ON, hover/focus where applicable, and the real transport/product transitions that drive the light.

### F. Tune only after parity

Any aesthetic enhancement beyond recreating the approved intended lighting is a separate explicitly approved visual change.

## Verification

Before merge:

- run `git diff --check`;
- run focused asset, CSS, layout, responsive and browser checks;
- run `python3 tools/test_all.py`;
- inspect desktop OFF/ON screenshots manually;
- inspect narrow phone OFF/ON screenshots manually;
- verify real control hit targets and handlers are unchanged;
- verify no page overflow or incorrect clipping is introduced;
- verify CSS state follows existing application state;
- verify no audio/transport behavior changed;
- verify asset pixels outside approved lighting-removal masks are unchanged.

The button-lighting migration must remain separate from the cassette migration and must not become an excuse for a general Looper visual redesign.
