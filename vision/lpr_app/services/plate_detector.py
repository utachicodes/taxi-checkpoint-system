import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)


def detect_plate_in_image(image_path: str, min_area_ratio: float = 0.0005):
    """
    Simple heuristic plate detector using contour aspect-ratio and area filtering.

    Args:
        image_path: Path to image file
        min_area_ratio: Minimum area ratio of contour relative to image to consider

    Returns:
        Dict with keys `bbox` = [x1,y1,x2,y2] and `score` (heuristic), or None if not found
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            return None

        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # Enhance contrast
        gray = cv2.bilateralFilter(gray, 9, 75, 75)
        # Edge detection
        edged = cv2.Canny(gray, 50, 200)
        # Morphological close to join gaps
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        closed = cv2.morphologyEx(edged, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        candidates = []
        for cnt in contours:
            x, y, cw, ch = cv2.boundingRect(cnt)
            area = cw * ch
            if area < (w * h * min_area_ratio):
                continue
            aspect = cw / float(ch) if ch > 0 else 0
            # Plates are typically wide rectangles; allow a broad aspect range
            if 2.0 <= aspect <= 8.0:
                # Heuristic score: area normalized * aspect closeness to 4
                score = (area / (w * h)) * (1.0 / (1.0 + abs(aspect - 4.0)))
                candidates.append(((x, y, x + cw, y + ch), score))

        if not candidates:
            return None

        # Pick best candidate
        candidates.sort(key=lambda x: x[1], reverse=True)
        bbox, score = candidates[0]
        return {"bbox": [int(v) for v in bbox], "score": float(score)}

    except Exception as e:
        logger.exception(f"Plate detection error: {e}")
        return None
