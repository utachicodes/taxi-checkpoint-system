# Author: UtachiCodes
import logging
import os
import torch
import numpy as np

# Try importing RF-DETR first (User Preference)
try:
    from rfdetr import RFDETRNano
    RF_DETR_AVAILABLE = True
except ImportError:
    RF_DETR_AVAILABLE = False

# Fallback to Ultralytics
try:
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    ULTRALYTICS_AVAILABLE = False

from django.conf import settings

logger = logging.getLogger(__name__)

class LocalInferenceService:
    _model = None
    _backend = None  # 'rfdetr' or 'yolo'

    @classmethod
    def get_model(cls):
        if cls._model is None:
            # Prioritize RF-DETR
            if RF_DETR_AVAILABLE:
                logger.info("Loading RF-DETR Nano model...")
                try:
                    cls._model = RFDETRNano()
                    cls._backend = 'rfdetr'
                    logger.info("RF-DETR Nano model loaded successfully.")
                except Exception as e:
                    logger.error(f"Failed to load RF-DETR model: {e}")
                    cls._model = None
            
            # Fallback to YOLO if RF-DETR failed or not available
            if cls._model is None and ULTRALYTICS_AVAILABLE:
                model_path = os.path.join(settings.BASE_DIR, "..", "yolov8n.pt")
                if not os.path.exists(model_path):
                    model_path = os.path.join(settings.BASE_DIR, "yolov8n.pt")
                
                logger.info(f"Loading local YOLOv8 model from {model_path}...")
                try:
                    cls._model = YOLO(model_path)
                    cls._backend = 'yolo'
                    logger.info("YOLOv8 model loaded successfully.")
                except Exception as e:
                    logger.error(f"Failed to load YOLOv8 model: {e}")
                    
        return cls._model

    @staticmethod
    def detect_vehicle_and_plate(image_input):
        """
        Detect vehicles and potentially license plates using the local model.
        Returns a structured result that can guide or replace the Cloud AI call.
        
        Args:
            image_input: File path (str), PIL.Image, or numpy array
        """
        model = LocalInferenceService.get_model()
        backend = LocalInferenceService._backend
        
        if not model:
            return {"success": False, "error": "No inference model available"}

        try:
            vehicles = []
            
            # --- RF-DETR IMPLEMENTATION ---
            if backend == 'rfdetr':
                # Predict
                # conf=0.25 is standard for detection
                results = model.predict(image_input, conf=0.25)
                
                # RF-DETR returns Supervision Detections object
                # It has .xyxyNew, .class_id, .confidence
                
                # Process detections
                if hasattr(results, 'xyxy') and hasattr(results, 'class_id'):
                    boxes = results.xyxy
                    class_ids = results.class_id
                    confidences = results.confidence
                    
                    # Target Class IDs (COCO 91-class): 3=car, 4=motorcycle, 6=bus, 8=truck
                    target_ids = [3, 4, 6, 8]
                    
                    for i, cls_id in enumerate(class_ids):
                        if cls_id in target_ids:
                            # Map ID to name using model.class_names
                            class_name = model.class_names.get(cls_id, "unknown")
                            
                            vehicles.append({
                                "class": class_name,
                                "confidence": float(confidences[i]),
                                "box": [float(x) for x in boxes[i]]
                            })
                            
            # --- YOLO IMPLEMENTATION (Fallback) ---
            elif backend == 'yolo':
                results = model(image_input, verbose=False)
                
                # YOLOv8n typically detects 'car', 'truck', 'bus', 'motorcycle'
                # Classes in COCO 80-class: 2: car, 3: motorcycle, 5: bus, 7: truck
                target_ids = [2, 3, 5, 7]
                
                for r in results:
                    for box in r.boxes:
                        cls_id = int(box.cls[0])
                        if cls_id in target_ids:
                            vehicles.append({
                                "class": model.names[cls_id],
                                "confidence": float(box.conf[0]),
                                "box": [float(x) for x in box.xyxy[0]]
                            })
            
            return {
                "success": True,
                "is_vehicle": len(vehicles) > 0,
                "vehicles": vehicles,
                "backend": backend
            }
            
        except Exception as e:
            logger.error(f"Error during local inference ({backend}): {e}")
            return {"success": False, "error": str(e)}
