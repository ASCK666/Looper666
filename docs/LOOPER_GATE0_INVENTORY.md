# Looper V1 — Gate 0 migration inventory

Status: **Gate 0 complete**

This inventory is the precondition for any V2 architectural code. It reviews the current Looper implementation against `docs/RESPONSIBILITIES.md` and `docs/ARCHITECTURE_TARGET.md`.

The purpose is not to redesign Looper. It is to identify what already works, where each behavior really belongs, what can be migrated mostly intact, what requires adaptation, and what must not be copied into V2.

## Gate 0 decision

**The current target architecture is feasible for a Looper pilot, with two important clarifications discovered from V1:**

1. **Library search/sort is behavior, not presentation only.** `selectRelative()` navigates through `visibleLibraryRowsState`, so the currently visible ordering affects PREV/NEXT semantics. The Looper facade must therefore own a small library/navigation model (or equivalent ordered row IDs). The view may render it, but must not be the source of truth for navigation.
2. **Beat import is a facade use case, not a repository method alone.** Current import decodes files, persists rows, loads the first successfully imported beat into the deck, and refreshes the library. V2 must split those operations while preserving the single user-visible use case.

No evidence from Gate 0 requires abandoning the target or rewriting Looper from scratch.

## Classification vocabulary

- **REUSE** — behavior/data can move essentially intact after dependency injection/renaming.
- **EXTRACT** — behavior is sound but belongs in another target owner.
- **ADAPT** — behavior stays, but its inputs/outputs or orchestration boundary must change.
- **WRAP** — keep V1 implementation temporarily behind the V2 facade while consumers migrate.
- **REPLACE** — current mechanism is itself the architectural problem; preserve user behavior, not implementation.
- **DELETE** — obsolete compatibility behavior must not enter V2.
- **DECIDE** — product/source inconsistency must be resolved before the relevant migration gate.

## Current V1 ownership map

### State currently declared in `core.js`

| V1 state | Current role | Target owner | Migration |
|---|---|---|---|
| `ctx`, `liveBus` | shared live Web Audio runtime | `audio-runtime` | EXTRACT / REUSE |
| `deckSource` | active Looper source node | Looper engine private state | EXTRACT |
| `deckBuffer` | decoded loaded beat | Looper engine private state | EXTRACT |
| `currentTrack` | selected track metadata | Looper facade feature state; engine receives playback payload | ADAPT |
| `deckOutputGain` | active Looper output node | Looper engine private state | EXTRACT |
| `autoLooperEnabledState` | AUTO state | Looper engine | EXTRACT |
| `autoLooperTimer` | AUTO polling timer | Looper engine private state | EXTRACT |
| `autoLooperLastCtxTime` | loop progress timing | Looper engine private state | EXTRACT |
| `autoLooperSourceSeconds` | accumulated source time | Looper engine private state | EXTRACT |
| `autoLooperLoopCount` | AUTO loop count | Looper engine state snapshot | EXTRACT |
| `autoLooperSpeedPercent` | current playback speed | Looper engine state snapshot | EXTRACT |

These variables are currently globals and are read outside `looper.js`. The V2 facade must stop new consumers from seeing them before engine extraction begins.

### State currently declared in `looper.js`

| V1 state | Target owner | Migration note |
|---|---|---|
| DB constants / `memoryBeatStore` / `dbFallbackMode` / `dbPromise` | Beat repository | Preserve fallback and transaction semantics. |
| `storeLampTimer` | Looper/view feedback | Do not keep UI timers in repository. |
| `beatDirectoryHandle` / `beatDirectoryRows` | Beat repository | Directory handle remains private. |
| `visibleLibraryRowsState` | **Looper facade library/navigation model** | PREV/NEXT depends on this ordering. Do not move ownership to view only. |
| `trackLoadSequence` | Looper facade/load orchestration | Preserves stale-decode race safety. |
| `deckTransportSequence` | Looper engine | Preserves PLAY/STOP race safety. |
| `DEFAULT_BEATS` | Beat repository/catalog if retained | **DECIDE**: references missing assets today. |

## Constants

