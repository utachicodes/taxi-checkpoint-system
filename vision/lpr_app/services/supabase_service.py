# Author: UtachiCodes
import logging
import requests
from typing import Dict, Any, Optional
from django.conf import settings
from supabase import create_client, Client

logger = logging.getLogger(__name__)

class SupabaseService:
    """Service for interacting with the external Taxi Checkpoint System's Supabase backend"""

    _client: Optional[Client] = None

    @classmethod
    def get_client(cls) -> Client:
        """Initialize and return the Supabase client"""
        if cls._client is None:
            cls._client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_ROLE_KEY
            )
        return cls._client

    @staticmethod
    def get_vehicle_by_plate(plate_number: str) -> Optional[Dict[str, Any]]:
        """Lookup a vehicle in the external database"""
        try:
            client = SupabaseService.get_client()
            # Clean plate number for lookup
            clean_plate = plate_number.replace(" ", "").replace("-", "").upper()
            
            response = client.table("vehicles").select("*, driver:drivers(*)").ilike("plate_number", clean_plate).execute()
            
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error looking up vehicle {plate_number} in Supabase: {e}")
            return None

    @staticmethod
    def check_payment_status(vehicle_id: str) -> Dict[str, Any]:
        """Check if the vehicle has paid for today"""
        try:
            client = SupabaseService.get_client()
            from datetime import date
            today = date.today().isoformat()
            
            response = client.table("daily_payments").select("*").eq("vehicle_id", vehicle_id).eq("payment_date", today).eq("is_paid", True).execute()
            
            return {
                'has_paid': len(response.data) > 0,
                'count': len(response.data)
            }
        except Exception as e:
            logger.error(f"Error checking payment for vehicle {vehicle_id}: {e}")
            return {'has_paid': False, 'error': str(e)}

    @staticmethod
    def log_checkpoint_record(vehicle_data: Dict[str, Any], status: str, uploaded_image_url: str) -> Optional[Dict[str, Any]]:
        """Log the checkpoint scan to the external system"""
        try:
            client = SupabaseService.get_client()
            
            # Note: We need a valid operator_id and checkpoint_id
            # For now, we'll use a default or configurable ID from settings
            record = {
                "checkpoint_id": settings.EXTERNAL_CHECKPOINT_ID,
                "operator_id": settings.EXTERNAL_OPERATOR_ID,
                "vehicle_id": vehicle_data["id"],
                "driver_id": vehicle_data["driver_id"],
                "record_status": "clear" if status == "ALLOW" else "warning",
                "photo_evidence_url": uploaded_image_url,
                "notes": f"Automated scan via Open-LPR on NVIDIA Board"
            }
            
            response = client.table("checkpoint_records").insert(record).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error logging checkpoint record to Supabase: {e}")
            return None

    @staticmethod
    def create_scan_event(plate_text: str, taxi_info: Dict[str, Any], uploaded_image_url: str, uploaded_image_id: int) -> Optional[Dict[str, Any]]:
        """Insert a scan event into `scan_events` table for realtime frontend subscriptions."""
        try:
            client = SupabaseService.get_client()
            record = {
                "plate_text": plate_text,
                "vehicle_id": taxi_info.get("vehicle_id") if isinstance(taxi_info, dict) else None,
                "is_registered": taxi_info.get("is_registered") if isinstance(taxi_info, dict) else False,
                "has_paid": taxi_info.get("has_paid") if isinstance(taxi_info, dict) else False,
                "checkpoint_status": taxi_info.get("checkpoint_status") if isinstance(taxi_info, dict) else taxi_info.get("status") if isinstance(taxi_info, dict) else None,
                "image_url": uploaded_image_url,
                "uploaded_image_id": uploaded_image_id,
                "api_response": taxi_info
            }

            response = client.table("scan_events").insert(record).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating scan event in Supabase: {e}")
            return None

    @staticmethod
    def verify_taxi_status(plate_number: str, image_url: str = "") -> Dict[str, Any]:
        """Main entry point to verify taxi status and log the scan"""
        vehicle = SupabaseService.get_vehicle_by_plate(plate_number)
        
        if not vehicle:
            return {
                'is_registered': False,
                'has_paid': False,
                'checkpoint_status': 'UNREGISTERED',
                'message': 'Vehicule non enregistré'
            }
        
        payment = SupabaseService.check_payment_status(vehicle['id'])
        has_paid = payment['has_paid']
        
        status = 'ALLOW' if (vehicle['vehicle_status'] == 'active' and has_paid) else 'STOP'
        
        # Log to external system
        SupabaseService.log_checkpoint_record(vehicle, status, image_url)
        
        return {
            'is_registered': True,
            'vehicle_status': vehicle['vehicle_status'],
            'has_paid': has_paid,
            'owner': vehicle['driver']['full_name'] if vehicle.get('driver') else 'Inconnu',
            'make': vehicle['make'],
            'model': vehicle['model'],
            'checkpoint_status': status,
            'message': 'Vehicule vérifié' if status == 'ALLOW' else 'TAXE NON PAYÉE : VEUILLEZ VOUS GARER'
        }
