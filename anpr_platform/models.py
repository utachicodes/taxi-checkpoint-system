from sqlalchemy import Column, String, Boolean, DateTime, Integer
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class KnownPlate(Base):
    """Whitelist of registered plates"""
    __tablename__ = "known_plates"

    id = Column(Integer, primary_key=True)
    plate = Column(String, unique=True, nullable=False)
    owner_name = Column(String)
    vehicle_info = Column(String)
    is_authorized = Column(Boolean, default=True)

class PlateEvent(Base):
    """Log of every plate detection"""
    __tablename__ = "plate_events"

    id = Column(Integer, primary_key=True)
    plate = Column(String, nullable=False)
    camera = Column(String)
    confidence = Column(String)
    owner_name = Column(String, nullable=True)   # filled if plate is known
    is_known = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