| Constants | Target | Classification |
|---|---|---|
| `BEAT_DB_*`, `BEAT_FOLDER_CACHE_PREFIX` | Beat repository | REUSE |
| `MIN_RACK_COLUMNS`, `RACK_SLOTS_PER_COLUMN` | Looper view | EXTRACT |
| `AUTO_LOOP_BATCH`, `AUTO_SPEED_MAX_PERCENT`, progress interval | Looper engine | EXTRACT / REUSE |
| `AUTO_SPEED_INCREMENT_PERCENT` | Looper engine policy | ADAPT because current polish changes effective increment by level |
| reel cycle constants | Deck view | EXTRACT |

## Function inventory

### A. Cassette / deck presentation

| V1 function | Classification | Target | Notes / preserved behavior |
|---|---|---|---|
| `refreshCassetteUI()` | REPLACE + EXTRACT | deck/Looper view | Current implementation reads DOM and engine globals. Preserve EMPTY/READY/PLAYING, speed and hints through facade state snapshots. Do not preserve the function-replacement hook used by polish. |
| `refreshAutoLooperCompact()` | REPLACE + EXTRACT | deck view | Visual reel rate, AUTO classes/readouts belong in view. `sp:auto-looper-state` is temporary V1 compatibility, not primary V2 state. |
| `flashStoreLamp()` | EXTRACT | view/facade feedback | Repository must not toggle DOM lamps. Prefer result/status exposed by use case; keep simple visual pulse if useful. |
| `updateBeatFolderStatus()` | EXTRACT | Looper view | Pure status rendering. Repository returns result/error instead. |
| `setBeatSaveStatus()` | EXTRACT | current Chopper/beat-save view boundary | This helper is used outside Looper; it must not move into Beat repository. |

### B. IndexedDB and persistent beat store

| V1 function | Classification | Target | Notes |
|---|---|---|---|
| `enableDbFallback()` | REUSE / EXTRACT | Beat repository | Session fallback is valuable behavior. |
| `openDb()` | REUSE / EXTRACT | Beat repository | Preserve blocked/error/versionchange handling and promise reset. |
| `transactionError()` | REUSE | Beat repository helper | Existing QuotaExceeded specificity is unit-tested. |
| `runBeatStoreTransaction()` | REUSE / EXTRACT | Beat repository | Keep transaction completion/abort semantics. |
| `dbPut()` | ADAPT | Beat repository | Remove `flashLamp` UI side effect. Return enough result metadata for facade/view feedback. Preserve quota fallback. |
| `dbDelete()` | REUSE / EXTRACT | Beat repository | Keep persistent-delete failure behavior. |
| `dbAll()` | REUSE / EXTRACT | Beat repository | Preserve memory overlay over persistent rows. |
| `beatCacheId()` | REUSE | Beat repository | Pure helper; unit-tested. |
| `cacheBeatDirectoryFile()` | REUSE / EXTRACT | Beat repository | Remove implicit UI dependency via `dbPut` adaptation. |
| `clearBeatDirectoryCache()` | REUSE / EXTRACT | Beat repository | Behavior is repository-local. |

### C. Beat folder / filesystem

| V1 function | Classification | Target | Notes |
|---|---|---|---|
| `beatFolderSupported()` | REUSE / EXTRACT | Beat repository | Browser capability check. |
| `beatFolderPermission()` | REUSE / EXTRACT | Beat repository | Keep handle private. |
| `normalizeBeatDirectoryHandle()` | REUSE / EXTRACT | Beat repository | Preserve exact `beat_scratch` safety policy unless product requirement changes. |
| `scanBeatDirectory()` | ADAPT | Beat repository | Keep enumeration, file limits, atomic cache replacement. Remove DOM status + `refreshLibrary()` calls; return structured scan result. |
| `connectBeatDirectory()` | ADAPT | Beat repository called through facade/use case | Preserve direct picker call path and AbortError behavior. Remove UI writes and refresh calls. |
| `ensureBeatDirectoryWriteAccess()` | REUSE / ADAPT | Beat repository | **User activation sensitive.** Must remain synchronously reachable from click -> facade -> repository before heavy async render. |
| `safeBeatFilename()` | REUSE | Beat repository/shared file helper | Unit-tested Windows-safe naming. |
| `timestampForFilename()` | REUSE | Beat repository/shared file helper | Unit-tested format. |
| `downloadBeatFallback()` | EXTRACT / ADAPT | Beat repository browser-save adapter | DOM anchor creation is an infrastructure detail, not feature UI. Keep fallback behavior. |
| `saveBlobToBeatDirectory()` | ADAPT | Beat repository | Preserve write/abort/size verification/cache/rescan. Remove `refreshLibrary()` call; return save + repository-change result. |

