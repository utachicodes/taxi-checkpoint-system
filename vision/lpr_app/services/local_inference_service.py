# Author: UtachiCodes
import logging
import os
try:
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    ULTRALYTICS_AVAILABLE = False

from django.conf import settings

logger = logging.getLogger(__name__)

class LocalInferenceService:
    _model = None

    @classmethod
    def get_model(cls):
        if cls._model is None:
            model_path = os.path.join(settings.BASE_DIR, "..", "yolov8n.pt")
            if not os.path.exists(model_path):
                # Fallback to local vision directory if not in root
                model_path = os.path.join(settings.BASE_DIR, "yolov8n.pt")
            
            logger.info(f"Loading local YOLOv8 model from {model_path}...")
            try:
                cls._model = YOLO(model_path)
                logger.info("YOLOv8 model loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load YOLOv8 model: {e}")
                return None
        return cls._model

    @staticmethod
    def detect_vehicle_and_plate(image_input):
        """
        Detect vehicles and potentially license plates using the local model.
        Returns a structured result that can guide or replace the Cloud AI call.
        
        Args:
            image_input: File path (str), PIL.Image, or numpy array
        """
        if not ULTRALYTICS_AVAILABLE:
            logger.warning("Ultralytics not installed. Skipping local inference.")
            return {"success": False, "error": "Ultralytics not installed"}

        model = LocalInferenceService.get_model()
        if not model:
            return {"success": False, "error": "Model not loaded"}

        try:
            # YOLOv8 supports paths, PIL images, and numpy arrays natively
            results = model(image_input, verbose=False)
            
            # YOLOv8n typically detects 'car', 'truck', 'bus', 'motorcycle'
            # Classes in COCO: 2: car, 3: motorcycle, 5: bus, 7: truck
            vehicles = []
            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    # 2=car, 3=motorcycle, 5=bus, 7=truck
                    if cls_id in [2, 3, 5, 7]:
                        vehicles.append({
                            "class": model.names[cls_id],
                            "confidence": float(box.conf[0]),
                            "box": [float(x) for x in box.xyxy[0]]
                        })
            
            return {
                "success": True,
                "is_vehicle": len(vehicles) > 0,
                "vehicles": vehicles
            }
        except Exception as e:
            logger.error(f"Error during local inference: {e}")
            return {"success": False, "error": str(e)}
