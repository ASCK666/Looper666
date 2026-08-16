#!/usr/bin/env python3
"""End-to-end smoke test against the project exactly as it is served."""

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


def make_wav(path: Path, seconds=.35, hz=220):
    rate = 44100
    frames = max(1, int(rate * seconds))
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(rate)
        payload = []
        for index in range(frames):
            value = int(.18 * 32767 * math.sin(2 * math.pi * hz * index / rate))
            payload.append(struct.pack("<h", value))
        output.writeframes(b"".join(payload))


with tempfile.TemporaryDirectory() as temp_dir, serve_project() as base_url, sync_playwright() as playwright:
    temp_dir = Path(temp_dir)
    beat = temp_dir / "test-beat.wav"
    sample = temp_dir / "test-sample.wav"
    make_wav(beat, .30, 180)
    make_wav(sample, .42, 330)

    browser = launch_chromium(playwright)
    page = browser.new_page(viewport={"width": 1280, "height": 1000})
    page_errors = []
    console_errors = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)

    page.goto(base_url + "/index.html", wait_until="load", timeout=20000)
    page.wait_for_function("window.__SP && window.__SP.ready === true", timeout=15000)

    assert page.evaluate("window.__SP.errors.length") == 0, page.evaluate("window.__SP.errors")
    assert not page_errors, page_errors
    assert not console_errors, console_errors

    # The real deck refactor must be installed before events.js binds handlers.
    for element_id in [
        "playBeat", "stopBeat", "prevBeat", "nextBeat", "autoLooperToggle",
        "loadSampleBtn", "sampleFile", "samplePitch", "sampleVolume", "loopGrid",
        "previewFlip", "stopFlip", "addFlipLibrary", "chopStatus",
    ]:
        assert page.locator("#" + element_id).count() == 1, element_id

    assert page.locator("#looper .artworkTransport #playBeat").count() == 1
    handlers = page.evaluate("""() => ({
        play: typeof document.getElementById('playBeat').onclick,
        sample: typeof document.getElementById('loadSampleBtn').onclick,
        auto: typeof document.getElementById('autoLooperToggle').onclick,
        preview: typeof document.getElementById('previewFlip').onclick
    })""")
    assert all(value == "function" for value in handlers.values()), handlers

    # Real Looper import -> PLAY -> STOP.
    page.set_input_files("#beatFiles", str(beat))
    page.wait_for_function("document.getElementById('deckTrack').textContent === 'test-beat.wav'", timeout=10000)
    page.click("#playBeat")
    page.wait_for_function("deckSource !== null", timeout=10000)
    assert page.locator("#looper .cassetteDeck.playing").count() == 1
    page.click("#stopBeat")
    page.wait_for_function("deckSource === null", timeout=10000)

    # AUTO state is bound directly to the artwork control.
    if page.locator("#autoLooperToggle").get_attribute("aria-pressed") != "false":
        page.click("#autoLooperToggle")
    page.click("#autoLooperToggle")
    assert page.locator("#autoLooperToggle").get_attribute("aria-pressed") == "true"
    page.click("#autoLooperToggle")
    assert page.locator("#autoLooperToggle").get_attribute("aria-pressed") == "false"

    # Real Chopper sample import through the currently deployed DOM contract.
    page.click('[data-tab="chopper"]')
    page.set_input_files("#sampleFile", str(sample))
    page.wait_for_function(
        "document.getElementById('chopStatus').textContent.includes('SAMPLE READY')",
        timeout=10000,
    )
    assert page.evaluate("sampleBuffer !== null && sampleName === 'test-sample.wav'") is True
    assert page.locator("#pads .pad").count() == 16
    assert page.locator("#loopGrid .matrixCell").count() == 256

    # No accidental horizontal overflow in the two primary modes.
    assert page.evaluate("document.body.scrollWidth <= innerWidth + 2") is True
    page.click('[data-tab="looper"]')
    assert page.evaluate("document.body.scrollWidth <= innerWidth + 2") is True

    assert page.locator("#appBootError.visible").count() == 0
    assert not page_errors, page_errors
    assert not console_errors, console_errors

    page.close()
    browser.close()

print("OK: real-site browser smoke — boot, Looper import/transport/AUTO and Chopper sample import")
