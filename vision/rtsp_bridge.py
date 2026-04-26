import cv2
import os
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env.local'))

CAMERA_URL = os.getenv('CAMERA_URL', 'rtsp://admin:123456@192.168.0.123:554/live/ch0')
PORT = 5000

class CamHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/video_feed':
            self.send_response(200)
            self.send_header('Content-type', 'multipart/x-mixed-replace; boundary=frame')
            self.end_headers()
            
            cap = cv2.VideoCapture(CAMERA_URL)
            if not cap.isOpened():
                print(f"Error: Could not open video source {CAMERA_URL}")
                return

            try:
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        print("Failed to capture frame. Reconnecting...")
                        cap.release()
                        time.sleep(2)
                        cap = cv2.VideoCapture(CAMERA_URL)
                        continue
                    
                    # Optional: Resize for performance
                    # frame = cv2.resize(frame, (800, 450))
                    
                    _, jpeg = cv2.imencode('.jpg', frame)
                    self.wfile.write(b'--frame\r\n')
                    self.send_header('Content-Type', 'image/jpeg')
                    self.send_header('Content-Length', len(jpeg))
                    self.end_headers()
                    self.wfile.write(jpeg.tobytes())
                    self.wfile.write(b'\r\n')
                    
            except Exception as e:
                print(f"Stream error: {e}")
            finally:
                cap.release()
        elif self.path == '/snapshot':
            cap = cv2.VideoCapture(CAMERA_URL)
            ret, frame = cap.read()
            cap.release()
            
            if ret:
                _, jpeg = cv2.imencode('.jpg', frame)
                self.send_response(200)
                self.send_header('Content-Type', 'image/jpeg')
                self.send_header('Content-Length', len(jpeg))
                self.end_headers()
                self.wfile.write(jpeg.tobytes())
            else:
                self.send_response(500)
                self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in a separate thread."""

def run():
    server = ThreadedHTTPServer(('0.0.0.0', PORT), CamHandler)
    print(f"RTSP Bridge started at http://localhost:{PORT}/video_feed")
    print(f"Connecting to: {CAMERA_URL}")
    server.serve_forever()

if __name__ == '__main__':
    run()
