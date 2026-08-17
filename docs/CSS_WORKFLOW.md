# CSS workflow — current runtime

The browser loads **two maintained runtime stylesheets**, in this order:

```text
css/base.css
css/clean-ui.css
```

There is **no CSS generator pipeline** and no hidden source directory. Edit the
runtime stylesheet that owns the behavior directly.

## Ownership

### `css/base.css`

Primary stylesheet for tokens, shared primitives, shell/layout and the Looper,
Chopper, Drums and Practice component rules.

### `css/clean-ui.css`

Existing late cascade for the intentional lean workstation presentation: compact
header/workstation adjustments and a small set of deliberate visibility/layout
overrides. It is part of the real production cascade, not generated output.

Do not add a third override, compatibility, polish or theme stylesheet. If a rule
is replaced, remove the retired declaration in the same change instead of leaving
an inert earlier copy.

## Safe edit loop

1. Identify whether the rule belongs to the primary component/layout (`base.css`)
   or the existing lean presentation layer (`clean-ui.css`).
2. Make the smallest direct edit; remove declarations/selectors made obsolete by it.
3. Run the focused component/layout test.
4. Run `python3 tools/test_all.py` before merge.

Useful focused checks:

```bash
python tests/css_layout.py
python tests/header_responsive.py
python tests/chopper_ui.py
python tests/chopper_sampler_layout.py
python tests/drum_ui.py
python tests/css_health.py
python tests/css_redundancy.py
python tests/http_smoke.py
python tests/browser_smoke.py
```

## Full-cascade guards

`tests/css_health.py` and `tests/css_redundancy.py` analyze `base.css` followed by
`clean-ui.css`, matching the browser order. They reject unreachable selectors,
unused custom properties/keyframes and declarations that are fully shadowed by a
later copy of the same selector.

Browser/layout tests that inline CSS must inline **both** runtime stylesheets in the
same order. `tests/css_health.py` enforces that contract.

`tests/dead_code.py` also rejects references to the retired CSS generator/source
layout in current maintenance documentation, so the old workflow cannot silently
become the documented source of truth again.

## Maintenance rules

- Prefer deletion over another specificity layer.
- Do not use `display:none` as a substitute for deleting a retired component path.
- Do not keep responsive selectors for a component that no longer exists.
- Do not introduce CSS ordering hacks when DOM order can express the intended structure.
- Keep Practice frozen unless the requested change explicitly concerns Practice.
- Treat `index.html` as the runtime manifest: every maintained runtime CSS file must
  be loaded there, and dead runtime stylesheets must be deleted.

The goal is a truthful two-file cascade with no dormant compatibility layer, not a
perfectly flat stylesheet or a new build system.
