#!/usr/bin/env python3
"""Shared helpers for browser tests against the real project tree."""

from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import os

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


@contextmanager
def serve_project():
    """Serve the repository exactly as GitHub Pages receives it."""
    handler = partial(QuietHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def launch_chromium(playwright):
    """Use an explicit Chromium when provided, otherwise Playwright's browser."""
    options = {
        "headless": True,
        "args": ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"],
    }
    chromium = os.environ.get("CHROMIUM")
    if chromium:
        options["executable_path"] = chromium
    return playwright.chromium.launch(**options)
