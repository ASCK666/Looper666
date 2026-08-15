#!/usr/bin/env python3
"""Validate the three bundled beats as deployable PCM WAV files."""

from pathlib import Path
import struct
import sys
import wave

ROOT = Path(__file__).resolve().parents[1]
BEATS = ROOT / "assets" / "beats"
EXPECTED_DURATIONS = {
    "stack-piano-horns-85-asharp-minor.wav": 5.393265,
    "violin-piano-92-bflat-minor.wav": 5.217392,
    "stack-violin-piano-89-c-minor.wav": 5.333333,
}

failures = []
for filename, expected_duration in EXPECTED_DURATIONS.items():
    path = BEATS / filename
    if not path.exists():
        failures.append(f"missing {filename}")
        continue

    try:
        with wave.open(str(path), "rb") as audio:
            channels = audio.getnchannels()
            rate = audio.getframerate()
            width = audio.getsampwidth()
            frames = audio.getnframes()
            duration = frames / rate
            sample = audio.readframes(min(frames, 44100))
    except (EOFError, wave.Error) as error:
        failures.append(f"{filename}: invalid WAV ({error})")
        continue

    if (channels, rate, width) != (2, 44100, 2):
        failures.append(
            f"{filename}: expected stereo PCM16/44.1kHz, got "
            f"{channels}ch/{width * 8}bit/{rate}Hz"
        )
    if abs(duration - expected_duration) > 0.00001:
        failures.append(f"{filename}: duration changed to {duration:.6f}s")
    if sample and max(abs(value) for value in struct.unpack(f"<{len(sample)//2}h", sample)) < 64:
        failures.append(f"{filename}: audio appears silent")

extra = sorted(path.name for path in BEATS.glob("*.wav") if path.name not in EXPECTED_DURATIONS)
if extra:
    failures.append(f"unexpected bundled beats: {', '.join(extra)}")

if failures:
    for failure in failures:
        print(f"FAIL: {failure}")
    sys.exit(1)

print("OK: bundled audio — 3 stereo PCM16 WAV beats with stable durations")
