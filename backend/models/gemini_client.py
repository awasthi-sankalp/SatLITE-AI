"""
Gemini Client — wraps Google Gemini Vision API with
remote-sensing-specific prompt templates for each task type.
"""

import os
import base64
import google.generativeai as genai
from PIL import Image
import io

genai.configure(api_key=os.getenv("GOOGLE_API_KEY", ""))

MODEL_NAME = "gemini-1.5-flash"

RS_SYSTEM_PROMPT = """You are SatLITE AI, an expert remote sensing analyst specialized in:
- Satellite imagery interpretation (optical, multispectral, SAR)
- Land-use and land-cover (LULC) classification
- Change detection between multi-temporal images
- SAR (Synthetic Aperture Radar) and optical image fusion
- Visual question answering over geospatial imagery

Always provide precise, evidence-grounded answers. Use domain-specific terminology 
(e.g., backscatter, spectral bands, NDVI, built-up area, impervious surface).
When confidence is not certain, state it explicitly."""

PROMPTS = {
    "single_vqa": """{query}

[Remote Sensing VQA Context]
Analyze this satellite/aerial image carefully. Base your answer strictly on 
what is visible in the image. Include:
- Direct answer to the question
- Supporting visual evidence
- Confidence level (High/Medium/Low)""",

    "single_caption": """Provide a detailed remote sensing image description.

Include:
1. Overall scene type (urban, agricultural, forested, coastal, etc.)
2. Major land-cover classes visible and their approximate spatial distribution
3. Notable objects or structures (roads, buildings, water bodies, vegetation)
4. Image quality and sensor characteristics if determinable
5. Any anomalies or points of interest

Query context: {query}""",

    "single_grounding": """{query}

Identify and describe the spatial location of the requested feature(s) in the image.
Describe their position using directional terms (top-left, center, bottom-right, etc.)
and approximate proportion of the image they occupy.
List each distinct instance if multiple are present.""",

    "change_description": """You are given two satellite images of the SAME geographic area 
acquired at DIFFERENT times (Image 1 = earlier, Image 2 = later).

{query}

Perform a detailed change analysis:
1. **Summary**: What are the most significant changes observed?
2. **Change Type**: Categorize changes (urban expansion, deforestation, flooding, 
   agricultural change, infrastructure development, etc.)
3. **Spatial Extent**: Where in the image did the changes occur? (use directions)
4. **Magnitude**: How significant are the changes? (minor/moderate/major)
5. **Confidence**: How confident are you in this assessment? (High/Medium/Low)""",

    "change_vqa": """You are given two satellite images of the SAME geographic area 
acquired at DIFFERENT times (Image 1 = earlier, Image 2 = later).

{query}

Answer the question directly based on comparing both images. 
Support your answer with specific visual evidence from both images.
State your confidence level.""",

    "cross_modal": """You are given two co-registered images of the SAME geographic area:
- Image 1: Optical/Multispectral image
- Image 2: SAR (Synthetic Aperture Radar) image

{query}

Perform joint cross-modal analysis:
1. **Optical Analysis**: What does the optical image reveal? (land cover, color, texture)
2. **SAR Analysis**: What does the SAR image reveal? (backscatter patterns, surface roughness, 
   double-bounce from buildings, specular reflection from water)
3. **Fusion Insights**: What additional information emerges from combining both modalities?
4. **Feature Identification**: Identify requested features using both data sources
5. **Confidence**: State confidence level for each identified feature""",
}


def _pil_to_part(image: Image.Image) -> dict:
    """Convert a PIL Image to a Gemini inline_data part."""
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return {
        "inline_data": {
            "mime_type": "image/png",
            "data": base64.b64encode(buf.getvalue()).decode("utf-8"),
        }
    }


def run_gemini(task: str, images: list[Image.Image], query: str) -> dict:
    """
    Call Gemini with task-specific prompt and images.

    Returns:
        dict with 'answer' (str) and 'raw_response' (str)
    """
    model = genai.GenerativeModel(
        model_name=MODEL_NAME,
        system_instruction=RS_SYSTEM_PROMPT,
    )

    prompt_template = PROMPTS.get(task, PROMPTS["single_vqa"])
    prompt_text = prompt_template.format(query=query)

    parts = [_pil_to_part(img) for img in images]
    parts.append({"text": prompt_text})

    response = model.generate_content(parts)
    answer = response.text.strip()

    return {
        "answer": answer,
        "model": MODEL_NAME,
    }



