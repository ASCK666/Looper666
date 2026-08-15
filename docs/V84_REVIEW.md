# V84 review — clarified responsive Looper

## Live interface

The clarified Looper is built from live HTML controls and component-owned CSS. The cassette artwork supplies only the physical mechanism; transport, loading controls, text, status, speed and AUTO state remain dynamic and accessible.

The interaction order is explicit:

1. track, playback state, speed and AUTO rule;
2. cassette mechanism;
3. EJECT / REPLACE, IMPORT BEAT and OPEN LIBRARY;
4. PREV / PLAY / STOP / NEXT / AUTO SPEED;
5. ready/import/error strip;
6. scrollable Beat Crate.

## States and lighting

Inactive controls use restrained light leaking around the full hardware seam. PLAY becomes clearly brighter only while audio is running. AUTO has its own ON/OFF readout and displays progress toward eight loops. LIBRARY uses a weaker desaturated teal seam so it never looks active.

Long track names are truncated in the permanent display and in cassette-spine rows. Import feedback reuses the status strip instead of creating a floating panel.

## Mobile behavior

Below 680 px, the interface reflows instead of scaling down:

- the cassette uses the full width;
- EJECT, IMPORT and LIBRARY form one touch row;
- PREV, PLAY, STOP and NEXT remain four large keys;
- AUTO SPEED becomes a separate full-width toggle;
- the Beat Crate exposes three comfortable rows and scrolls for the rest.

## Validation

The V84 suite checks dynamic readout bindings, real meter updates, loading handlers, touch reflow contracts, DOM references, JavaScript syntax, CSS health, CSS redundancy, service-worker resources and localhost deployment.
