#!/usr/bin/env python3
"""Serve the deployable folder and verify its critical static responses."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


handler = partial(QuietHandler, directory=str(ROOT))
server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()

base_url = f"http://127.0.0.1:{server.server_port}"
try:
    expected = {
        "/index.html": ("text/html", b"Scratch Practice"),
        "/css/base.css": ("text/css", b"maintained runtime base stylesheet"),
        "/css/clean-ui.css": ("text/css", b"Lean UI overrides"),
        "/js/events.js": ("javascript", b"addEventListener"),
        "/manifest.json": ("application/json", b"Local pixel-art Looper"),
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

    deck = "/assets/cassette-mechanism-pixel-v84.png"
    with urlopen(Request(base_url + deck, method="HEAD"), timeout=5) as response:
        assert response.status == 200
        assert response.headers.get_content_type() == "image/png"
        assert int(response.headers["Content-Length"]) > 1_000_000
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=5)

print("OK: deployable folder serves HTML, both runtime CSS files, JS, manifest and production assets locally")
