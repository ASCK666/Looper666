from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "looper-ui" / "faceplate.webp"
OUTPUT_DIR = ROOT / "test-artifacts"
OUTPUT = OUTPUT_DIR / "cassette-reference.png"

CANVAS = (1536, 1024)
REFERENCE_BOX = (468, 109, 1064, 393)


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    if source.size != CANVAS:
        raise SystemExit(f"Unexpected faceplate geometry: {source.size}, expected {CANVAS}")

    # Keep the canonical full-canvas coordinate space. Only the enclosing
    # cassette reference area is copied; all other pixels stay transparent.
    layer = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    crop = source.crop(REFERENCE_BOX)
    layer.paste(crop, REFERENCE_BOX[:2])

    OUTPUT_DIR.mkdir(exist_ok=True)
    layer.save(OUTPUT, format="PNG", optimize=False)

    # Guard against accidental geometry drift.
    check = Image.open(OUTPUT)
    if check.size != CANVAS:
        raise SystemExit(f"Output geometry drifted: {check.size}")

    print(f"Wrote {OUTPUT.relative_to(ROOT)}")
    print(f"Canvas: {CANVAS[0]}x{CANVAS[1]}")
    print(f"Reference box: {REFERENCE_BOX}")
    print("Reference only: faceplate.webp was not modified")


if __name__ == "__main__":
    main()
