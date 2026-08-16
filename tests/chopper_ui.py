#!/usr/bin/env python3
"""Focused Chopper behavior test against the real served application."""

from pathlib import Path
import math
import struct
import sys
import tempfile
import wave

try:
    from playwright.sync_api import sync_playwright
except Exception:
    print("SKIP: playwright is not installed")
    sys.exit(0)

from site_test_utils import launch_chromium, serve_project


def make_wav(path: Path, duration=.55, freq=220, sample_rate=44100):
    count = int(duration * sample_rate)
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(sample_rate)
        frames = bytearray()
        for index in range(count):
            envelope = .8 if (index % (sample_rate // 8)) < 1800 else .25
            value = max(-1, min(1, envelope * math.sin(2 * math.pi * freq * index / sample_rate)))
            frames += struct.pack("<h", int(value * 32767))
        output.writeframes(frames)


with tempfile.TemporaryDirectory() as temp_dir, serve_project() as base_url, sync_playwright() as playwright:
    sample = Path(temp_dir) / "chopper-ui.wav"
    make_wav(sample)

    browser = launch_chromium(playwright)
    page = browser.new_page(viewport={"width": 1280, "height": 1000})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))

    page.goto(base_url + "/index.html", wait_until="load", timeout=20000)
    page.wait_for_function("window.__SP && window.__SP.ready === true", timeout=15000)
    page.click('[data-tab="chopper"]')

    page.set_input_files("#sampleFile", str(sample))
    page.wait_for_function("sampleBuffer !== null && sampleName === 'chopper-ui.wav'", timeout=10000)
    page.wait_for_function("document.getElementById('chopStatus').textContent.includes('SAMPLE READY')", timeout=10000)

    page.click("#autoMarkers")
    page.wait_for_timeout(80)
    state = page.evaluate("""() => ({
        markers: markers.length,
        pads: document.querySelectorAll('#pads .pad').length,
        cells: document.querySelectorAll('#loopGrid .matrixCell').length,
        rows: document.querySelectorAll('#loopGrid .matrixRowLabel').length,
        pitch: document.getElementById('samplePitchReadout').textContent,
        volume: document.getElementById('sampleVolumeReadout').textContent
    })""")
    assert state["markers"] == 17, state
    assert state["pads"] == 16, state
    assert state["rows"] == 16 and state["cells"] == 256, state
    assert state["pitch"], state
    assert state["volume"], state

    # Place and remove one chop from the sequence grid.
    cell = page.locator("#loopGrid .matrixCell:not(.unavailable)").first
    cell.click()
    assert page.evaluate("loopGridEvents.some(value => value > 0)") is True
    cell.click(button="right")
    assert page.evaluate("loopGridEvents.every(value => value === 0)") is True

    # Controls introduced by chopper-layout.js must be visible and usable.
    boxes = page.evaluate("""() => [
        'loadSampleBtn', 'autoMarkers', 'previewFlip', 'stopFlip',
        'addFlipLibrary', 'clearGrid', 'samplePitch', 'sampleVolume'
    ].map(id => {
        const element = document.getElementById(id);
        const rect = element.getBoundingClientRect();
        return {id, width: rect.width, height: rect.height};
    })""")
    assert all(item["width"] > 0 and item["height"] > 0 for item in boxes), boxes
    assert not errors, errors
    assert page.locator("#appBootError.visible").count() == 0

    page.close()
    browser.close()

print("OK: real-site Chopper UI — load, AUTO CHOP, pads, grid and controls")