### D. Import use case

| V1 function | Classification | Target | Notes |
|---|---|---|---|
| `importBeatFiles()` | **ADAPT; split orchestration** | Looper facade + Beat repository + audio runtime + engine | Do not copy as one repository method. Preserve file filtering/limits, per-file decode failure isolation, persistence, first-successful-import becomes loaded track, no autoplay, stale load-request protection, summary counts. |

This is one of the most important Gate 0 findings. Import currently spans four future owners. The facade should keep the use case cohesive while delegating the mechanics.

### E. Library model and presentation

| V1 function | Classification | Target | Notes |
|---|---|---|---|
| `beatSpineTone()` | REUSE / EXTRACT | Looper view | Deterministic presentation helper; unit-tested. |
| `isFolderBeat()` | REUSE | Beat/library model | Source classifier. |
| `isBundledBeat()` | REUSE | Beat/library model | Source classifier. |
| `relativeTrackIndex()` | REUSE | Looper facade navigation | Pure and unit-tested. |
| `createBeatSpine()` | REPLACE + EXTRACT | Looper view + facade commands | Rendering can be adapted, but current delete handler mutates engine globals directly. View should invoke `Looper.deleteBeat(id)` / equivalent. |
| `mergeLibraryRows()` | ADAPT | Looper facade/library model or repository query layer | Parameterize live rows/catalog instead of reading globals. Must resolve bundled-beat decision. |
| `visibleLibraryRows()` | REUSE | Looper facade library/navigation model | Pure search/sort, unit-tested. **Its result drives PREV/NEXT.** |
| `createCassetteRackColumn()` | REUSE / EXTRACT | Looper view | Pure DOM composition after row model is supplied. |
| `renderLibraryRows()` | REUSE / EXTRACT | Looper view | Keep rendering behavior; no engine mutation. |
| `refreshLibrary()` | REPLACE as orchestration, preserve pieces | Looper facade + repository + view | Today combines repository reads/rescan, DOM query values, model calculation, state mutation and render. V2 facade should accept/search state, query repository, compute navigation list, publish snapshot; view renders snapshot. |

### F. Track decode/load orchestration

| V1 function | Classification | Target | Notes |
|---|---|---|---|
| `decodeTrackAudio()` | ADAPT | Looper facade + audio runtime | Engine should not know Blob/URL/fetch. Resolve bytes/source outside engine, decode through audio runtime. Preserve file-size and fetch failure behavior. |
| `commitLoadedTrack()` | **SPLIT** | facade + engine + view subscription | Engine receives decoded buffer/playback metadata; facade owns selected row metadata; UI updates disappear into state publication. Reset-to-original-speed behavior must remain. |
| `loadTrack()` | ADAPT | Looper facade | Preserve stale decode cancellation (`trackLoadSequence`) and “if deck was playing, switch and resume; STOP during slow decode stays stopped.” This is high-value race logic. |
| `switchTrack()` | REUSE as facade alias/use case | Looper facade | Thin `preservePlayback=true` use case. |

### G. Playback and AUTO engine

| V1 function | Classification | Target | Notes |
|---|---|---|---|
| `deckRate()` | REUSE / EXTRACT | Looper engine | Pure derived state. |
| `resetAutoLooperProgress()` | EXTRACT / ADAPT | Looper engine | Replace UI refresh with state publication callback/facade notification. |
| `stopAutoLooperProgress()` | EXTRACT / ADAPT | Looper engine | Preserve timer cancellation and counter reset. |
| `applyAutoLooperIncrement()` | **ADAPT** | Looper engine | Current deployed behavior is monkey-patched by `looper-polish.js` to support +1..+5 levels. V2 engine must encode that policy directly rather than preserve monkey patch. |
| `startAutoLooperProgress()` | REUSE / EXTRACT | Looper engine | Preserve source-time accumulation at current playback rate, loop batch semantics and interval timing. Replace UI callback. |
| `toggleAutoLooper()` | ADAPT / EXTRACT | Looper engine via facade | Preserve reset to 100% when disabled and active-source playbackRate reset. |
| `playDeck()` | REUSE heavily / EXTRACT | Looper engine via facade | Preserve `deckTransportSequence` race guard, buffer identity check, looping source, output gain, AUTO start semantics. Remove DOM lamps/meters/cassette refresh; audio runtime handles neutral connection/meter runtime. |
| `stopDeck()` | REUSE heavily / EXTRACT | Looper engine via facade | Preserve pending-play cancellation option, source/gain disconnect and AUTO stop. Remove DOM side effects. |
| `selectRelative()` | ADAPT | Looper facade | Must use facade-owned ordered visible row IDs, not view state. |

