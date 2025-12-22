# Author: UtachiCodes
import cv2
import requests
import time
import os
import argparse
import logging
from datetime import datetime
import base64
import io
import tempfile
import sys
from pathlib import Path

# Ensure project root is on sys.path so imports like `vision.*` resolve when running this script
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CameraBridge:
    def __init__(self, api_url, camera_id=0, location="NVIDIA Checkpoint", interval=5):
        self.api_url = api_url
        self.camera_id = camera_id
        self.location = location
        self.interval = interval
        self.cap = None
        self.save_frames = False
        self.show_window = False
        self.frame_width = 0
        self.frame_height = 0
        self.max_count = 0
        self.send_every = 1
        self._send_counter = 0
        self.local_yolo = False
        self.local_llm = False
        self.min_confidence = 0.3

    def open_camera(self):
        """Open the camera (supports USB or CSI via GStreamer if needed)"""
        # For NVIDIA Jetson CSI cameras, you'd typically use a GStreamer pipeline string
        # e.g., "nvarguscamerasrc ! video/x-raw(memory:NVMM), width=1280, height=720, format=NV12, framerate=30/1 ! nvvidconv ! video/x-raw, format=BGRx ! videoconvert ! video/x-raw, format=BGR ! appsink"
        
        logger.info(f"Opening camera {self.camera_id}...")
        # Try a sequence of backends on Windows for greater stability
        backends = []
        if os.name == 'nt':
            # Try DirectShow first, then Media Foundation, then default
            backends = [getattr(cv2, 'CAP_DSHOW', None), getattr(cv2, 'CAP_MSMF', None), None]
        else:
            backends = [None]

        opened = False
        for backend in backends:
            try:
                if backend:
                    logger.info(f"Attempting to open camera {self.camera_id} with backend {backend}...")
                    self.cap = cv2.VideoCapture(self.camera_id, backend)
                else:
                    logger.info(f"Attempting to open camera {self.camera_id} with default backend...")
                    self.cap = cv2.VideoCapture(self.camera_id)

                if self.cap and self.cap.isOpened():
                    # Try setting desired resolution if provided
                    try:
                        if self.frame_width and self.frame_height:
                            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, int(self.frame_width))
                            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, int(self.frame_height))
                            logger.info(f"Requested resolution set to {self.frame_width}x{self.frame_height}")
                    except Exception:
                        pass
                    opened = True
                    break
                else:
                    try:
                        if self.cap:
                            self.cap.release()
                    except Exception:
                        pass
            except Exception:
                try:
                    if self.cap:
                        self.cap.release()
                except Exception:
                    pass
                continue

        if not opened:
            logger.error("Could not open camera.")
            return False
        return True

    def capture_and_send(self):
        """Capture a frame and send it to the Open-LPR API"""
        if not self.cap or not self.cap.isOpened():
            logger.warning("Capture not opened, attempting to reopen...")
            if not self.open_camera():
                logger.error("Reopen failed.")
                return

        # Attempt to read a frame, with a small recovery loop if grab fails
        ret, frame = self.cap.read()
        if not ret or frame is None:
            logger.warning("Initial read failed, attempting recovery...")
            recovered = False
            for attempt in range(1, 4):
                try:
                    logger.info(f"Recovery attempt {attempt}: reopening capture...")
                    if self.cap:
                        try:
                            self.cap.release()
                        except Exception:
                            pass
                    time.sleep(0.5)
                    if not self.open_camera():
                        time.sleep(0.5)
                        continue
                    ret, frame = self.cap.read()
                    if ret and frame is not None:
                        recovered = True
                        logger.info("Recovery successful.")
                        break
                except Exception as e:
                    logger.error(f"Recovery exception: {e}")
                    time.sleep(0.5)

            if not recovered:
                logger.error("Failed to capture frame after recovery attempts.")
                return

        # Optionally save the frame locally for inspection
        if self.save_frames:
            try:
                out_dir = os.path.join(os.getcwd(), 'edge_captures')
                os.makedirs(out_dir, exist_ok=True)
                fname = datetime.now().strftime('capture_%Y%m%d_%H%M%S.jpg')
                path = os.path.join(out_dir, fname)
                cv2.imwrite(path, frame)
                logger.info(f"Saved captured frame to {path}")
            except Exception as e:
                logger.warning(f"Failed saving frame: {e}")

        # Show preview window if requested
        if self.show_window:
            try:
                cv2.imshow('CameraBridge Preview', frame)
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    raise KeyboardInterrupt()
            except Exception:
                pass

        # If local YOLO mode is enabled, try to detect vehicles and send crops
        if self.local_yolo:
            try:
                # Write frame to a temporary file for the LocalInferenceService
                tmpdir = tempfile.gettempdir()
                tmp_path = os.path.join(tmpdir, datetime.now().strftime('edge_tmp_%Y%m%d_%H%M%S.jpg'))
                cv2.imwrite(tmp_path, frame)
                from vision.lpr_app.services.local_inference_service import LocalInferenceService

                det_result = LocalInferenceService.detect_vehicle_and_plate(tmp_path)
                if det_result.get('success') and det_result.get('is_vehicle') and det_result.get('vehicles'):
                    crops_dir = os.path.join(os.getcwd(), 'edge_captures', 'crops')
                    os.makedirs(crops_dir, exist_ok=True)
                    for i, v in enumerate(det_result.get('vehicles')):
                        conf = float(v.get('confidence', 0.0))
                        if conf < float(self.min_confidence):
                            logger.info(f"Skipping low-confidence vehicle (conf={conf:.2f})")
                            continue
                        x1, y1, x2, y2 = [int(x) for x in v.get('box', [0,0,0,0])]
                        # Clamp coords
                        h, w = frame.shape[:2]
                        x1, y1 = max(0, x1), max(0, y1)
                        x2, y2 = min(w, x2), min(h, y2)
                        crop = frame[y1:y2, x1:x2]
                        if crop.size == 0:
                            continue
                        crop_name = datetime.now().strftime(f'crop_%Y%m%d_%H%M%S_{i}.jpg')
                        crop_path = os.path.join(crops_dir, crop_name)
                        cv2.imwrite(crop_path, crop)
                        logger.info(f"Saved vehicle crop {crop_path}")

                        # Try to detect plate within the vehicle crop and prefer sending plate crop
                        try:
                            from vision.lpr_app.services.plate_detector import detect_plate_in_image
                            plate_det = detect_plate_in_image(crop_path)
                        except Exception:
                            plate_det = None

                        if plate_det and plate_det.get('bbox'):
                            px1, py1, px2, py2 = plate_det['bbox']
                            # Adjust coordinates relative to vehicle crop
                            plate_crop = crop[py1:py2, px1:px2]
                            if plate_crop is not None and plate_crop.size > 0:
                                plate_name = datetime.now().strftime(f'plate_%Y%m%d_%H%M%S_{i}.jpg')
                                plate_path = os.path.join(crops_dir, plate_name)
                                cv2.imwrite(plate_path, plate_crop)
                                logger.info(f"Saved plate crop {plate_path} (score={plate_det.get('score'):.4f})")
                                # send plate crop instead of vehicle crop
                                _, plate_encoded = cv2.imencode('.jpg', plate_crop)
                                files = {'image': ('plate.jpg', plate_encoded.tobytes(), 'image/jpeg')}
                                data = {'location': self.location, 'source': 'edge_plate_crop'}
                                send_target_path = plate_path
                        else:
                            # No plate detected; fall back to vehicle crop
                            send_target_path = crop_path

                        # Encode crop and send to API (vehicle-focused)
                        _, crop_encoded = cv2.imencode('.jpg', crop)
                        files = {'image': ('crop.jpg', crop_encoded.tobytes(), 'image/jpeg')}
                        data = {'location': self.location, 'source': 'edge_vehicle_crop'}

                        # If local LLM is requested, call the Qwen client directly with the crop
                        if self.local_llm:
                            try:
                                from vision.lpr_app.services.qwen_client import get_qwen_client, LPR_PROMPT
                                from vision.lpr_app.services.image_processor import ImageProcessor

                                # Choose target file to send (plate or vehicle)
                                tmp_crop_path = send_target_path if 'send_target_path' in locals() else crop_path
                                base64_image = ImageProcessor.encode_image_to_base64(tmp_crop_path)
                                if base64_image:
                                    client = get_qwen_client()
                                    prompt = LPR_PROMPT.replace('[actual filename of the image]', os.path.basename(tmp_crop_path))
                                    logger.info("Calling local LLM for crop analysis...")
                                    llm_resp = client.analyze_image(base64_image, prompt)
                                    logger.info(f"Local LLM response: {llm_resp}")
                                else:
                                    logger.warning("Failed to encode crop for local LLM")
                            except Exception as e:
                                logger.error(f"Local LLM call failed: {e}")
                        else:
                            try:
                                logger.info(f"Sending vehicle crop to {self.api_url} ({i+1}/{len(det_result.get('vehicles'))})...")
                                start_time = time.time()
                                response = requests.post(self.api_url, files=files, data=data, timeout=15)
                                duration = time.time() - start_time
                                if response.status_code == 200:
                                    logger.info(f"CROP SUCCESS ({duration:.2f}s): {response.json()}")
                                else:
                                    logger.error(f"CROP API Error: {response.status_code} - {response.text}")
                            except Exception as e:
                                logger.error(f"CROP request failed: {e}")

                    # don't send the full frame if we already sent crops
                    return
                else:
                    logger.info("Local YOLO: no vehicles detected, sending full frame")
            except Exception as e:
                logger.warning(f"Local YOLO detection failed: {e}. Falling back to full-frame send.")

        # Throttle sending to API (send every N frames)
        self._send_counter += 1
        if self.send_every and (self._send_counter % self.send_every) != 0:
            return

        # Encode frame as JPEG
        _, img_encoded = cv2.imencode('.jpg', frame)

        # Prepare file for upload
        files = {'image': ('capture.jpg', img_encoded.tobytes(), 'image/jpeg')}
        data = {'location': self.location}

        try:
            logger.info(f"Sending frame to {self.api_url}...")
            start_time = time.time()
            response = requests.post(self.api_url, files=files, data=data, timeout=15)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                result = response.json()
                taxi_info = result.get('taxi_info', {})
                status = taxi_info.get('checkpoint_status', 'UNKNOWN')
                plate = result.get('detections', [{}])[0].get('ocr', [{}])[0].get('text', 'NO PLATE') if result.get('detections') else 'NO PLATE'
                
                logger.info(f"SUCCESS: Plate={plate}, Status={status} ({duration:.2f}s)")
                
                if status == 'ALLOW':
                    logger.info(">>> [GREEN] ACCESS GRANTED")
                elif status == 'STOP':
                    logger.info(">>> [RED] ACCESS DENIED - Check payment/registration")
                else:
                    logger.info(">>> [YELLOW] PLATE NOT RECOGNIZED")
            else:
                # Log full response body for debugging
                try:
                    body = response.text
                except Exception:
                    body = '<unreadable body>'
                logger.error(f"API Error: {response.status_code} - {body}")
        except Exception as e:
            logger.error(f"Request failed: {e}")

    def run(self):
        if not self.open_camera():
            return

        logger.info(f"Starting bridge. Interval: {self.interval}s. Press Ctrl+C to stop.")
        try:
            count = 0
            while True:
                self.capture_and_send()
                count += 1
                if self.max_count and count >= self.max_count:
                    logger.info(f"Reached max count {self.max_count}, exiting.")
                    break
                # If interval==0 we process frames as fast as possible (real-time), otherwise sleep
                if self.interval and self.interval > 0:
                    time.sleep(self.interval)
        except KeyboardInterrupt:
            logger.info("Stopped by user.")
        finally:
            if self.cap:
                self.cap.release()
            if self.show_window:
                try:
                    cv2.destroyAllWindows()
                except Exception:
                    pass

