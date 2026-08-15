# V91 — first progressive ownership pass

V91 deliberately changes no layout, CSS, audio algorithm or user-facing
behavior. It establishes a safer rhythm for the human-maintainability work.

## Runtime change

- `refreshCassetteUI()` moved unchanged from `js/chopper.js` to `js/looper.js`.
- A responsibility comment explains that the function only synchronizes the
  cassette DOM and must not control transport state.
- Function name, callers and classic-script loading order remain unchanged.

## Regression protection

- The runtime and service-worker version markers are V91.
- A new validation requires the cassette view to exist exactly once in
  `looper.js` and not in `chopper.js`.
- The complete suite passes with 243 validations.
- Browser suites remain optional and are skipped when Playwright/Chromium is
  unavailable; syntax, unit, resource, CSS, audio and local HTTP checks pass.

## Deliberately deferred

- no ES modules;
- no new JavaScript files;
- no storage rewrite;
- no renderer move;
- no CSS cleanup;
- no interface change.
