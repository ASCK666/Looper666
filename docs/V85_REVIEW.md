# V85 review — code cleanup and regression hardening

## Scope

V85 preserves the complete V84 interface and audio behavior. This pass changes
implementation and test coverage only.

## Cleanup

- Removed three unused shared state variables and nine retired helpers.
- Removed the folder-handle settings path that no startup flow restored.
- Centralized file-picker opening and beat-import reporting.
- Centralized active-preview rebuilding for volume, pitch, PUNCH and NEW DRUMS.
- Removed six obsolete cassette visuals from the deployable folder.
- Pruned obsolete V70–V83 review files; V84 remains as the visual baseline.
- Updated runtime and service-worker versions to V85.

## Regression coverage

- `js_health.py` rejects duplicate/dead declarations and debug residue.
- `core_unit.js` exercises utility bounds, local-file guards, cassette metadata
  helpers and PCM WAV export.
- `assets_health.py` prevents retired artwork from returning to the package.
- `audio_assets.py` verifies the three included beats remain stereo PCM16,
  44.1 kHz, audible and duration-stable.
- The historical DOM, CSS, responsive, audio-engine, security, HTTP and optional
  browser suites remain enabled through `tools/test_all.py`.
