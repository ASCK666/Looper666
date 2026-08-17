# Looper666 contributor instructions

## Product goal

Keep Looper666 fast to understand and fast to use for making a beat. Simplify the
implementation without turning the project into a framework, a generic audio
platform or a collection of abstraction layers.

The architecture source of truth remains:

- `docs/ARCHITECTURE.md` for current ownership;
- `docs/STATE_DEPENDENCY_MAP.md` for current dependencies and deferred debt;
- `docs/TARGET_ARCHITECTURE.md` for the target and non-negotiable constraints.

Read those files before changing JavaScript ownership or shared state.

## Authorization boundary

- Treat observations, comparisons and design opinions as feedback, not as
  permission to edit the product.
- Change UI, layout, CSS, HTML, assets or product behavior only when the user
  explicitly asks for that change.
- A request to simplify JavaScript authorizes JavaScript and focused test changes,
  not a visual redesign or an audio-algorithm change.
- When scope is ambiguous, explain the proposed file-level change before editing.

## JavaScript simplification contract

- Preserve the classic-script runtime and its documented load order:
  `bootstrap.js -> core.js -> looper.js -> practice.js -> chopper.js -> drums.js -> events.js`.
- Do not introduce a framework, TypeScript, a state library, dependency injection,
  a service container or a broad render-context object.
- Do not add a JavaScript file or migrate to ES modules merely to make the tree
  appear cleaner.
- Do not move whole families of globals proactively. Move one complete
  responsibility only when the new owner is obvious and the nearby data flow is
  easier to explain.
- Do not add setters, wrappers, facades or helper objects that merely hide a global
  read or assignment. A delegated operation must own a complete transition.
- Keep `events.js` as wiring: translate a DOM event into one domain call. Reduce
  direct product-state writes when a complete transition can move to its owner.
- Keep Core limited to shared runtime/audio infrastructure. Keep Looper, Chopper
  and Drums behavior with their respective domains.
- Preserve real product coupling such as Drum generation reacting to the loaded
  sample. Make a dependency explicit only when doing so closes a useful boundary.
- Keep Practice frozen unless Practice work is explicitly requested.
- Remove the retired implementation path in the same change; do not leave a
  compatibility layer behind.

## Small-change gate

Every simplification PR must answer all of these questions before editing:

1. Which single ownership or dependency problem is being removed?
2. Which domain owns the responsibility before and after?
3. Which direct cross-domain read, write or workflow becomes simpler?
4. Why is the result easier for a maintainer to follow locally?
5. How will unchanged user-visible and audio behavior be verified?

Reject or split the change when those answers are unclear. Do not optimize line
count, function count or file count by themselves.

## Required workflow

1. Start from current `main` and inspect the working tree. Preserve unrelated work.
2. Run `python3 tools/test_all.py` before the change. Fix an unstable baseline in a
   separate PR before refactoring production code.
3. Change one complete responsibility. Do not mix ownership, design and audio work.
4. Add or strengthen the smallest behavioral regression invariant that protects
   the changed boundary.
5. Run `git diff --check` and `python3 tools/test_all.py` after the change.
6. If local browser tests are skipped, require the full GitHub Actions browser run
   to pass before merge.
7. Publish a small draft PR whose body states the ownership problem, affected
   files, dependency reduction and validation performed.
8. Keep documentation-only updates separate from runtime ownership changes.

## Stop conditions

Stop and reassess instead of continuing mechanically when:

- the next step would only move code without reducing or clarifying a dependency;
- a proposed API is longer or more abstract than the hidden relationship it replaces;
- the change requires touching UI or audio behavior outside the explicit request;
- the target owner is disputed or the state has more than one writer;
- maintained tests are failing for an unrelated reason;
- the PR can no longer be summarized as one responsibility.

After each merged ownership change, re-read `docs/STATE_DEPENDENCY_MAP.md`. Broad
architecture cleanup is not a standing queue: continue only with another narrow,
explicitly approved simplification.
