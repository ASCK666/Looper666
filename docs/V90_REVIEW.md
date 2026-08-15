# V90 — Looper code review

V90 is a Looper-only reliability and cleanup pass. Runtime changes are limited
to `js/looper.js`; visual cleanup is limited to `css/src/looper.css` and its
generated production CSS.

## Bugs fixed

- IndexedDB can retry after a synchronous open failure and no longer hangs when
  an upgrade is blocked by another tab.
- Request-level quota errors are preserved instead of being hidden by a generic
  transaction abort, so the persistent library remains visible.
- Save names include milliseconds and failed writable streams are aborted.
- Stale track decodes cannot override a newer selection.
- STOP cancels a pending asynchronous PLAY, and repeated PLAY commands converge
  on one active source.
- PREV and NEXT use the currently visible, sorted and filtered cassette rack.
- Import reuses its first decoded buffer and stops an older playing beat before
  committing the new one.
- STORE lamp timeouts are coalesced.
- Cassette rows expose a real load button and a separate Delete button.

## CSS cleanup

- Removed historical panel padding declarations that could no longer win.
- Removed obsolete generic Beat Crate grid rules.
- Removed a redundant one-column breakpoint.
- Folded the single-use side-key geometry into the EJECT control.

## Verification

- Full regression suite passes after every JavaScript and CSS pass.
- CSS build, resource paths, audio assets, JavaScript health, unit tests and
  local HTTP smoke tests pass.
- Browser tests are skipped when Playwright/Chromium is not installed.
