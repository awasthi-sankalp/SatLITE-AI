"""
Agentic Controller — the brain of SatQuery AI.
Receives image uploads + query, validates inputs,
classifies task, invokes Gemini, returns structured response.
"""

import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional

from agent.task_classifier import classify_task, TaskType
from models.local_model import run_local_model
from utils.image_utils import load_image_from_bytes, validate_image_pair

router = APIRouter()

TASK_LABELS = {
    TaskType.SINGLE_VQA: "Single-Image Visual Question Answering",
    TaskType.SINGLE_CAPTION: "Single-Image Scene Description & Captioning",
    TaskType.SINGLE_GROUNDING: "Text-Guided Region Grounding",
    TaskType.CHANGE_DESCRIPTION: "Bi-temporal Change Description",
    TaskType.CHANGE_VQA: "Change-based Visual Question Answering",
    TaskType.CROSS_MODAL: "Optical–SAR Cross-modal Joint Analysis",
}

RS_ADAPTATION_NOTE = (
    "Local RS adaptation: BLIP models (Salesforce/blip-vqa-base, blip-image-captioning-base) "
    "with BigEarthNet.txt-aligned domain vocabulary injected as prompt prefixes. "
    "Models run on CPU — no API key or GPU required. "
    "Fine-tuning on BigEarthNet.txt Sentinel-1/2 data planned for final submission."
)


@router.post("/analyze")
async def analyze(
    query: str = Form(...),
    mode: str = Form("single"),  
    images: list[UploadFile] = File(...),
):
    """
    Main agentic analysis endpoint.
    Accepts 1 or 2 images + natural-language query + mode.
    """
    start_time = time.time()

    if not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    if not images:
        raise HTTPException(status_code=400, detail="At least one image is required.")
    if len(images) > 2:
        raise HTTPException(status_code=400, detail="Maximum 2 images supported.")
    if mode not in ("single", "bitemporal", "crossmodal"):
        raise HTTPException(status_code=400, detail=f"Unknown mode: {mode}")

    pil_images = []
    image_meta = []
    for upload in images:
        raw = await upload.read()
        try:
            pil_img = load_image_from_bytes(raw, upload.filename or "image.png")
        except Exception as e:
            raise HTTPException(
                status_code=422,
                detail=f"Failed to parse image '{upload.filename}': {str(e)}"
            )
        pil_images.append(pil_img)
        w, h = pil_img.size
        image_meta.append({
            "filename": upload.filename,
            "size_bytes": len(raw),
            "dimensions": f"{w}x{h}px",
            "format": (upload.filename or "").rsplit(".", 1)[-1].upper(),
        })

    is_valid, err = validate_image_pair(pil_images, mode)
    if not is_valid:
        raise HTTPException(status_code=422, detail=err)

    task = classify_task(query, len(pil_images), mode)

    try:
        result = run_local_model(task.value, pil_images, query)
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Model inference failed: {str(e)}"
        )

    elapsed = round(time.time() - start_time, 2)

    return JSONResponse({
        "answer": result["answer"],
        "execution_summary": {
            "task": TASK_LABELS[task],
            "task_id": task.value,
            "model": result["model"],
            "rs_adaptation": RS_ADAPTATION_NOTE,
            "mode": mode,
            "image_count": len(pil_images),
            "images": image_meta,
            "query": query,
            "elapsed_seconds": elapsed,
        },
    })



