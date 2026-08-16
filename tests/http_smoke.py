#!/usr/bin/env python3
"""Serve the project tree and verify critical deployed resources."""

from urllib.request import Request, urlopen

from site_test_utils import serve_project


with serve_project() as base_url:
    expected = {
        "/index.html": ("text/html", b"Scratch Practice"),
        "/css/base.css": ("text/css", b"GENERATED production stylesheet"),
        "/css/chopper.css": ("text/css", b"#chopper .samplerWaveToolbar"),
        "/css/deck-refactor.css": ("text/css", b"DECK ARTWORK GEOMETRY CONTRACT"),
        "/js/chopper-layout.js": ("javascript", b"arrangeChopper"),
        "/js/deck-refactor.js": ("javascript", b"sp:auto-looper-state"),
        "/js/looper.js": ("javascript", b"sp:auto-looper-state"),
        "/js/events.js": ("javascript", b"bootSharedEvents"),
        "/js/looper-events.js": ("javascript", b"runLooperAction"),
        "/js/practice-events.js": ("javascript", b"practiceOverlayOpen"),
        "/js/chopper-events.js": ("javascript", b"loadSampleBtn"),
        "/js/drums-events.js": ("javascript", b"playDrumsOnly"),
        "/manifest.json": ("application/json", b"Scratch Practice"),
    }
    for path, (mime, marker) in expected.items():
        with urlopen(base_url + path, timeout=5) as response:
            body = response.read()
            assert response.status == 200, (path, response.status)
            assert mime in response.headers.get_content_type(), (
                path,
                response.headers.get_content_type(),
            )
            assert marker in body, (path, marker)

    with urlopen(base_url + "/index.html", timeout=5) as response:
        html = response.read()

    assert b"autoLooperCompactStatus" not in html

    event_scripts = [
        b'./js/events.js',
        b'./js/looper-events.js',
        b'./js/practice-events.js',
        b'./js/chopper-events.js',
        b'./js/drums-events.js',
    ]
    positions = [html.index(src) for src in event_scripts]
    assert positions == sorted(positions), (event_scripts, positions)

    for path in [
        "/assets/cassette-mechanism-pixel-v95.png",
        "/assets/cassette-reel-pixel-v81.png",
        "/assets/deck-buttons-backlight-idle.png",
        "/assets/deck-button-play-backlight-active.png",
    ]:
        with urlopen(Request(base_url + path, method="HEAD"), timeout=5) as response:
            assert response.status == 200, path
            assert response.headers.get_content_type() == "image/png", (
                path,
                response.headers.get_content_type(),
            )
            assert int(response.headers["Content-Length"]) > 100, path

print("OK: HTTP smoke — real HTML, CSS, direct AUTO state event, static split event JS and current deck assets serve locally")