## `looper-polish.js` inventory

`looper-polish.js` contains current production behavior, so it cannot simply be deleted before its useful behavior is absorbed.

| Behavior | Classification | Target |
|---|---|---|
| clean displayed beat title | REUSE / EXTRACT | deck view helper |
| infer BPM from row/name fallback | REUSE / EXTRACT | facade snapshot metadata or deck view helper |
| create/refresh printed cassette label | EXTRACT | deck view |
| AUTO speed level 0..5 and cycling | **ADAPT into canonical engine policy** | Looper engine + facade command |
| override `applyAutoLooperIncrement` | DELETE implementation after policy migration | forbidden monkey patch |
| override `refreshCassetteUI` | DELETE implementation after state/view migration | forbidden monkey patch |
| replace `autoLooperToggle.onclick` | DELETE implementation after event adapter calls facade | Looper events owns browser click |
| polling `waitForLooper()` boot attachment | DELETE after explicit boot/facade exists | no load-order polling in established V2 boundary |

**Removal condition:** `looper-polish.js` may be deleted only when AUTO +1..+5 behavior and printed cassette metadata both pass browser parity through the facade/view architecture.

## Direct V1 consumers that Gate 1 must protect

| Consumer | Current dependency | Gate 1 direction |
|---|---|---|
| `looper-events.js` | `importBeatFiles`, `refreshLibrary`, `playDeck`, `stopDeck`, `selectRelative`, `toggleAutoLooper`, status helpers | Move browser actions incrementally to Looper facade methods. |
| `events.js` | reads `deckSource`; calls `playDeck`, `stopDeck`, `refreshLibrary`, `refreshCassetteUI`, `refreshAutoLooperCompact` | Space shortcut and shared init must use facade/public initialization. |
| `deck-refactor.js` | reads `deckBuffer`, `deckSource`, `autoLooperLoopCount`; depends on `refreshCassetteUI`; listens to V1 AUTO event | Gate 2 converts this to `Looper.getState()/subscribe()`. |
| `looper-polish.js` | reads Looper globals and monkey-patches engine/UI functions | Absorb useful policy/presentation, then delete. |
| `practice.js` | reads `deckBuffer`/`deckSource`, calls `playDeck()` | Later convert to Looper facade; not required to prove initial transport slice but must remain compatible. |
| `chopper-events.js` | uses beat folder permission/connect/save/download/filename/status functions | Gate 4 must expose Beat repository without routing Chopper through Looper internals. Preserve user-gesture path. |

## Behavioral contracts to preserve

### Track/import behavior

- Ignore non-audio files but report skipped count.
- Reject oversized files without aborting the whole import batch.
- Decode failures are isolated per file.
- Persist successful imported rows.
- The first successful imported beat becomes loaded immediately.
- Import **does not autoplay**.
- A newer load request wins over older asynchronous work.

### Track switching race behavior

- Switching while playing resumes playback on the new decoded track.
- STOP pressed during a slow decode must remain stopped.
- A stale decode must not overwrite a newer track load.

### Playback race behavior

- A pending PLAY invalidated by STOP must not create/start a source later.
- A pending PLAY for an old buffer must not start after the loaded buffer changes.

### AUTO behavior

- AUTO progression is based on source time, including current playback rate.
- Every `AUTO_LOOP_BATCH` loops, AUTO increases speed if enabled.
- Current deployed UI supports AUTO level 0..5; level N means an effective +N percentage points per batch through the polish wrapper.
- Disabling AUTO resets speed to 100% and resets an active source rate to 1.
- AUTO counters/timers reset appropriately on stop/load/toggle.

### Library/navigation behavior

