# V86 review — unified cassette hardware

V86 keeps the existing Looper and Chopper audio paths while clarifying the
physical model of the Looper interface.

## Deck

- The cassette mechanism and its five transport controls share one column and
  therefore the same exact width at every responsive breakpoint.
- The former oversized EJECT bay is now a four-wheel tape counter with an
  independent RESET key and a compact EJECT / LOAD-REPLACE key.
- Counter travel is derived from the compact-cassette standard speed of
  4.75 cm/s. One displayed unit represents 4.75 cm; playback rate scales the
  counter, STOP freezes it and PLAY resumes it.

## Beat Crate

- Tracks are displayed as cassette-case spines at an approximate 6.4:1 ratio.
- Every rack column exposes four physical slots and fills top-to-bottom before
  creating the next column.
- Three protected included beats occupy the first column by default; unused
  slots stay visible and imported user files retain their delete control.

## Verification

The V86 validation contracts cover the unified DOM hierarchy, tape-counter
state transitions, rack geometry, protected included beats, generated CSS,
JavaScript syntax, local audio assets and HTTP delivery.
