# V87 review — Looper-only cleanup

This pass deliberately leaves Chopper, Drums and Practice unchanged. It only
cleans the Looper stylesheet, Looper engine and Looper event bindings.

## CSS

- Removed selectors with no Looper target.
- Removed the unused cyan custom property.
- Merged the effective cassette-deck surface declarations into the owning
  component instead of overriding them later with a more specific selector.
- Reduced generated CSS from 2816 to 2777 lines and selector branches from
  676 to 662, with no unreachable selectors or fully shadowed declarations.

## JavaScript

- Replaced rack, AUTO, counter and reel magic numbers with named constants.
- Avoided a duplicate library refresh after a successful import.
- Centralized source classification, track switching and AUTO toggle logic.
- Preserved synchronous user activation for PLAY while containing both
  synchronous and asynchronous transport errors.
- Avoided counter DOM work while the displayed four-digit value is unchanged.
- Made NEXT/PREV deterministic when no track has been loaded yet.
- Scoped IndexedDB constant names and removed an unnecessary global fallback
  reason variable.

## Verification

Every cleanup pass was followed by the full project suite. V87 carries 220
static and behavioral contracts plus JavaScript health, unit, CSS health,
resource, bundled-audio and local HTTP delivery checks.
