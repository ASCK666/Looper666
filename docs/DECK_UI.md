# Looper deck UI

This document describes the current deck boundary in human terms.

## Mental model

The Looper deck is one artwork canvas with live HTML controls layered on top of it.

- `index.html` owns the semantic transport controls and stable public IDs.
- `css/deck-refactor.css` owns artwork geometry and deck presentation.
- `js/looper.js` owns audio, playback, loop progress and transport state.
- `js/deck-refactor.js` owns visual deck enhancement such as backlights, loop counter and artwork-state wiring.
- `js/looper-events.js` binds Looper user actions to the public control IDs.
- `js/events.js` owns only cross-app wiring and shared initialization.
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

The five real transport buttons live directly inside `.cassetteDeckStage` in `index.html`:

- `prevBeat`
- `playBeat`
- `stopBeat`
- `nextBeat`
- `autoLooperToggle`

They use the `.artworkTransportHit` classes whose positions are defined by the artwork geometry profile in `css/deck-refactor.css`.

`deck-refactor.js` no longer removes an old transport or creates replacement buttons. It only wires visual hover/click feedback onto the existing `.artworkTransport` container. `looper-events.js` binds behavior directly to the same static controls.

`TRANSPORT_CONTROLS` in `deck-refactor.js` is now a visual-state table only: it maps the five stable IDs to their backlight assets and latched-state behavior.

## Boot order

The relevant scripts are loaded in this order:

1. `looper.js` defines the Looper engine.
2. `looper-polish.js` schedules its optional enhancement attachment.
3. `deck-refactor.js` enhances the static artwork UI already present in the HTML.
4. `events.js` defines shared helpers and cross-app initialization.
5. `looper-events.js` binds Looper actions to the static transport IDs.

`deck-refactor.js` only retries on a short timer when its dependencies are genuinely not ready. The normal path is synchronous enhancement before Looper event binding.

## State updates

The deck UI does not poll every 120 ms anymore.

It observes meaningful DOM state changes:

- `.cassetteDeck` class changes for loaded/playing state;
- AUTO button class / `aria-pressed` changes.

AUTO loop progress is no longer transported through hidden DOM. `looper.js` emits the `sp:auto-looper-state` event whenever the AUTO state refreshes, and `deck-refactor.js` uses that explicit state event to refresh the integrated loop counter.

The old four-digit tape-counter runtime and source UI have been removed. There is no tape-counter timer, state, reset/start/stop API, monkey-patch, HTML module or presentation block. The integrated loop counter is the current counter contract and follows `autoLooperLoopCount`.

## Compatibility debt already removed

These are no longer compatibility contracts and must not be reintroduced:

- `deckLegacyBridge`
- `cassetteDoorEject`
- `cassetteDoorAction`
- `autoLooperCompactStatus`
- the legacy tape-counter JavaScript/source UI
- dynamic transport replacement through `createTransportButton` / `installTransport`
- legacy `.deckTransport` source markup

The deck transport itself no longer has a known DOM compatibility bridge. Remaining Looper refactor work should focus on broader engine/UI boundaries rather than rebuilding proxy controls.

## Readability rules for future deck work

- Prefer one named configuration table over parallel arrays or repeated selectors.
- Prefer small functions named after intent (`wireTransport`, `buildBacklights`) over comments explaining clever code.
- Comments should explain architectural constraints or surprising reasons, not restate syntax.
- Keep audio/state changes in `looper.js`; keep deck DOM/presentation in the deck UI module.
- Avoid `!important` for new rules unless an existing migration constraint makes it unavoidable.
- Do not create another temporary override stylesheet.
- Make one behavior-preserving cleanup per commit when touching legacy code.
