# Looper deck UI

This document describes the current deck boundary in human terms.

## Mental model

The Looper deck is one artwork canvas with live HTML controls layered on top of it.

- `css/deck-refactor.css` owns artwork geometry and deck presentation.
- `js/looper.js` owns audio, playback, loop progress and transport state.
- `js/deck-refactor.js` owns the DOM that visually sits on the deck artwork.
- `js/events.js` binds user actions to the public control IDs.
- `js/looper-polish.js` still contains the incremental AUTO SPEED enhancement and cassette metadata treatment.

The important rule is: **audio state must not depend on artwork coordinates, and artwork coordinates must not be spread through behavior code.**

## Replacing the deck artwork

The geometry contract is the custom-property block at the top of `css/deck-refactor.css`:

```css
#looper .cassetteDeck {
  --deck-artwork-ratio: ...;
  --deck-reel-left-x: ...;
  --deck-reel-right-x: ...;
  --deck-counter-x: ...;
  --deck-hit-play-x: ...;
  /* ... */
}
```

When a new deck PNG changes physical positions, recalibrate this block first. Do not put replacement coordinates into media queries, JavaScript or a new override stylesheet.

`js/deck-refactor.js` contains the asset filenames. Geometry does not belong there.

## Transport controls

The five controls drawn into the artwork are described once by `TRANSPORT_CONTROLS` in `js/deck-refactor.js`.

At boot, `deck-refactor.js` removes the old transport markup and creates the real buttons directly over the artwork with the public IDs:

- `prevBeat`
- `playBeat`
- `stopBeat`
- `nextBeat`
- `autoLooperToggle`

`events.js` then binds behavior directly to those buttons. There is no proxy click from an artwork hotspot to a hidden transport button.

Backlight filenames live beside each control in `TRANSPORT_CONTROLS`, so adding or changing a transport control has one obvious entry point.

## Boot order

The relevant scripts are loaded in this order:

1. `looper.js` defines the Looper engine.
2. `looper-polish.js` schedules its optional enhancement attachment.
3. `deck-refactor.js` installs the artwork UI immediately when the engine is available.
4. `events.js` binds actions to the IDs created by the deck UI.

`deck-refactor.js` only retries on a short timer when its dependencies are genuinely not ready. The normal path is synchronous installation before `events.js` binds controls.

## State updates

The deck UI does not poll every 120 ms anymore.

It observes meaningful DOM state changes:

- `.cassetteDeck` class changes for loaded/playing state;
- AUTO button class / `aria-pressed` changes;
- the compact AUTO progress node while that compatibility path still exists.

That observer updates visual-only state such as the integrated loop counter, hint and backlights.

## Remaining compatibility debt

These pieces are intentionally still transitional:

1. `autoLooperCompactStatus` remains as a hidden child of the real AUTO button because `looper.js` still writes loop progress into it.
2. `deckLegacyBridge` preserves `cassetteDoorEject` / `cassetteDoorAction` because `refreshCassetteUI()` and old event wiring still expect those IDs.
3. Legacy tape-counter functions are disabled by `deck-refactor.js`; they should eventually be removed from `looper.js` instead of monkey-patched.
4. The old transport markup still exists in `index.html`, but is removed before event binding. The final cleanup should move the artwork transport markup into the HTML source or otherwise remove the obsolete source markup.

Do not add new compatibility bridges. Remove these one by one as their callers are cleaned up.

## Readability rules for future deck work

- Prefer one named configuration table over parallel arrays or repeated selectors.
- Prefer small functions named after intent (`installTransport`, `buildBacklights`) over comments explaining clever code.
- Comments should explain architectural constraints or surprising reasons, not restate syntax.
- Keep audio/state changes in `looper.js`; keep deck DOM/presentation in the deck UI module.
- Avoid `!important` for new rules unless an existing migration constraint makes it unavoidable.
- Do not create another temporary override stylesheet.
- Make one behavior-preserving cleanup per commit when touching legacy code.