- Bundled items sort before others when present.
- Search is case-insensitive substring matching.
- `recent` sorts by created descending; name order is locale alphabetical.
- PREV/NEXT wraps.
- PREV/NEXT uses the **currently filtered/sorted visible list**.
- Deleting the currently loaded user-import beat stops playback and clears loaded state.
- Folder and bundled rows are not deletable from the rack UI.

### Beat folder/storage behavior

- IndexedDB failure degrades to session-memory storage.
- Quota overflow keeps the new row in session memory without hiding persistent rows.
- Folder scan replaces cache only after a successful complete scan.
- Folder cache is bounded by count and bytes.
- Direct folder save validates the created file and rescans the real folder.
- Browser download remains fallback when direct folder save is unavailable.
- Picker/permission operations must preserve user-activation semantics.

## Existing tests and how to use them

### `tests/core_unit.js`

Protects useful migration pieces including:

- `safeBeatFilename()`;
- `beatCacheId()`;
- transaction error specificity;
- source classifiers;
- rack constants;
- AUTO batch constant;
- `relativeTrackIndex()`;
- library search/sort;
- WAV serialization and shared utilities.

**Migration action:** keep these assertions as behavior tests, but stop loading all of monolithic `looper.js` once extracted units have dedicated entry points.

### `tests/browser_smoke.py`

Currently verifies:

- boot without runtime errors;
- one real static artwork transport;
- local WAV import loads into Looper;
- PLAY creates playback and visual playing state;
- STOP stops playback;
- AUTO artwork control toggles on/off;
- Chopper still boots/imports after Looper initialization.

It currently asserts `deckSource` directly. **That assertion is a V1 implementation detail, not a V2 contract.** During Gate 2/3 change it to assert `Looper.getState().playing` plus user-visible state.

### `tests/http_smoke.py`

Protects deployed script/resources/static control IDs. Its current `sp:auto-looper-state` source markers are **temporary V1 architecture assertions** and should be replaced when `getState()/subscribe()` becomes primary.

### Missing coverage that must be added before the relevant behavior moves

Gate 0 found several high-value behaviors that are comments/implementation contracts but not directly protected strongly enough:

1. stale track decode cannot win after a newer load;
2. STOP during pending `playDeck()`/audio initialization remains stopped;
3. switching track while playing resumes new track;
4. AUTO level +1..+5 increments correctly after a batch;
5. disabling AUTO resets rate to 100%;
6. PREV/NEXT honors filtered/sorted library ordering;
7. deleting current imported beat clears Looper state;
8. IndexedDB fallback / QuotaExceeded merge behavior beyond helper-level unit coverage;
9. direct-folder permission/save user activation path (where CI/browser support permits).

**Rule:** add the narrow parity test before moving each associated behavior, not all at once.

## Known product/source inconsistency: bundled beats

`DEFAULT_BEATS` declares three bundled WAV URLs under `./assets/beats/`, but `assets/beats/` is absent on the current branch.

Classification: **DECIDE — do not copy into V2 unchanged.**

Options before Gate 4 repository extraction:

1. restore the intended WAV assets and keep the bundled catalog; or
2. remove bundled-beat rows/copy and migrate only real available sources.

Do not fabricate replacement audio and do not let a V2 repository make unavailable assets look supported.

This inconsistency does **not** block Gate 1–3 (facade/state/engine pilot), provided tests do not rely on those files.

## Proposed Gate 1 facade surface based on V1 reality

The minimal facade should cover current external use cases, not every internal function:

```text
Looper.getState()
Looper.subscribe(listener)
Looper.play()
Looper.stop()
Looper.toggleAuto()
Looper.setAutoSpeedLevel(level)
Looper.selectRelative(delta)
Looper.importFiles(files)
Looper.setLibraryQuery(query)
Looper.setLibraryOrder(order)
Looper.refreshLibrary({rescanDirectory})
Looper.deleteBeat(id)
```

A separate public repository surface may appear only when Gate 4 begins; do not expose it prematurely merely to match the final diagram.

Suggested snapshot split to avoid one giant feature state object:

```text
Looper.getState() -> transport/current-track/AUTO state
Looper.getLibraryState() -> rows/query/order/loading/status
```

or one top-level snapshot with `{transport, library}` sections. Choose whichever causes fewer forwarding wrappers during Gate 1.

## Exact migration order after Gate 0

