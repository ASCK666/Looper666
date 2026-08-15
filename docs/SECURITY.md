# Scratch Practice — Security review (V63)

Scope: static browser application in this repository. No server API is required by the app.

## Result

No high-severity application vulnerability was found in the V61 code during this pass.
V62 hardens the main local-file and browser persistence surfaces and adds regression tests.

## Local-data model

- Audio is selected explicitly by the user through `<input type=file>` or the File System Access API.
- The application does not contain analytics, telemetry, WebSocket, EventSource, remote API calls, or third-party script URLs.
- User filenames are rendered with `textContent`, not interpreted as HTML.
- Imported beat blobs can be stored in IndexedDB for the local beat library.
- The `beat_scratch` directory handle can be stored in IndexedDB for reconnection convenience. Browser permission rules still apply.
- Drum directory handles are session-only.

## V62 hardening

1. **Least-privilege filesystem permission**
   - Normal `CONNECT K:\beat_scratch` asks for read access only.
   - Read/write access is requested only from the explicit SAVE action.

2. **Bounded local-file handling**
   - Beat: 512 MB maximum per file.
   - Chopper sample: 256 MB maximum per file.
   - Drum hit: 64 MB maximum per file.
   - Drum folder: maximum 5,000 compatible entries indexed per lane.
   - Persistent beat-folder cache: maximum 200 files / 384 MB per scan.

3. **IndexedDB failure isolation**
   - A quota failure no longer hides the existing persistent beat library.
   - New rows can fall back to session memory while persistent rows remain visible.
   - One database connection is reused and closed on `versionchange`.

4. **Output filename hygiene**
   - Path separators/control characters are removed.
   - Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1`… `LPT9`) are neutralized.
   - Trailing spaces/dots are removed.

5. **Service-worker cache scope**
   - Only same-origin requests are considered.
   - Only the known static application files are cached.
   - Arbitrary GET traffic is no longer dynamically added to the application cache.

6. **DOM/XSS posture**
   - No `eval`, `new Function`, `document.write`, or `insertAdjacentHTML` is used.
   - `innerHTML` is only used with the empty string to clear trusted containers.
   - A browser regression test imports an audio file whose filename looks like an HTML injection and verifies that no element/script is created.

## Deployment headers

For HTTPS deployment, apply the headers in `docs/nginx-security.conf` at the web-server layer. A header-level CSP is preferred to a `<meta>` CSP because the application is also intentionally usable directly from `file://`.

## Residual risks

- A malicious browser extension or a future same-origin script compromise can access whatever the browser has granted to that origin. Keep the application origin dedicated to Scratch Practice and avoid adding untrusted third-party scripts.
- Audio decoding remains browser-native. Corrupt files are rejected by `decodeAudioData`, but very complex media-decoder vulnerabilities are browser/OS concerns; keep Chromium/Edge up to date.
- IndexedDB stores local beat data. Clearing browser site data removes this cache/library.
- Direct folder access depends on Chromium's File System Access permission model; the app cannot revoke an OS/browser permission on its own.


## V63 regression hardening

- Sample analysis now measures stereo channels independently, avoiding phase-cancellation blind spots.
- SAVE validates musical state before any write-permission prompt.
- Loaded-track deletion fully clears the active audio buffer and transport state.
- Snare reverb is deterministic, so preview and export do not diverge because of fresh random impulse noise.
- Rendered loop edges are smoothed over a 3 ms boundary region to prevent discontinuity clicks.
- Browser regression coverage now includes transport-state preservation, Practice timer shutdown, pitch rerender, drum folder fallback, deterministic reverb, loop-edge continuity, and anti-phase stereo analysis.
