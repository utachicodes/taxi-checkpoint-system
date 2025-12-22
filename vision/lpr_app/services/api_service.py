"""
API service for LPR application.

This service handles API-specific logic including canary request detection,
validation, and response formatting.
"""

import logging
import mimetypes
import time
from typing import Dict, Any, Optional, Tuple

from django.conf import settings
from django.http import JsonResponse

from ..models import UploadedImage, ProcessingLog
from .image_processing_service import ImageProcessingService

logger = logging.getLogger(__name__)


class ApiService:
    """Service for handling API operations and canary requests."""
    
    @staticmethod
    def detect_canary_request(request) -> bool:
        """
        Detect if the current request is a canary request.
        
        Args:
            request: Django request object
            
        Returns:
            True if this is a canary request, False otherwise
        """
        # Canary configuration from settings
        canary_header_name = getattr(settings, 'CANARY_HEADER_NAME', 'X-Canary-Request')
        canary_header_value = getattr(settings, 'CANARY_HEADER_VALUE', 'true')
        canary_enabled = str(getattr(settings, 'CANARY_ENABLED', 'true')).lower() == 'true'
        
        # Check if this is a canary request
        header_key = canary_header_name.upper().replace("-", "_")
        is_canary = (canary_enabled and 
                     request.META.get(f'HTTP_{header_key}') == canary_header_value)
        
        # Log canary requests for audit
        if is_canary:
            logger.info(f"Canary request detected from {request.META.get('REMOTE_ADDR')}")
        
        return is_canary
    
    @staticmethod
    def validate_api_request(request) -> Tuple[bool, Optional[JsonResponse]]:
        """
        Validate API request for image upload.
        
        Args:
            request: Django request object
            
        Returns:
            Tuple of (is_valid, error_response)
        """
        # Check if image file is provided
        if 'image' not in request.FILES:
            return False, JsonResponse({
                'success': False,
                'error': 'No image file provided',
                'error_code': 'MISSING_IMAGE'
            }, status=400)
        
        uploaded_file = request.FILES['image']
        
        # Validate file type - use more robust detection
        content_type = uploaded_file.content_type or mimetypes.guess_type(uploaded_file.name)[0]
        
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp']
        if content_type not in allowed_types:
            return False, JsonResponse({
                'success': False,
                'error': f'Unsupported file type: {content_type}',
                'error_code': 'INVALID_FILE_TYPE'
            }, status=400)
        
        # Validate file size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB in bytes
        if uploaded_file.size > max_size:
            return False, JsonResponse({
                'success': False,
                'error': f'File too large. Maximum size is 10MB',
                'error_code': 'FILE_TOO_LARGE'
            }, status=400)
        
        return True, None
    
    @staticmethod
    def determine_save_image_setting(request, is_canary: bool) -> bool:
        """
        Determine if images should be saved based on request parameters and canary status.
        
        Args:
            request: Django request object
            is_canary: Whether this is a canary request
            
        Returns:
            Boolean indicating whether to save images
        """
        # Handle save_image parameter - allow for all requests to support high-frequency auto-scanning
        save_image_param = request.POST.get('save_image', 'true').lower() != 'false'
        
        # Optimization: Allow disabling save for performance
        save_image = save_image_param
        
        if not save_image and not is_canary:
            logger.info("Request with save_image=false (performance mode)")
        
        return save_image
    
    @staticmethod
    def create_upload_image_record(uploaded_file, save_image: bool, is_canary: bool) -> UploadedImage:
        """
        Create an UploadedImage record.
        
        Args:
            uploaded_file: The uploaded file
            save_image: Whether images will be saved
            is_canary: Whether this is a canary request
            
        Returns:
            UploadedImage instance
        """
        uploaded_image = UploadedImage.objects.create(
            original_image=uploaded_file,
            filename=uploaded_file.name,
            processing_status='pending'
        )
        
        # Log processing start
        ProcessingLog.objects.create(
            uploaded_image=uploaded_image,
            status='started',
            message=f'API OCR processing started (save_image={save_image}, is_canary={is_canary})'
        )
        
        return uploaded_image
    
    @staticmethod
    def format_success_response(
        result: Dict[str, Any], 
        uploaded_image: Optional[UploadedImage],
        processing_time_ms: int,
        is_canary: bool,
        save_image: bool
    ) -> JsonResponse:
        """
        Format success response for API requests.
        
        Args:
            result: Processing result
            uploaded_image: UploadedImage instance (may be None for cleaned up canary requests)
            processing_time_ms: Processing time in milliseconds
            is_canary: Whether this was a canary request
            save_image: Whether images were saved
            
        Returns:
            JsonResponse with formatted success response
        """
        # For canary requests with cleanup, the record may be deleted
        if is_canary and not save_image and 'message' in result and 'cleaned up' in result['message']:
            # Canary image was processed and cleaned up
            response_data = {
                'success': True,
                'message': result['message'],
                'processing_time_ms': processing_time_ms,
                'canary_request': is_canary,
                'image_saved': False,
                'image_id': None  # Record was deleted
            }
            return JsonResponse(response_data, status=200)
        
        # Get detection results (may be None if record was deleted for canary)
        detection_results = None
        plate_count = 0
        ocr_count = 0
        processing_timestamp = None
        
        if uploaded_image:
            try:
                detection_results = uploaded_image.get_detection_results()
                plate_count = uploaded_image.get_plate_count()
                ocr_count = uploaded_image.get_total_ocr_count()
                processing_timestamp = uploaded_image.processing_timestamp.isoformat() if uploaded_image.processing_timestamp else None
            except UploadedImage.DoesNotExist:
                # Record was deleted (canary cleanup)
                pass
        
        # Prepare response data
        response_data = {
            'success': True,
            'image_id': uploaded_image.id if uploaded_image and uploaded_image.pk else None,
            'filename': uploaded_image.filename if uploaded_image else 'deleted',
            'processing_time_ms': processing_time_ms,
            'results': detection_results,
            'summary': {
                'total_plates': plate_count,
                'total_ocr_texts': ocr_count
            },
            'processing_timestamp': processing_timestamp,
            'canary_request': is_canary,
            'image_saved': save_image
        }
        
        return JsonResponse(response_data, status=200)
    
    @staticmethod
    def format_error_response(
        error_message: str,
        error_code: str,
        image_id: Optional[int] = None,
        processing_time_ms: int = 0,
        is_canary: bool = False,
        status_code: int = 500
    ) -> JsonResponse:
        """
        Format error response for API requests.
        
        Args:
            error_message: Error message
            error_code: Error code for client reference
            image_id: Optional image ID
            processing_time_ms: Processing time in milliseconds
            is_canary: Whether this was a canary request
            status_code: HTTP status code
            
        Returns:
            JsonResponse with formatted error response
        """
        response_data = {
            'success': False,
            'error': error_message,
            'error_code': error_code,
            'image_id': image_id,
            'processing_time_ms': processing_time_ms,
            'canary_request': is_canary
        }
        
    @staticmethod
    def process_memory_image(uploaded_file, save_image: bool) -> Tuple[Dict[str, Any], Optional[UploadedImage]]:
        """
        Process image directly in memory without saving to disk first (if save_image=False).
        
        Args:
            uploaded_file: Django UploadedFile object
            save_image: Whether to save the image (if True, falls back to standard flow)
            
        Returns:
            Tuple of (result_dict, uploaded_image_instance_or_none)
        """
        # If saving is requested, we need the standard flow which creates DB record first
        if save_image:
            # We return None to signal the caller to use the standard flow
            return None, None
            
        try:
            from PIL import Image
            import io
            import base64
            from .local_inference_service import LocalInferenceService
            from .qwen_client import get_qwen_client, LPR_PROMPT, parse_lpr_response
            
            # 1. Read file to memory
            file_content = uploaded_file.read()
            uploaded_file.seek(0)  # Reset pointer
            
            # 2. Convert to PIL for YOLO
            image_pil = Image.open(io.BytesIO(file_content))
            
            # 3. Local Inference (YOLO) - Fast Check
            start_time = time.time()
            local_result = LocalInferenceService.detect_vehicle_and_plate(image_pil)
            
            if local_result['success'] and not local_result['is_vehicle']:
                logger.info(f"YOLO (Memory): No vehicle detected. Skipping Cloud AI.")
                return {'success': True, 'is_vehicle': False, 'results': []}, None

            # 4. Prepare for Cloud AI
            # Resize if needed (in memory)
            MAX_DIM = 1920
            if image_pil.width > MAX_DIM or image_pil.height > MAX_DIM:
                image_pil.thumbnail((MAX_DIM, MAX_DIM), Image.Resampling.LANCZOS)
            
            # Convert to Base64
            buffered = io.BytesIO()
            image_pil.convert('RGB').save(buffered, format="JPEG", quality=95)
            img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
            
            # 5. Call Cloud AI (Qwen)
            client = get_qwen_client()
            api_response = client.analyze_image(img_str, LPR_PROMPT)
            
            if not api_response:
                return {'success': False, 'error': 'API call failed'}, None
                
            # 6. Parse Response
            # We use original dimensions for both source and target since we want relative coords or 
            # we can use the resized dimensions if we scaled it. 
            # Ideally parse_lpr_response should handle this, but for now we pass dims.
            parsed_response = parse_lpr_response(
                api_response, 
                original_h=image_pil.height, 
                original_w=image_pil.width
            )
            
            processing_time = int((time.time() - start_time) * 1000)
            
            return {
                'success': True,
                'is_vehicle': True,
                'results': parsed_response,
                'processing_time_ms': processing_time,
                'image_saved': False
            }, None

        except Exception as e:
            logger.error(f"Error in in-memory processing: {e}")
            return {'success': False, 'error': str(e)}, None
