from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]


def replace_once(text,old,new,label):
    count=text.count(old)
    assert count==1,(label,count)
    return text.replace(old,new,1)

# Keep Chopper/combined feedback with the sample workstation and give Drums its
# own local status sink. This removes the cross-domain presentation shortcut
# introduced when the retired Drum Libraries panel disappeared.
path=ROOT/'index.html'
text=path.read_text(encoding='utf-8')
text=replace_once(
    text,
    '''          </div>\n          <div id="beatSaveStatus" class="status saveBeatStatus">SAVE rend la grille actuelle puis écrit un WAV.</div>''',
    '''          </div>\n          <div id="chopStatus" class="status" aria-live="polite">READY</div>\n          <div id="beatSaveStatus" class="status saveBeatStatus">SAVE rend la grille actuelle puis écrit un WAV.</div>''',
    'restore Chopper status ownership'
)
text=replace_once(
    text,
    '''          <div id="chopStatus" class="status drumEditStatus" aria-live="polite">READY</div>''',
    '''          <div id="drumStatus" class="status drumEditStatus" aria-live="polite">READY</div>''',
    'add Drums status ownership'
)
assert text.count('id="chopStatus"')==1
assert text.count('id="drumStatus"')==1
path.write_text(text,encoding='utf-8')

path=ROOT/'js/drums.js'
text=path.read_text(encoding='utf-8')
count=text.count('$("chopStatus")')
assert count>=9,count
text=text.replace('$("chopStatus")','$("drumStatus")')
assert '$("chopStatus")' not in text
path.write_text(text,encoding='utf-8')

# Browser contract: Drums feedback stays in the Drum editor; Chopper/combined
# feedback is no longer physically hosted by the Drum domain.
path=ROOT/'tests/drum_ui.py'
text=path.read_text(encoding='utf-8')
text=replace_once(
    text,
    '''    for sel in ['.controlPanel','.drumSelector','.snareFx','.currentDrums','.drumEditBox','#drumEditor','#chopStatus']:\n''',
    '''    for sel in ['.controlPanel','.drumSelector','.snareFx','.currentDrums','.drumEditBox','#drumEditor','#drumStatus','#chopStatus']:\n''',
    'drum surface status list'
)
text=text.replace("document.getElementById('chopStatus').textContent","document.getElementById('drumStatus').textContent")
text=replace_once(
    text,
    '''    assert page.locator('#chopStatus').evaluate("el=>el.closest('.drumEditBox')!==null")\n''',
    '''    assert page.locator('#drumStatus').evaluate("el=>el.closest('.drumEditBox')!==null")\n    assert page.locator('#chopStatus').evaluate("el=>el.closest('.samplerControlModule')!==null")\n    assert page.locator('#chopStatus').evaluate("el=>el.closest('.drumEditBox')===null")\n''',
    'status ownership assertions'
)
path.write_text(text,encoding='utf-8')