### Gate 1A — facade shell over existing V1 functions

- Add one intentional Looper public namespace/facade.
- Initially delegate commands to existing V1 functions.
- Do **not** move playback/storage code yet.
- Move `looper-events.js` transport calls and app-shell Space command to facade first.
- Keep V1 globals/function names while remaining consumers still need them.

**Stop condition:** if introducing the facade requires duplicating Looper state or rewriting playback, the facade design is wrong.

### Gate 1B — canonical AUTO policy before deleting polish

- Move AUTO level 0..5 policy into one canonical command/state path.
- Stop replacing `applyAutoLooperIncrement` and button handlers.
- Move printed-label behavior to deck view/state rendering.
- Delete `looper-polish.js` only when parity passes.

### Gate 2 — explicit state publication

- Implement facade snapshot + `subscribe(listener)`.
- Convert deck view and app-shell state reads.
- Convert browser smoke from `deckSource` to public state.
- Remove `sp:auto-looper-state` after its final compatibility consumer is gone.

### Gate 3 — playback/AUTO engine extraction

- Move playback nodes, transport sequence and AUTO timing/policy into engine private state.
- Inject/use neutral audio runtime primitives.
- Keep load/library/repository orchestration in facade temporarily.
- No DOM access in engine.

### Gate 4 — Beat repository extraction

- Move DB/fallback/folder/save functions with minimal algorithm changes.
- Split `importBeatFiles()` between facade orchestration, repository persistence and audio decode.
- Expose repository operations needed by Chopper save.
- Preserve direct user-activation path.
- Resolve the bundled-beats DECIDE item before declaring repository parity.

### Gate 5 — library/view extraction

- Move rack DOM composition and status/cassette presentation to views.
- Keep ordered visible-row IDs/model in facade because transport navigation depends on it.
- Move delete-current behavior into facade command rather than DOM handler mutation.

### Gate 6 — decision review

Continue to Drums only if:

- no engine DOM access;
- no deck/app-shell Looper globals;
- no monkey patches;
- race behaviors are covered and preserved;
- most playback/storage algorithms were moved/adapted rather than rewritten;
- the facade is use-case-sized, not a new god module;
- the view is not the source of truth for transport navigation;
- Beat repository is usable by Chopper independently;
- existing browser smoke remains green;
- V1 still provides the executable reference until parity is established.

## Gate 0 risk register

| Risk | Severity | Mitigation / decision |
|---|---:|---|
| Facade becomes new god module | High | Keep algorithms in engine/repository; facade owns orchestration + feature state only. Split transport/library snapshots if state grows. |
| Search/sort moved to view breaks PREV/NEXT semantics | High | Facade owns ordered visible navigation model. |
| Import pushed entirely into repository creates playback coupling | High | Import remains facade use case coordinating repository + decode + engine. |
| AUTO polish deleted before behavior absorbed | High | Gate 1B canonicalizes +1..+5 policy and printed label first. |
| Race protections lost during extraction | High | Preserve both sequence counters and add parity tests before moving their logic. |
| File picker/save stops working due to lost user activation | High | Keep permission acquisition on synchronous event -> facade -> repository call chain; test in Chromium. |
| Beat repository gains UI/status responsibilities | Medium/High | Return structured results; facade/view owns presentation. |
| Global CustomEvent replaces globals | Medium/High | Facade `subscribe()` primary; temporary DOM events have removal conditions. |
| Audio runtime becomes new `core.js` | Medium/High | Neutral AudioContext/bus/decode/offline/WAV only; no feature state. |
| Bundled beat catalog copied despite missing files | Medium | DECIDE before Gate 4; never fabricate assets. |
| V2 browser tests preserve old global names accidentally | Medium | Update tests to public facade state when boundary exists. |
| Too many target files/wrappers | Medium | Create module only when behavior is actually moved. |

## Gate 0 conclusion

**Proceed to Gate 1, but do not create a complete V2 tree or a new clean-room implementation.**

The Looper has enough reusable behavior to justify strangler-style migration. The difficult parts are not algorithms; they are ownership boundaries around import/library navigation, browser filesystem activation, UI side effects and the AUTO polish monkey patch.

The target survives Gate 0 with the clarifications above. The first implementation goal is therefore a thin Looper facade over V1 behavior, not a new Looper engine from scratch.
