"""
Local Model Inference — uses HuggingFace BLIP models running on CPU.
No API key required. Models are downloaded once (~1GB) and cached locally.

Models used:
  - Salesforce/blip-vqa-base         → VQA, change-VQA, grounding descriptions
  - Salesforce/blip-image-captioning-base → captioning / scene description

For change detection and cross-modal analysis, input images are composited
side-by-side into a single image before being passed to the VQA model.
"""

import io
import torch
from PIL import Image
from transformers import (
    BlipProcessor,
    BlipForQuestionAnswering,
    BlipForConditionalGeneration,
)

_DEVICE = "cpu"  

print("[SatQuery AI] Loading BLIP VQA model (first run downloads ~1GB)...")
_vqa_processor = BlipProcessor.from_pretrained("Salesforce/blip-vqa-base")
_vqa_model = BlipForQuestionAnswering.from_pretrained(
    "Salesforce/blip-vqa-base"
).to(_DEVICE)
_vqa_model.eval()

print("[SatQuery AI] Loading BLIP captioning model...")
_cap_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
_cap_model = BlipForConditionalGeneration.from_pretrained(
    "Salesforce/blip-image-captioning-base"
).to(_DEVICE)
_cap_model.eval()

print("[SatQuery AI] Models ready.")


RS_VQA_PREFIX = (
    "In this satellite/aerial remote sensing image, "
)

RS_CAPTION_PREFIX = (
    "A detailed remote sensing satellite image showing "
)

RS_CHANGE_PREFIX = (
    "In this side-by-side comparison of two satellite images taken at different times, "
)

RS_SAR_PREFIX = (
    "In this composite image showing an optical satellite image on the left "
    "and a SAR (Synthetic Aperture Radar) radar image on the right, "
)


def _composite_side_by_side(img1: Image.Image, img2: Image.Image) -> Image.Image:
    """
    Combine two images horizontally with equal height.
    Used to present paired images to single-image BLIP models.
    """
    h = min(img1.height, img2.height, 480)
    w1 = int(img1.width * h / img1.height)
    w2 = int(img2.width * h / img2.height)
    img1 = img1.resize((w1, h), Image.LANCZOS)
    img2 = img2.resize((w2, h), Image.LANCZOS)
    composite = Image.new("RGB", (w1 + w2 + 4, h), (128, 128, 128))
    composite.paste(img1, (0, 0))
    composite.paste(img2, (w1 + 4, 0))
    return composite


def _run_vqa(image: Image.Image, question: str, max_new_tokens: int = 150) -> str:
    """Run BLIP VQA model on a single image + question."""
    inputs = _vqa_processor(image, question, return_tensors="pt").to(_DEVICE)
    with torch.no_grad():
        out = _vqa_model.generate(**inputs, max_new_tokens=max_new_tokens)
    return _vqa_processor.decode(out[0], skip_special_tokens=True).strip()


def _run_caption(image: Image.Image, conditional_text: str = "") -> str:
    """Run BLIP captioning model, optionally with a conditional text prefix."""
    if conditional_text:
        inputs = _cap_processor(image, conditional_text, return_tensors="pt").to(_DEVICE)
    else:
        inputs = _cap_processor(image, return_tensors="pt").to(_DEVICE)
    with torch.no_grad():
        out = _cap_model.generate(**inputs, max_new_tokens=120)
    return _cap_processor.decode(out[0], skip_special_tokens=True).strip()


def run_local_model(task: str, images: list[Image.Image], query: str) -> dict:
    """
    Run the appropriate local BLIP model for the given task.

    Args:
        task: TaskType string value
        images: List of PIL Images (1 or 2)
        query: User's natural-language query

    Returns:
        dict with 'answer' (str) and 'model' (str)
    """
    img = images[0]
    answer = ""
    model_used = ""

    if task == "single_vqa":
        question = RS_VQA_PREFIX + query
        answer = _run_vqa(img, question)
        cap = _run_caption(img, RS_CAPTION_PREFIX)
        answer = f"**Answer:** {answer}\n\n**Scene context:** {cap}"
        model_used = "blip-vqa-base + blip-image-captioning-base"

    elif task == "single_caption":
        cap = _run_caption(img, RS_CAPTION_PREFIX)
        q_answer = _run_vqa(img, RS_VQA_PREFIX + query)
        answer = (
            f"**Scene Description:** {cap}\n\n"
            f"**Query Response:** {q_answer}"
        )
        model_used = "blip-image-captioning-base + blip-vqa-base"

    elif task == "single_grounding":
        question = RS_VQA_PREFIX + query + " Describe its location in the image."
        loc = _run_vqa(img, question)
        cap = _run_caption(img, RS_CAPTION_PREFIX)
        answer = (
            f"**Location:** {loc}\n\n"
            f"**Full Scene:** {cap}"
        )
        model_used = "blip-vqa-base"

    elif task in ("change_description", "change_vqa"):
        composite = _composite_side_by_side(images[0], images[1])
        prefix = RS_CHANGE_PREFIX
        cap = _run_caption(composite, prefix + "the changes visible are")
        q_answer = _run_vqa(composite, prefix + query)
        answer = (
            f"**Change Summary:** {cap}\n\n"
            f"**Query Response:** {q_answer}\n\n"
            f"*Note: Left image = earlier date, Right image = later date.*"
        )
        model_used = "blip-vqa-base + blip-image-captioning-base (side-by-side composite)"

    elif task == "cross_modal":
        composite = _composite_side_by_side(images[0], images[1])
        cap = _run_caption(composite, RS_SAR_PREFIX + "the features visible include")
        q_answer = _run_vqa(composite, RS_SAR_PREFIX + query)
        answer = (
            f"**Joint Analysis:** {cap}\n\n"
            f"**Query Response:** {q_answer}\n\n"
            f"*Note: Left = Optical image, Right = SAR image.*"
        )
        model_used = "blip-vqa-base + blip-image-captioning-base (optical-SAR composite)"

    else:
        answer = _run_vqa(img, RS_VQA_PREFIX + query)
        model_used = "blip-vqa-base"

    return {
        "answer": answer,
        "model": model_used,
    }