# Current ownership guide. Avoid a second roadmap: the factual graph and target
# architecture remain the single sources of truth for migration decisions.
architecture='''# Scratch Practice — current code ownership

Scratch Practice is a local-first Looper + Chopper/Drum workstation built with
vanilla HTML, CSS and JavaScript. The runtime deliberately stays small: classic
scripts, Web Audio, local browser storage/file APIs and no application server.

This file is the maintainer orientation guide. For the detailed **current** state
and dependency graph, read `STATE_DEPENDENCY_MAP.md`. For the desired direction,
read `TARGET_ARCHITECTURE.md`. Do not duplicate a refactor roadmap here.

## Reading order for a maintainer

1. Read `index.html` for the visible workstation structure and runtime load order.
2. Read `js/core.js` for shared Web Audio infrastructure and generic helpers.
3. Read the feature file being changed: `looper.js`, `chopper.js` or `drums.js`.
4. Read `js/events.js` last. It wires DOM events and still contains a few documented
   cross-domain workflows, but it must not become a second implementation layer.
5. Read `STATE_DEPENDENCY_MAP.md` before changing ownership or shared state.
6. Run `python3 tools/test_all.py` before and after a small change.

## Runtime files

The browser loads classic scripts in this order:

```text
bootstrap.js -> core.js -> looper.js -> practice.js -> chopper.js -> drums.js -> events.js
```

- `index.html` — application structure and explicit runtime manifest
- `css/base.css` — maintained primary runtime stylesheet
- `css/clean-ui.css` — maintained late cascade for the intentional lean workstation UI
- `js/bootstrap.js` — boot diagnostics and retirement of stale app caches/workers
- `js/core.js` — shared audio infrastructure, meter primitives, WAV helpers and generic utilities
- `js/looper.js` — Beat Crate, imports, persistence and cassette transport
- `js/practice.js` — frozen Practice implementation
- `js/chopper.js` — sample import/conditioning, waveform, markers, pads and placement grid
- `js/drums.js` — Drum folders/selections, patterns, edits, effects and the current combined renderer
- `js/events.js` — DOM wiring plus the remaining explicitly documented cross-domain workflows

Classic-script order is still part of the runtime contract. Do not add a compatibility
layer to hide that fact. If ownership work later makes imports materially clearer,
reassess modules then; they are not a proactive goal.

## Current ownership boundary

The intended direction is `events -> feature/renderer -> core`, but the current
runtime is intentionally stabilized rather than being mechanically refactored to
match the target diagram.

Important current facts:

- `core.js` still physically declares several feature-state families; this is known debt.
- `drums.js` currently contains the combined Chopper + Drums renderer.
- renderer source buffer, cue markers and sample pitch rate are explicit inputs;
  other hidden inputs are documented in `STATE_DEPENDENCY_MAP.md` and are deferred
  until feature work makes a narrow boundary worth changing.
- `events.js` still owns some full-preview, save and master-volume orchestration;
  those are documented exceptions, not invitations for a broad cleanup.
- Drum-local feedback writes to `#drumStatus`; `drums.js` must not use the
  Chopper/combined `#chopStatus` sink.
- Practice remains frozen unless a Practice change is explicitly requested.

The active rule is boy-scout cleanup around the feature being changed: remove a
complete obsolete responsibility or a hidden dependency only when the resulting
flow is simpler for a human reader.

## CSS ownership

There is **no CSS generator pipeline**. The two deployed stylesheets are maintained
directly and loaded in this order:

```text
css/base.css
css/clean-ui.css
```

`base.css` is the primary component/layout stylesheet. `clean-ui.css` is the
existing, intentionally late lean-UI layer. Do not create a third override/theme
stylesheet. When replacing a rule or component path, remove the retired declaration
in the same change and verify the full cascade with the CSS health/redundancy tests.

See `CSS_WORKFLOW.md` for the edit/test contract.

## Change contract

- Move or remove one complete responsibility at a time.
- Do not combine an ownership move with an audio-algorithm change.
- Do not create setters, service objects, contexts or wrappers that only hide a global.
- Do not split files merely to make the tree look more architectural.
- When a mechanism is replaced, delete the old listener/helper/selector/path in the same change.
- Keep the three hidden Drum folder file inputs: they are the real fallback when
  `showDirectoryPicker()` is unavailable, not duplicate UI.
- Keep the header master gain/meter. The retired lower vertical master display must not return.
- Add or update a focused regression invariant when a responsibility boundary changes.

## Regression gate

Run:

```bash
python3 tools/test_all.py
```

The maintained suite checks runtime/dead-code contracts, JS health, deterministic
audio behavior, the full CSS cascade, responsive layout, Chopper/Drum UI, master/PUNCH,
HTTP serving and Chromium interactions. GitHub Actions runs the same suite on pull
requests and pushes to `main`.

## Persistence and permissions

Imported beats use IndexedDB when available and fall back to memory for the current
tab when it is not. Folder access is user initiated. Beat-folder write permission is
requested only when SAVE needs it. Drum folder handles/files remain local to the browser.
'''
(ROOT/'docs/ARCHITECTURE.md').write_text(architecture,encoding='utf-8')

css_workflow='''# CSS workflow — current runtime

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
'''
(ROOT/'docs/CSS_WORKFLOW.md').write_text(css_workflow,encoding='utf-8')

