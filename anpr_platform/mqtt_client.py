import json
import os
import paho.mqtt.client as mqtt
from .database import lookup_plate, log_event

# Will be set by main.py to broadcast to WebSocket clients
broadcast_callback = None

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
    except Exception:
        return

    # Frigate publishes plate data inside the 'after' object
    after = payload.get("after", {})
    sub_label = after.get("sub_label")

    # sub_label is ["PLATE123", confidence_score] when LPR fires
    if not sub_label or not isinstance(sub_label, list):
        return

    plate = sub_label[0]
    confidence = str(round(sub_label[1] * 100, 1)) + "%" if len(sub_label) > 1 else "N/A"
    camera = after.get("camera", "unknown")

    print(f"[ANPR] Plate detected: {plate} | Camera: {camera} | Confidence: {confidence}")

    # Database lookup
    known = lookup_plate(plate)
    event = log_event(plate, camera, confidence, known)

    # Build result to send to dashboard
    result = {
        "plate": plate,
        "camera": camera,
        "confidence": confidence,
        "is_known": event.is_known,
        "owner_name": event.owner_name or "Unknown vehicle",
        "timestamp": event.timestamp.isoformat(),
    }

    # Broadcast to all connected dashboard clients
    if broadcast_callback:
        broadcast_callback(result)

def start_mqtt(broker_host=None, broker_port=None):
    if broker_host is None:
        broker_host = os.getenv("MQTT_HOST", "mqtt")
    if broker_port is None:
        broker_port = int(os.getenv("MQTT_PORT", 1883))

    # Using modern callback API for paho-mqtt
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_message = on_message
    
    try:
        client.connect(broker_host, broker_port)
        client.subscribe("frigate/events")   # all Frigate events
        client.loop_start()
        print(f"Connected to MQTT broker at {broker_host}:{broker_port}")
    except Exception as e:
        print(f"Failed to connect to MQTT broker: {e}")
        
    return client
