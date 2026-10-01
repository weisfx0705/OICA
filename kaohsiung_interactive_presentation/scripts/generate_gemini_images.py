import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
REFERENCE = ASSETS / "avatar-reference.jpg"
MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image-preview")


SCENES = [
    {
        "file": "hero-kaohsiung.png",
        "prompt": (
            "Create a polished square editorial illustration for a Chinese interactive presentation. "
            "Use the attached cartoon avatar as the recurring guide character: short black hair, round glasses, pink hoodie, expressive curious face, loose ink lines. "
            "Scene: the character stands in Kaohsiung with a bright harbor skyline, Love River, light rail curve, and warm November sunlight. "
            "Hand-drawn ink and watercolor look, clean white space, refined travel-magazine composition. No readable text."
        ),
    },
    {
        "file": "route-from-isu.png",
        "prompt": (
            "Create a square hand-drawn illustration using the same cartoon guide character from the reference. "
            "Scene: the character holds an easy transit map showing a mountain campus, a bus, Zuoying station, metro line, and city landmarks. "
            "Make it understandable as a journey from a hillside university to downtown Kaohsiung. "
            "Friendly orientation-poster style, ink outlines, soft color blocks, no readable text."
        ),
    },
    {
        "file": "harbor-bike.png",
        "prompt": (
            "Create a square illustration in the same reference avatar style. "
            "Scene: the character rides a bicycle along Kaohsiung's Love River harbor area with Pier-2 warehouses, Dagang Bridge, and waterfront lights. "
            "Dynamic but clear, travel sketchbook aesthetic, black ink linework with selective teal, coral, yellow, and pink accents. No readable text."
        ),
    },
    {
        "file": "lotus-culture.png",
        "prompt": (
            "Create a square illustration in the same cartoon guide style from the reference. "
            "Scene: the character visits Lotus Pond in Zuoying, looking at temple architecture, dragon-and-tiger tower forms, and lakeside paths. "
            "Respectful cultural learning mood, warm daylight, elegant ink and watercolor, no readable text."
        ),
    },
    {
        "file": "night-market-sharing.png",
        "prompt": (
            "Create a square illustration using the same cartoon guide character from the reference. "
            "Scene: the character and international student friends share many small dishes at a Kaohsiung night market, with stalls, lanterns, drinks, and casual street energy. "
            "Do not use readable signage. Lively but not cluttered, black ink outlines, warm food colors, pink hoodie character visible."
        ),
    },
    {
        "file": "mountain-kaohsiung.png",
        "prompt": (
            "Create a square illustration in the same cartoon guide style. "
            "Scene: the character explores eastern Kaohsiung near a hillside campus, with Fo Guang Shan-inspired temple silhouettes, Qishan old street, Meinong paper umbrella patterns, and green hills. "
            "Calm weekend-adventure mood, clean ink and watercolor, no readable text."
        ),
    },
]


def request_image(prompt: str) -> bytes:
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY/GOOGLE_API_KEY is not set")

    image_data = base64.b64encode(REFERENCE.read_bytes()).decode("ascii")
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": "image/jpeg", "data": image_data}},
                ],
            }
        ],
        "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]},
    }

    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={key}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=180) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        message = err.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini API returned HTTP {err.code}: {message[:600]}")

    for candidate in data.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            inline = part.get("inline_data") or part.get("inlineData")
            if inline and inline.get("data"):
                return base64.b64decode(inline["data"])

    raise RuntimeError("Gemini response did not include image data")


def main() -> int:
    ASSETS.mkdir(parents=True, exist_ok=True)
    if not REFERENCE.exists():
        print("Missing avatar reference image.", file=sys.stderr)
        return 2

    for scene in SCENES:
        destination = ASSETS / scene["file"]
        if destination.exists() and destination.stat().st_size > 1000:
            print(f"skip {destination.name}")
            continue
        for attempt in range(1, 4):
            try:
                destination.write_bytes(request_image(scene["prompt"]))
                print(f"created {destination.name}")
                break
            except Exception as exc:
                if attempt == 3:
                    print(f"failed {destination.name}: {exc}", file=sys.stderr)
                    return 1
                time.sleep(2 * attempt)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
