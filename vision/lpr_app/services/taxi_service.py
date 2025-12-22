# Author: UtachiCodes
import logging
from typing import Dict, Any, Optional
from ..taxi_models import Taxi, PaymentStatus, CheckpointLog
from ..models import UploadedImage

logger = logging.getLogger(__name__)

class TaxiService:
    """Service for handling taxi-related business logic"""

    @staticmethod
    def get_taxi_by_plate(plate_number: str) -> Optional[Taxi]:
        """Lookup a taxi by license plate"""
        try:
            # Clean plate number (remove spaces, dashes)
            clean_plate = plate_number.replace(" ", "").replace("-", "").upper()
            # This is a simple exact match, could be improved with fuzzy matching if needed
            return Taxi.objects.filter(plate_number__iexact=clean_plate).first()
        except Exception as e:
            logger.error(f"Error looking up taxi {plate_number}: {e}")
            return None

    @staticmethod
    def check_taxi_status(plate_number: str) -> Dict[str, Any]:
        """
        Check registration and payment status for a plate
        """
        taxi = TaxiService.get_taxi_by_plate(plate_number)
        
        if not taxi:
            return {
                'is_registered': False,
                'has_paid': False,
                'checkpoint_status': 'UNREGISTERED',
                'message': 'Taxi not found in database'
            }
        
        # Check payment status
        payment = getattr(taxi, 'payment_status', None)
        has_paid = payment.is_paid if payment else False
        
        status = 'ALLOW' if (taxi.is_active and has_paid) else 'STOP'
        
        return {
            'is_registered': True,
            'is_active': taxi.is_active,
            'has_paid': has_paid,
            'owner': taxi.owner_name,
            'vehicle': taxi.vehicle_model,
            'checkpoint_status': status,
            'message': 'Taxi verified' if status == 'ALLOW' else 'Check payment or registration'
        }

    @staticmethod
    def log_scan(plate_number: str, uploaded_image: UploadedImage, location: str = "Main Checkpoint") -> CheckpointLog:
        """Log a scan at a checkpoint"""
        status_info = TaxiService.check_taxi_status(plate_number)
        taxi = TaxiService.get_taxi_by_plate(plate_number)
        
        log = CheckpointLog.objects.create(
            taxi=taxi,
            unrecognized_plate=plate_number if not taxi else None,
            image=uploaded_image,
            location=location,
            status_at_time=status_info['checkpoint_status']
        )
        
        return log
