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
            logger.warning("No inference model available")
            return {"success": False, "error": "No inference model available"}

        try:
            vehicles = []
            
            # --- RF-DETR IMPLEMENTATION ---
            if backend == 'rfdetr':
                # Lower confidence threshold for better detection (0.15 instead of 0.25)
                logger.debug(f"RF-DETR: Running detection with conf=0.15")
                results = model.predict(image_input, conf=0.15)
                
                # RF-DETR returns Supervision Detections object
                # Check multiple possible attribute names
                boxes = None
                class_ids = None
                confidences = None
                
                if hasattr(results, 'xyxy') and hasattr(results, 'class_id') and hasattr(results, 'confidence'):
                    boxes = results.xyxy
                    class_ids = results.class_id
                    confidences = results.confidence
                elif hasattr(results, 'xyxy') and len(results.xyxy) > 0:
                    # Try alternative format
                    boxes = results.xyxy
                    if hasattr(results, 'data') and 'class_id' in results.data:
                        class_ids = results.data['class_id']
                        confidences = results.data.get('confidence', [1.0] * len(boxes))
                    else:
                        logger.warning("RF-DETR: Could not extract class_ids and confidences from results")
                
                if boxes is not None and len(boxes) > 0:
                    # Target Class IDs (COCO 91-class): 3=car, 4=motorcycle, 6=bus, 8=truck
                    # Also try COCO 80-class format: 2=car, 3=motorcycle, 5=bus, 7=truck
                    target_ids = [2, 3, 4, 5, 6, 7, 8]  # Include both formats
                    
                    logger.debug(f"RF-DETR: Found {len(boxes)} total detections")
                    
                    for i in range(len(boxes)):
                        cls_id = class_ids[i] if class_ids is not None and i < len(class_ids) else None
                        conf = confidences[i] if confidences is not None and i < len(confidences) else 0.5
                        
                        if cls_id is None or cls_id in target_ids:
                            # Map ID to name
                            if cls_id is not None and hasattr(model, 'class_names') and cls_id in model.class_names:
                                class_name = model.class_names[cls_id]
                            elif cls_id is not None:
                                # Fallback class names
                                class_map = {2: 'car', 3: 'motorcycle', 4: 'motorcycle', 5: 'bus', 6: 'bus', 7: 'truck', 8: 'truck'}
                                class_name = class_map.get(cls_id, 'vehicle')
                            else:
                                class_name = 'vehicle'
                            
                            # Capitalize vehicle type for better display
                            display_name = class_name.capitalize() if class_name else 'Vehicle'
                            
                            vehicles.append({
                                "class": display_name,
                                "confidence": float(conf),
                                "box": [float(x) for x in boxes[i]]
                            })
                            logger.debug(f"RF-DETR: Detected {display_name} with confidence {conf:.2f}")
                else:
                    logger.debug("RF-DETR: No detections found")
                            
            # --- YOLO IMPLEMENTATION (Fallback) ---
            elif backend == 'yolo':
                logger.debug("YOLO: Running detection")
                results = model(image_input, verbose=False, conf=0.15)  # Lower confidence threshold
                
                # YOLOv8n typically detects 'car', 'truck', 'bus', 'motorcycle'
                # Classes in COCO 80-class: 2: car, 3: motorcycle, 5: bus, 7: truck
                target_ids = [2, 3, 5, 7]
                
                total_detections = 0
                for r in results:
                    for box in r.boxes:
                        total_detections += 1
                        cls_id = int(box.cls[0])
                        conf = float(box.conf[0])
                        logger.debug(f"YOLO: Detection class_id={cls_id}, conf={conf:.2f}, name={model.names.get(cls_id, 'unknown')}")
                        if cls_id in target_ids:
                            class_name = model.names[cls_id]
                            # Capitalize vehicle type for better display
                            display_name = class_name.capitalize() if class_name else 'Vehicle'
                            
                            vehicles.append({
                                "class": display_name,
                                "confidence": conf,
                                "box": [float(x) for x in box.xyxy[0]]
                            })
                            logger.debug(f"YOLO: Added vehicle detection: {display_name} (conf={conf:.2f})")
                
                logger.debug(f"YOLO: Total detections={total_detections}, Vehicle detections={len(vehicles)}")
            
            logger.info(f"Local inference ({backend}): Found {len(vehicles)} vehicle(s)")
            
            return {
                "success": True,
                "is_vehicle": len(vehicles) > 0,
                "vehicles": vehicles,
                "backend": backend
            }
            
        except Exception as e:
            logger.error(f"Error during local inference ({backend}): {e}", exc_info=True)
            return {"success": False, "error": str(e)}
