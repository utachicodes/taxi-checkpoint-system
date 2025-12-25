import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class LocalOCRService:
    _reader = None

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
    def read_plate(image_path: str) -> Optional[Dict[str, Any]]:
        reader = LocalOCRService.get_reader()
        if not reader:
            return None
        try:
            results = reader.readtext(image_path, detail=1)
            if not results:
                return None
            best_text = None
            best_conf = 0.0
            for bbox, text, conf in results:
                t = (text or "").upper().replace(" ", "")
                if len(t) >= 5 and conf > best_conf:
                    best_text = t
                    best_conf = float(conf)
            if not best_text:
                return None
            return {"text": best_text, "confidence": best_conf}
        except Exception as e:
            logger.warning(f"Local OCR error: {e}")
            return None
