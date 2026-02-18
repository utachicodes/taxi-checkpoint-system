import os
import time
import subprocess
import sys

# This script simulates a HuskyLens sending serial data
# Since we don't have real hardware, we'll simulate the bridge logic directly 
# but targeting the same Supabase table.

def mock_husky_detection(plate):
    print(f"--- Simulating HuskyLens Detection: {plate} ---")
    # We call the bridge logic but as a one-off
    cmd = [
        sys.executable, 
        "edge/huskylens_bridge.py", 
        "--port", "MOCK", # Use a dummy port
        "--loc", "Simulation"
    ]
    
    # Actually, the bridge script expects a real serial port.
    # Let's just create a simple test script that uses the Supabase client directly
    # to verify the scan_events flow which is what HuskyLens triggers.
    
    from supabase import create_client
    from dotenv import load_dotenv
    from datetime import datetime
    
    from pathlib import Path
    # script is in scripts/ so we need parent.parent to reach root
    env_path = Path(__file__).resolve().parent.parent / '.env.local'
    load_dotenv(dotenv_path=env_path)
    if not os.environ.get("NEXT_PUBLIC_SUPABASE_URL"):
        # Fallback to current dir .env or parent .env
        load_dotenv()
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    supabase = create_client(url, key)
    
    data = {
        "plate_text": plate,
        "checkpoint_status": "ALLOW",
        "has_paid": True,
        "created_at": datetime.now().isoformat()
    }
    
    try:
        res = supabase.table("scan_events").insert(data).execute()
        print(f"SUCCESS: Inserted {plate}. Check your dashboard!")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_plates = ["DK-1234-A", "SN-999-TH", "LT-042-X"]
    for p in test_plates:
        mock_husky_detection(p)
        time.sleep(2)
