"""
Task Classifier — interprets the user query and image configuration
to determine which specialist remote-sensing workflow to invoke.
"""

from enum import Enum


class TaskType(str, Enum):
    SINGLE_VQA = "single_vqa"
    SINGLE_CAPTION = "single_caption"
    SINGLE_GROUNDING = "single_grounding"
    CHANGE_DESCRIPTION = "change_description"
    CHANGE_VQA = "change_vqa"
    CROSS_MODAL = "cross_modal"


# Keywords that strongly indicate each task
_TASK_KEYWORDS: dict[TaskType, list[str]] = {
    TaskType.SINGLE_CAPTION: [
        "describe", "caption", "what is in", "scene", "overview", "summary",
        "explain", "tell me about", "what do you see", "land cover", "land use",
        "objects visible", "major objects", "features",
    ],
    TaskType.SINGLE_GROUNDING: [
        "highlight", "locate", "where is", "show me", "mark", "identify region",
        "find", "point out", "bounding box", "region", "area of",
    ],
    TaskType.CHANGE_DESCRIPTION: [
        "changed", "change between", "difference", "what happened", "before and after",
        "temporal", "over time", "two dates", "modified", "deforestation",
        "urbanization", "flood", "disaster",
    ],
    TaskType.CHANGE_VQA: [
        "has the", "did the", "how much", "increased", "decreased",
        "remained", "built-up area", "water level", "forest cover",
        "change detected",
    ],
    TaskType.CROSS_MODAL: [
        "sar", "optical and sar", "radar", "sentinel-1", "risat", "cartosat",
        "complementary", "fusion", "both images", "together", "cross-modal",
        "multisensor", "water-covered", "built-up and water",
    ],
}

# Default single-image fallback
_DEFAULT_SINGLE = TaskType.SINGLE_VQA


def classify_task(query: str, image_count: int, mode: str) -> TaskType:
    """
    Classify the task given the user query, number of images, and mode.

    Args:
        query: Natural-language query from the user.
        image_count: Number of images uploaded (1 or 2).
        mode: 'single' | 'bitemporal' | 'crossmodal'

    Returns:
        TaskType enum value.
    """
    q_lower = query.lower()

    # Mode-driven hard overrides
    if mode == "crossmodal" and image_count == 2:
        return TaskType.CROSS_MODAL

    if mode == "bitemporal" and image_count == 2:
        # Distinguish change VQA vs change description by query structure
        for kw in _TASK_KEYWORDS[TaskType.CHANGE_VQA]:
            if kw in q_lower:
                return TaskType.CHANGE_VQA
        return TaskType.CHANGE_DESCRIPTION

    # Single image — keyword scoring
    scores: dict[TaskType, int] = {t: 0 for t in TaskType}
    for task, keywords in _TASK_KEYWORDS.items():
        for kw in keywords:
            if kw in q_lower:
                scores[task] += 1

    # Pick the highest-scoring task type relevant to single image
    single_tasks = [
        TaskType.SINGLE_CAPTION,
        TaskType.SINGLE_GROUNDING,
        TaskType.SINGLE_VQA,
    ]
    best = max(single_tasks, key=lambda t: scores[t])
    if scores[best] > 0:
        return best

    return _DEFAULT_SINGLE