# Keep the factual dependency map current without restarting the paused refactor roadmap.
path=ROOT/'docs/STATE_DEPENDENCY_MAP.md'
text=path.read_text(encoding='utf-8')
text=replace_once(
    text,
    '''This document describes the **current runtime on `main` after the incremental ownership/dependency moves through PR #46**. It is intentionally descriptive, not aspirational. `TARGET_ARCHITECTURE.md` defines where the project should converge.''',
    '''This document describes the **current runtime on `main`**. The proactive ownership/dependency migration stabilized after PR #46; later feature and UI work is reflected here only when it changes a listed writer, dependency or ownership fact. It is intentionally descriptive, not aspirational. `TARGET_ARCHITECTURE.md` defines where the project should converge.''',
    'dependency map intro'
)
text=replace_once(
    text,
    '''- Drum library loading, patterns, editing, velocities, CLEAR and NEW DRUMS behavior mostly live in `drums.js`.''',
    '''- Drum library loading, patterns, editing, velocities, CLEAR and NEW DRUMS behavior mostly live in `drums.js`; Drum-local feedback writes to `#drumStatus` rather than the Chopper/combined status sink.''',
    'drum status ownership fact'
)
path.write_text(text,encoding='utf-8')

# README is already correct about direct CSS maintenance; make the architecture
# sources of truth explicit so maintainers do not pick a historical review note.
path=ROOT/'README.txt'
text=path.read_text(encoding='utf-8')
text=replace_once(
    text,
    '''- docs/                      architecture, sécurité et notes techniques\n- tests/                     validations statiques, unitaires et navigateur\n''',
    '''- docs/                      architecture, sécurité et notes techniques\n- tests/                     validations statiques, unitaires et navigateur\n\nPour l'architecture : docs/ARCHITECTURE.md sert de guide de lecture,\ndocs/STATE_DEPENDENCY_MAP.md décrit le graphe réel courant et\ndocs/TARGET_ARCHITECTURE.md fixe la direction cible.\n''',
    'README architecture pointers'
)
path.write_text(text,encoding='utf-8')

# Extend the dead-code contract to current maintenance docs. Runtime CSS already
# rejects these retired paths; the documentation must obey the same source of truth.
path=ROOT/'tests/dead_code.py'
text=path.read_text(encoding='utf-8')
old='''# Runtime CSS is maintained directly. References to the retired generator/source\n# layout are stale documentation unless that pipeline is restored in the same change.\nfor stylesheet in sorted((ROOT / "css").rglob("*.css")):\n    text = stylesheet.read_text(encoding="utf-8")\n    for stale_path in ("css/src/", "tools/build_css.py"):\n        if stale_path in text:\n            problems.append(\n                f"Stale CSS generation path {stale_path!r} found in {stylesheet.relative_to(ROOT)}"\n            )\n'''
new='''# Runtime CSS is maintained directly. The current maintainer documentation must\n# not advertise the retired generator/source layout either. Historical review\n# notes are intentionally excluded because they describe past versions.\ncss_contract_files = [\n    *sorted((ROOT / "css").rglob("*.css")),\n    ROOT / "README.txt",\n    ROOT / "docs" / "ARCHITECTURE.md",\n    ROOT / "docs" / "CSS_WORKFLOW.md",\n]\nfor contract_file in css_contract_files:\n    text = contract_file.read_text(encoding="utf-8")\n    for stale_path in ("css/src/", "tools/build_css.py"):\n        if stale_path in text:\n            problems.append(\n                f"Stale CSS generation path {stale_path!r} found in {contract_file.relative_to(ROOT)}"\n            )\n'''
text=replace_once(text,old,new,'dead-code documentation contract')
text=text.replace(
    'print("OK: runtime JS/CSS is explicit, stale CSS generation paths are absent and retired update paths stay removed")',
    'print("OK: runtime JS/CSS is explicit, current docs reject retired CSS generation paths and retired update paths stay removed")'
)
path.write_text(text,encoding='utf-8')

# docs is populated; the old empty-directory placeholder is now a dead repository artifact.
gitkeep=ROOT/'docs/.gitkeep'
assert gitkeep.exists()
gitkeep.unlink()

# Final static invariants before browser tests.
index=(ROOT/'index.html').read_text(encoding='utf-8')
drums=(ROOT/'js/drums.js').read_text(encoding='utf-8')
assert 'id="drumStatus"' in index and 'id="chopStatus"' in index
assert '$("drumStatus")' in drums and '$("chopStatus")' not in drums
for current_doc in [ROOT/'README.txt',ROOT/'docs/ARCHITECTURE.md',ROOT/'docs/CSS_WORKFLOW.md']:
    doc=current_doc.read_text(encoding='utf-8')
    assert 'css/src/' not in doc and 'tools/build_css.py' not in doc,current_doc

print('Architecture/documentation debt audit applied.')
