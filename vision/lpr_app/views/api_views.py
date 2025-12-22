"""
API views for LPR application.

This module contains views for handling API requests and responses
including OCR processing, health checks, and metrics.
"""

import logging
import time
from datetime import datetime

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from ..models import UploadedImage
from ..services.api_service import ApiService
from ..services.image_processing_service import ImageProcessingService
from ..services.qwen_client import get_qwen_client
from ..services.supabase_service import SupabaseService
from ..metrics import get_metrics_response
from ..utils.metrics_helpers import MetricsHelper, PerformanceTracker
from ..utils.response_helpers import ResponseHelper

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["POST"])
def api_ocr_upload(request):
    """
    REST API endpoint to upload an image and get OCR results synchronously.
    """
    logger.info("DEBUG: api_ocr_upload function called!")
    
    # Detect if this is a canary request
    is_canary = ApiService.detect_canary_request(request)
    
    # Validate API request
    is_valid, error_response = ApiService.validate_api_request(request)
    if not is_valid:
        MetricsHelper.record_api_error()
        return error_response
    
    uploaded_file = request.FILES['image']
    save_image = ApiService.determine_save_image_setting(request, is_canary)
    
    start_time = time.time()
    
    with PerformanceTracker('api_request') as tracker:
        try:
            # Try In-Memory Processing First (Performance Optimization)
            # If save_image is False, this returns the result directly without touching disk/DB
            memory_result, _ = ApiService.process_memory_image(uploaded_file, save_image)
            
            if memory_result:
                 # In-memory processing succeeded (or decided to skip)
                 # Check if we found a vehicle/plate
                if memory_result.get('success') and memory_result.get('is_vehicle'):
                    # Even for in-memory, we might want to log the "event" if a plate was found
                    results = memory_result.get('results', {})
                    detections = results.get('detections', []) if results else []
                    
                    # Simple check for plate
                    plate_number = None
                    if detections and len(detections) > 0:
                        plate_obj = detections[0]
                        # Handle both list and dict formats
                        ocr_data = plate_obj.get('ocr', [])
                        if isinstance(ocr_data, list) and len(ocr_data) > 0:
                            plate_number = ocr_data[0].get('text')
                        elif isinstance(ocr_data, dict) and ocr_data:
                            first_key = list(ocr_data.keys())[0]
                            plate_number = ocr_data[first_key].get('text')
                    
                    # Only log event if plate found (matching our business logic)
                    if plate_number:
                        try:
                            SupabaseService.create_scan_event(
                                plate_text=plate_number,
                                taxi_info={ 'detected_in_memory': True }, # Minimal info since we didn't check taxi DB in memory path yet
                                uploaded_image_url=None, # No image saved
                                uploaded_image_id=None
                            )
                        except Exception:
                            logger.exception("Failed to create Supabase scan event for in-memory scan")

                return ApiService.format_success_response(
                    memory_result, 
                    None, 
                    memory_result.get('processing_time_ms', 0), 
                    is_canary, 
                    save_image
                )

            # Create upload record
            uploaded_image = ApiService.create_upload_image_record(
                uploaded_file, save_image, is_canary
            )
            
            # Process the image
            result = ImageProcessingService.process_uploaded_image(uploaded_image, save_image=save_image)
            
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            if result['success']:
                # --- External Taxi Integration ---
                plate_number = uploaded_image.get_first_ocr_text()
                taxi_info = {}
                if plate_number:
                    image_url = request.build_absolute_uri(uploaded_image.original_image.url) if uploaded_image.original_image else ""
                    taxi_info = SupabaseService.verify_taxi_status(plate_number, image_url)
                # ----------------------------------

                MetricsHelper.record_upload_attempt('success')
                MetricsHelper.record_processing_attempt('completed')
                
                # Format success response
                success_response = ApiService.format_success_response(
                    result, uploaded_image, processing_time_ms, is_canary, save_image
                )
                
                # Add taxi info to the response
                import json
                data = json.loads(success_response.content)
                data['taxi_info'] = taxi_info

                # Update the database record with taxi_info in api_response
                uploaded_image.api_response = data
                uploaded_image.save(update_fields=['api_response'])

                # Create a realtime scan event in Supabase so frontend can subscribe
                # OPTIMIZATION: Only create event if a plate was actually detected
                if plate_number:
                    try:
                        image_url = request.build_absolute_uri(uploaded_image.original_image.url) if uploaded_image.original_image else ""
                        SupabaseService.create_scan_event(
                            plate_text=plate_number or "",
                            taxi_info={
                                'is_registered': taxi_info.get('is_registered'),
                                'has_paid': taxi_info.get('has_paid'),
                                'checkpoint_status': taxi_info.get('checkpoint_status'),
                                'vehicle_id': taxi_info.get('vehicle_id') if isinstance(taxi_info, dict) else None,
                                'owner': taxi_info.get('owner') if isinstance(taxi_info, dict) else None,
                            },
                            uploaded_image_url=image_url,
                            uploaded_image_id=uploaded_image.id
                        )
                    except Exception:
                        logger.exception("Failed to create Supabase scan event")

                return JsonResponse(data, status=success_response.status_code)
            else:
                MetricsHelper.record_upload_attempt('failed')
                return ApiService.format_error_response(
                    error_message=result.get('error', 'Processing failed'),
                    error_code='PROCESSING_FAILED',
                    image_id=uploaded_image.id,
                    processing_time_ms=processing_time_ms,
                    is_canary=is_canary,
                    status_code=500
                )
                
        except Exception as e:
            logger.error(f"Error in api_ocr_upload: {str(e)}")
            return ResponseHelper.server_error_response()


def api_health_check(request):
    """
    Health check endpoint for the API.
    """
    try:
        with PerformanceTracker('api_request') as tracker:
            client = get_qwen_client()
            api_healthy = client.health_check()
            
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                db_healthy = cursor.fetchone() is not None
            
            status_code = 200 if api_healthy and db_healthy else 503
            return JsonResponse({
                'status': 'healthy' if status_code == 200 else 'unhealthy',
                'api_healthy': api_healthy,
                'database_healthy': db_healthy,
                'timestamp': datetime.now().isoformat()
            }, status=status_code)
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JsonResponse({'status': 'unhealthy', 'error': str(e)}, status=503)


def metrics_view(request):
    """
    Prometheus metrics endpoint.
    """
    try:
        metrics_data, content_type = get_metrics_response()
        from django.http import HttpResponse
        return HttpResponse(metrics_data, content_type=content_type)
    except Exception as e:
        return HttpResponse("Error generating metrics", status=500, content_type="text/plain")
