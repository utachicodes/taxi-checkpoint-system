import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from .database import init_db, SessionLocal
from .models import PlateEvent
from . import mqtt_client
from contextlib import asynccontextmanager

# Track connected WebSocket dashboard clients
connected_clients: list[WebSocket] = []

async def broadcast(data: dict):
    """Send plate event to all open dashboard connections."""
    message = json.dumps(data)
    disconnected = []
    for ws in connected_clients:
        try:
            await ws.send_text(message)
        except Exception:
            disconnected.append(ws)
    for ws in disconnected:
        if ws in connected_clients:
            connected_clients.remove(ws)

def sync_broadcast(data: dict):
    """Called from the MQTT thread — schedules the async broadcast."""
    # Since we are in a separate thread (paho-mqtt loop), 
    # we need to schedule the broadcast in the main loop
    loop = asyncio.get_event_loop()
    if loop.is_running():
        loop.create_task(broadcast(data))

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    mqtt_client.broadcast_callback = sync_broadcast
    mqtt_client.start_mqtt()
    print("MQTT subscriber started.")
    yield
    # Shutdown (optional: clean up MQTT client if needed)

app = FastAPI(lifespan=lifespan)
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    with SessionLocal() as session:
        recent = session.query(PlateEvent).order_by(PlateEvent.timestamp.desc()).limit(20).all()
    return templates.TemplateResponse("dashboard.html", {"request": request, "events": recent})

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    try:
        while True:
            # Keep connection alive and wait for client to close it
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in connected_clients:
            connected_clients.remove(websocket)
    except Exception:
        if websocket in connected_clients:
            connected_clients.remove(websocket)

@app.get("/api/events")
async def get_events(limit: int = 50):
    with SessionLocal() as session:
        events = session.query(PlateEvent).order_by(PlateEvent.timestamp.desc()).limit(limit).all()
        return [
            {
                "plate": e.plate,
                "camera": e.camera,
                "confidence": e.confidence,
                "is_known": e.is_known,
                "owner_name": e.owner_name,
                "timestamp": e.timestamp.isoformat(),
            }
            for e in events
        ]
