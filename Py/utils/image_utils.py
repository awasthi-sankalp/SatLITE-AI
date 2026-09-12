"""
Image Utilities — handles GeoTIFF/TIFF/PNG/JPEG input,
normalizes satellite bands to PIL Images for Gemini.
"""

import io
import numpy as np
from PIL import Image


def _normalize_band(band: np.ndarray) -> np.ndarray:
    """Stretch a single band to 0-255 uint8."""
    b_min, b_max = band.min(), band.max()
    if b_max == b_min:
        return np.zeros_like(band, dtype=np.uint8)
    return ((band - b_min) / (b_max - b_min) * 255).astype(np.uint8)


def load_image_from_bytes(data: bytes, filename: str) -> Image.Image:
    """
    Load an image from raw bytes. Supports:
    - GeoTIFF / TIFF (via rasterio if available, else PIL)
    - PNG, JPEG (via PIL)

    Returns a PIL Image in RGB mode suitable for Gemini.
    """
    ext = filename.lower().rsplit(".", 1)[-1]

    if ext in ("tif", "tiff", "geotiff"):
        return _load_geotiff(data)
    else:
        img = Image.open(io.BytesIO(data))
        return img.convert("RGB")


def _load_geotiff(data: bytes) -> Image.Image:
    """
    Load GeoTIFF and convert to RGB PIL Image.
    Uses rasterio for full GeoTIFF support with graceful PIL fallback.
    """
    try:
        import rasterio
        from rasterio.io import MemoryFile

        with MemoryFile(data) as memfile:
            with memfile.open() as dataset:
                count = dataset.count

                if count >= 3:
                    r = _normalize_band(dataset.read(1).astype(np.float32))
                    g = _normalize_band(dataset.read(2).astype(np.float32))
                    b = _normalize_band(dataset.read(3).astype(np.float32))
                    rgb = np.stack([r, g, b], axis=-1)
                elif count == 1:
                    band = _normalize_band(dataset.read(1).astype(np.float32))
                    rgb = np.stack([band, band, band], axis=-1)
                else:
                    b1 = _normalize_band(dataset.read(1).astype(np.float32))
                    b2 = _normalize_band(dataset.read(2).astype(np.float32))
                    rgb = np.stack([b1, b2, b1], axis=-1)

                return Image.fromarray(rgb, mode="RGB")

    except ImportError:
        img = Image.open(io.BytesIO(data))
        if img.mode != "RGB":
            img = img.convert("RGB")
        return img


def validate_image_pair(images: list[Image.Image], mode: str) -> tuple[bool, str]:
    """
    Validate that the image count matches the selected mode.
    Returns (is_valid, error_message).
    """
    count = len(images)
    if mode == "single" and count != 1:
        return False, f"Single image mode requires exactly 1 image, got {count}."
    if mode in ("bitemporal", "crossmodal") and count != 2:
        return False, f"{mode.capitalize()} mode requires exactly 2 images, got {count}."
    return True, ""

