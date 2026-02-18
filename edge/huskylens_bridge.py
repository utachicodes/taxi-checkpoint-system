# Author: UtachiCodes
import serial
import time
import os
import argparse
import logging
import cv2
import requests
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
env_path = Path(__file__).resolve().parent.parent / '.env.local'
load_dotenv(dotenv_path=env_path)
if not os.environ.get("NEXT_PUBLIC_SUPABASE_URL"):
    load_dotenv()

class HuskyLensBridge:
    def __init__(self, port, baudrate=9600, camera_id=0, api_url=None, location="Hybrid Checkpoint"):
        self.port = port
        self.baudrate = baudrate
        self.camera_id = camera_id
        self.api_url = api_url or os.environ.get("NEXT_PUBLIC_VISION_API_URL", "http://localhost:8000") + "/api/v1/ocr/"
        self.location = location
        self.ser = None
        self.cap = None
        self.supabase: Client = None
        
        # Initialize Supabase
        supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        
        if not supabase_url or not supabase_key:
            logger.error("Supabase credentials missing.")
            raise ValueError("Missing Supabase configuration")
            
        self.supabase = create_client(supabase_url, supabase_key)

    def connect_serial(self):
        try:
            logger.info(f"Connecting to HuskyLens on {self.port}...")
            self.ser = serial.Serial(self.port, self.baudrate, timeout=1)
            time.sleep(2)
            logger.info("Serial connection established.")
            return True
        except Exception as e:
            logger.error(f"Serial connection failed: {e}")
            return False

    def open_camera(self):
        logger.info(f"Opening camera index {self.camera_id} for high-res capture...")
        self.cap = cv2.VideoCapture(self.camera_id)
        if not self.cap.isOpened():
            logger.error("Failed to open camera.")
            return False
        return True

    def get_high_res_ocr(self):
        """Capture a frame and send to Django Vision API for high-accuracy OCR"""
        if not self.cap or not self.cap.isOpened():
            if not self.open_camera(): return None
            
        ret, frame = self.cap.read()
        if not ret: return None
        
        # Encode for API
        _, img_encoded = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        files = {'image': ('trigger_capture.jpg', img_encoded.tobytes(), 'image/jpeg')}
        data = {'save_image': 'false'} # Don't clutter Django media server
        
        try:
            logger.info(f"Triggering Hybrid AI Read via {self.api_url}...")
            start = time.time()
            res = requests.post(self.api_url, files=files, data=data, timeout=15)
            duration = time.time() - start
            
            if res.status_code == 200:
                result = res.json()
                # Extract plate from Qwen-VL response
                plate = result.get('results', {}).get('detections', [{}])[0].get('ocr', [{}])[0].get('text')
                if plate:
                    logger.info(f"AI Read SUCCESS: {plate} ({duration:.2f}s)")
                    return plate
            else:
                logger.error(f"API Error: {res.status_code} - {res.text}")
        except Exception as e:
            logger.error(f"API Request failed: {e}")
        return None

    def insert_scan_event(self, plate_text, source="AI"):
        """Sync detection to Supabase scan_events"""
        try:
            # 1. Check vehicle status
            response = self.supabase.table("vehicles").select("id").eq("plate_number", plate_text).execute()
            vehicle_found = len(response.data) > 0
            
            checkpoint_status = "UNKNOWN"
            has_paid = False
            
            if vehicle_found:
                vehicle_id = response.data[0]["id"]
                today = datetime.now().strftime('%Y-%m-%d')
                pay_resp = self.supabase.table("daily_payments").select("*").eq("vehicle_id", vehicle_id).eq("payment_date", today).execute()
                has_paid = len(pay_resp.data) > 0
                checkpoint_status = "ALLOW" if has_paid else "STOP"
            
            # 2. Log event
            scan_data = {
                "plate_text": plate_text,
                "checkpoint_status": checkpoint_status,
                "has_paid": has_paid,
                "created_at": datetime.now().isoformat()
            }
            self.supabase.table("scan_events").insert(scan_data).execute()
            logger.info(f"[{source}] Logged: {plate_text} -> {checkpoint_status}")
            
        except Exception as e:
            logger.error(f"Supabase sync error: {e}")

    def run(self):
        if not self.connect_serial() or not self.open_camera():
            return

        logger.info("Hybrid Bridge Active. Hardware detections will trigger Cloud AI OCR.")
        try:
            while True:
                if self.ser.in_waiting > 0:
                    line = self.ser.readline().decode('utf-8').strip()
                    if line:
                        husky_plate = line.replace("Plate:", "").strip()
                        if husky_plate:
                            logger.info(f"Hardware trigger: {husky_plate}. Verifying with AI...")
                            # Offload to High-Res AI
                            ai_plate = self.get_high_res_ocr()
                            
                            # Use AI result if available, otherwise fallback to HuskyLens
                            final_plate = ai_plate if ai_plate else husky_plate
                            source = "Hybrid-AI" if ai_plate else "Edge-Husky"
                            
                            self.insert_scan_event(final_plate, source=source)
                time.sleep(0.05)
        except KeyboardInterrupt:
            logger.info("Bridge stopped.")
        finally:
            if self.ser: self.ser.close()
            if self.cap: self.cap.release()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="TaxiGuard Hybrid HuskyLens Bridge")
    parser.add_argument("--port", type=str, required=True, help="Serial port (COMx or /dev/ttyUSBx)")
    parser.add_argument("--cam", type=int, default=0, help="Camera index for high-res capture")
    parser.add_argument("--api", type=str, help="Vision API URL override")
    
    args = parser.parse_args()
    try:
        bridge = HuskyLensBridge(port=args.port, camera_id=args.cam, api_url=args.api)
        bridge.run()
    except Exception as e:
        logger.error(f"Init error: {e}")
