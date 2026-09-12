"""
Download sample satellite images for testing SatQuery AI.
Pulls real images from NASA Earth Observatory (public domain).
Saves to: public/test-images/
"""

import os
import urllib.request
import sys

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "test-images")
os.makedirs(OUTPUT_DIR, exist_ok=True)

IMAGES = [
    {
        "name": "india_delhi_urban.jpg",
        "url": "https://eoimages.gsfc.nasa.gov/images/imagerecords/89000/89036/india_oli_2014073_lrg.jpg",
        "description": "Delhi urban area - Landsat OLI (optical)",
        "use": "Single image VQA / captioning",
    },
    {
        "name": "india_agriculture_ganges.jpg",
        "url": "https://eoimages.gsfc.nasa.gov/images/imagerecords/4000/4823/India_EO1_2003289_lrg.jpg",
        "description": "Ganges plain agricultural fields - EO-1 (optical)",
        "use": "Single image VQA / land cover",
    },
    {
        "name": "india_flood_assam.jpg",
        "url": "https://eoimages.gsfc.nasa.gov/images/imagerecords/90000/90241/assamflood_oli_2016218_lrg.jpg",
        "description": "Assam floods - Landsat OLI (optical)",
        "use": "Single image VQA / disaster",
    },
    {
        "name": "mumbai_coastal.jpg",
        "url": "https://eoimages.gsfc.nasa.gov/images/imagerecords/78000/78579/mumbai_oli_2013282_lrg.jpg",
        "description": "Mumbai coastal urban area - Landsat OLI",
        "use": "Single image VQA / urban",
    },
    {
        "name": "change_before_forest.jpg",
        "url": "https://eoimages.gsfc.nasa.gov/images/imagerecords/5000/5765/amazon_tm5_1992227_lrg.jpg",
        "description": "Amazon deforestation BEFORE (1992) - Landsat TM",
        "use": "Bi-temporal pair — BEFORE image",
    },
    {
        "name": "change_after_deforestation.jpg",
        "url": "https://eoimages.gsfc.nasa.gov/images/imagerecords/5000/5765/amazon_oli_2006210_lrg.jpg",
        "description": "Amazon deforestation AFTER (2006) - Landsat OLI",
        "use": "Bi-temporal pair — AFTER image",
    },
]


def download(name: str, url: str, description: str, use: str):
    dest = os.path.join(OUTPUT_DIR, name)
    if os.path.exists(dest):
        print(f"  [SKIP] {name} already exists")
        return True
    try:
        print(f"  [↓] Downloading {name}...")
        print(f"      {description}")
        req = urllib.request.Request(url, headers={"User-Agent": "SatQueryAI/1.0"})
        with urllib.request.urlopen(req, timeout=30) as response, open(dest, "wb") as f:
            f.write(response.read())
        size_kb = os.path.getsize(dest) // 1024
        print(f"  [✓] Saved: {name} ({size_kb} KB) — Use for: {use}")
        return True
    except Exception as e:
        print(f"  [✗] Failed {name}: {e}")
        return False


def main():
    print("\n=== SatQuery AI — Downloading Test Images ===")
    print(f"Saving to: {os.path.abspath(OUTPUT_DIR)}\n")

    success = 0
    for img in IMAGES:
        if download(**img):
            success += 1

    print(f"\n{'='*48}")
    print(f"Downloaded {success}/{len(IMAGES)} images")
    print(f"Location: {os.path.abspath(OUTPUT_DIR)}")
    print("\nTest image guide:")
    for img in IMAGES:
        print(f"  {img['name']:40s} → {img['use']}")
    print()


if __name__ == "__main__":
    main()