def list_cameras():
    """List available camera indices"""
    index = 0
    arr = []
    logger.info("Scanning for available cameras...")
    while index < 5:  # Check first 5 indices
        cap = cv2.VideoCapture(index)
        if cap.isOpened():
            arr.append(index)
            cap.release()
        index += 1
    if arr:
        logger.info(f"Found cameras at indices: {arr}")
    else:
        logger.warning("No cameras found.")
    return arr

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="TaxiGuard Edge Camera Bridge")
    parser.add_argument("--api", type=str, default="http://localhost:8000/api/v1/ocr/", help="TaxiGuard Vision API URL")
    parser.add_argument("--cam", type=int, default=0, help="Camera ID index")
    parser.add_argument("--loc", type=str, default="Laptop Test", help="Checkpoint location name")
    parser.add_argument("--int", type=int, default=5, help="Capture interval in seconds")
    parser.add_argument("--save-frames", action="store_true", help="Save captured frames to edge_captures/")
    parser.add_argument("--show-window", action="store_true", help="Show preview window (press 'q' to quit)")
    parser.add_argument("--width", type=int, default=0, help="Requested frame width")
    parser.add_argument("--height", type=int, default=0, help="Requested frame height")
    parser.add_argument("--count", type=int, default=0, help="Number of frames to capture (0 = unlimited)")
    parser.add_argument("--send-every", type=int, default=1, help="Send to API every N frames (1 = every frame)")
    parser.add_argument("--min-confidence", type=float, default=0.3, help="Minimum confidence for vehicle detections (0-1)")
    parser.add_argument("--local-llm", action="store_true", help="Call local Qwen client for crops instead of remote API")
    parser.add_argument("--local-yolo", action="store_true", help="Run local YOLOv8 to detect vehicles and send crops to API")
    parser.add_argument("--list", action="store_true", help="List available camera indices and exit")
    
    args = parser.parse_args()
    
    if args.list:
        list_cameras()
    else:
        bridge = CameraBridge(api_url=args.api, camera_id=args.cam, location=args.loc, interval=args.int)
        bridge.save_frames = args.save_frames
        bridge.show_window = args.show_window
        bridge.frame_width = args.width
        bridge.frame_height = args.height
        bridge.max_count = args.count
        bridge.send_every = max(1, int(args.send_every))
        bridge.local_yolo = args.local_yolo
        bridge.local_llm = args.local_llm
        bridge.min_confidence = float(args.min_confidence)
        bridge.run()
