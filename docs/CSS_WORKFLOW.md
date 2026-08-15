# CSS workflow — V91

The browser loads **one production stylesheet**: `css/base.css`.

`css/base.css` is generated. Do not edit it by hand. Human-editable CSS lives in `css/src/`.

## Ownership

- `tokens.css` — small shared design token set only
- `base.css` — generic HTML/control primitives and boot-error surface
- `layout.css` — app shell, header, tabs, panels and structural layout
- `looper.css` — cassette deck and Beat Crate, including Looper responsive rules
- `chopper.css` — sample controls, waveform, pads and placement matrix
- `drums.css` — drum workstation, editor, libraries, FX and drum responsive rules
- `practice.css` — **frozen**; Practice will be redesigned separately
- `responsive.css` — global shell/header breakpoints only
- `utilities.css` — shared animations/utilities
- `shared.css` — rules that intentionally span several active components

There is no post-build `overrides.css` or temporary theme layer. A visual fix must go into the file that owns the affected component.

## Why `@sp-order` still exists

The project started with a historical cascade. `@sp-order` keeps the remaining migration-sensitive fragments in a deterministic global order while component CSS is consolidated safely.

V67–V70 progressively reduced those fragments. Do not add a new marker just to patch specificity. Prefer consolidating the owning component and prove the result with tests.

## Safe edit loop

1. Edit the owning file in `css/src/`.
2. Run `python tools/build_css.py`.
3. Run the focused component test.
4. Run `python tools/test_all.py` before packaging.

Useful focused checks:

```bash
python tests/css_layout.py
python tests/header_responsive.py
python tests/chopper_ui.py
python tests/drum_ui.py
python tests/css_health.py
python tests/css_redundancy.py
python tests/http_smoke.py
python tests/browser_smoke.py
```

`tests/css_health.py` and `tests/css_redundancy.py` use the project's dependency-free parser. They reject unreachable selectors, unused custom properties, unused keyframes and declarations fully shadowed by a later copy of the same selector.

`tests/resource_paths.py` verifies local asset URLs from their real CSS location. `tests/http_smoke.py` serves the project on a temporary localhost port and fetches the critical deployable files. `tests/header_responsive.py` checks the header contract across widths from 420px to 1440px. The Playwright browser smoke test runs when Chromium and the Python package are available. Dependency-free JavaScript and asset checks still run when a graphical browser is absent.

## Current migration state

- Looper: consolidated; obsolete cassette-case and historical Beat Crate layers removed
- Chopper: consolidated
- Drums: consolidated
- Layout: consolidated into semantic phases
- Shared: component-only rules moved back to their owners
- Responsive: component rules co-located; global file now owns only generic/header behavior
- Tokens: semantic amber/copper accents; shared token set intentionally kept small
- Warm deck theme: folded into component owners; temporary theme file removed
- Generated production CSS: 2,746 lines (3,239 before the V82 cleanup)
- Practice: untouched/frozen

The next visual redesign should modify the component source directly, not recreate a compatibility/override layer.
