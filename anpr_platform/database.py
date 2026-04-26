from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base, KnownPlate, PlateEvent

DATABASE_URL = "sqlite:///./anpr.db"   # swap for postgresql://... if needed

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def lookup_plate(plate: str):
    """Check if a plate exists in the database. Returns KnownPlate or None."""
    with SessionLocal() as session:
        return session.query(KnownPlate).filter_by(plate=plate.upper()).first()

def log_event(plate: str, camera: str, confidence: str, known_plate=None):
    """Save a detection event to the log."""
    with SessionLocal() as session:
        event = PlateEvent(
            plate=plate.upper(),
            camera=camera,
            confidence=confidence,
            owner_name=known_plate.owner_name if known_plate else None,
            is_known=known_plate is not None,
        )
        session.add(event)
        session.commit()
        session.refresh(event)
        return event
