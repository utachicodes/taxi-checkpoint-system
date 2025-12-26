import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class LocalOCRService:
    _reader = None
    _min_len = 5

    @classmethod
    def get_reader(cls):
        if cls._reader is not None:
            return cls._reader
        try:
            import easyocr  # type: ignore
            cls._reader = easyocr.Reader(['en', 'fr'], gpu=False)
            return cls._reader
        except Exception as e:
            logger.warning(f"Local OCR unavailable: {e}")
            return None

    @staticmethod
    def _normalize(text: str) -> str:
        t = (text or "").upper()
        t = t.replace(" ", "").replace("\n", "").replace("\t", "")
        return t

    @staticmethod
    def read_plate_on_best_crop(image_path: str) -> Optional[Dict[str, Any]]:
        reader = LocalOCRService.get_reader()
        if not reader:
            return None
        try:
            try:
                from .plate_detector import detect_plate_in_image
            except Exception:
                detect_plate_in_image = None

            bbox = None
            if detect_plate_in_image:
                det = detect_plate_in_image(image_path)
                if det and isinstance(det.get("bbox"), list):
                    bbox = det["bbox"]

            import cv2  # type: ignore
            img = cv2.imread(image_path)
            if img is None:
                return None

            crop_img = img
            if bbox and len(bbox) == 4:
                x1, y1, x2, y2 = bbox
                x1 = max(0, int(x1)); y1 = max(0, int(y1))
                x2 = min(img.shape[1], int(x2)); y2 = min(img.shape[0], int(y2))
                if x2 > x1 and y2 > y1:
                    crop_img = img[y1:y2, x1:x2]

            results = reader.readtext(crop_img, detail=1)
            if not results:
                return None
            best_text = None
            best_conf = 0.0
            for rbbox, text, conf in results:
                t = LocalOCRService._normalize(text)
                if len(t) >= LocalOCRService._min_len and float(conf) > best_conf:
                    best_text = t
                    best_conf = float(conf)
            if not best_text:
                return None
            return {"text": best_text, "confidence": best_conf, "bbox": bbox}
        except Exception as e:
            logger.warning(f"Local OCR crop-read error: {e}")
            return None

    @staticmethod
    def read_plate(image_path: str) -> Optional[Dict[str, Any]]:
        # Prefer cropped plate region if available
        crop_result = LocalOCRService.read_plate_on_best_crop(image_path)
        if crop_result:
            return crop_result
        reader = LocalOCRService.get_reader()
        if not reader:
            return None
        try:
            results = reader.readtext(image_path, detail=1)
            if not results:
                return None
            best_text = None
            best_conf = 0.0
            for rbbox, text, conf in results:
                t = LocalOCRService._normalize(text)
                if len(t) >= LocalOCRService._min_len and float(conf) > best_conf:
                    best_text = t
                    best_conf = float(conf)
            if not best_text:
                return None
            return {"text": best_text, "confidence": best_conf}
        except Exception as e:
            logger.warning(f"Local OCR error: {e}")
            return None
