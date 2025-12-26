# Author: UtachiCodes
import json
import logging
import base64
from typing import Optional, Dict, Any
from google import genai
from django.conf import settings

logger = logging.getLogger(__name__)


class GeminiClient:
    """
    Client for interacting with Google Gemini API for vision-based license plate recognition
    """
    
    def __init__(self):
        """Initialize the Gemini client"""
        self.api_key = getattr(settings, 'GEMINI_API_KEY', None)
        self.model_name = getattr(settings, 'GEMINI_MODEL', 'gemini-1.5-flash')
        
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured in settings")
        
        # Configure the Gemini client
        self.client = genai.Client(api_key=self.api_key)
        
        logger.info(f"GeminiClient initialized with model: {self.model_name}")
    
    def analyze_image(self, base64_image: str) -> Optional[str]:
        """
        Send image and prompt to Gemini for analysis
        
        Args:
            base64_image: Base64 encoded image string
            
        Returns:
            Model response text or None if error occurs
        """
        try:
            # Decode base64 image
            image_bytes = base64.b64decode(base64_image)
            
            # Get the LPR prompt from settings
            prompt = settings.LPR_PROMPT
            
            # Generate content with image and text prompt
            # Using types.Part.from_bytes to satisfy Pydantic validation
            from google.genai import types
            image_part = types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg')
            
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[
                    prompt,
                    image_part
                ]
            )
            
            # Extract text from response
            if response and response.text:
                logger.info("Gemini API call completed successfully")
                return response.text
            else:
                logger.error("Gemini returned empty response")
                return None
                
        except Exception as e:
            logger.error(f"Error calling Gemini API: {str(e)}")
            return None
    
    def health_check(self) -> bool:
        """
        Check if the API is accessible
        
        Returns:
            True if API is accessible, False otherwise
        """
        try:
            # Create a simple test image (1x1 pixel white PNG in base64)
            test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
            
            # Decode image
            image_bytes = base64.b64decode(test_image)
            
            # Try a minimal request
            from google.genai import types
            image_part = types.Part.from_bytes(data=image_bytes, mime_type='image/png')
            
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[
                    "Describe this image briefly.",
                    image_part
                ]
            )
            
            return response and response.text is not None
            
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return False


def convert_from_normalized_format(bbox, original_h, original_w, resized_h=None, resized_w=None):
    """
    Convert coordinates from normalized format (0-1000) back to original image dimensions.
    
    Args:
        bbox: List of [x1, y1, x2, y2] coordinates in 0-1000 range
        original_h: Original image height
        original_w: Original image width
        resized_h: Height of image sent to API (if resized, defaults to original_h)
        resized_w: Width of image sent to API (if resized, defaults to original_w)
        
    Returns:
        List of [x1, y1, x2, y2] coordinates in original image dimensions
    """
    if resized_h is None:
        resized_h = original_h
    if resized_w is None:
        resized_w = original_w
    
    x1_norm, y1_norm, x2_norm, y2_norm = bbox
    
    # Convert from 0-1000 range directly to original image dimensions
    x1_original = round(x1_norm / 1000 * original_w)
    y1_original = round(y1_norm / 1000 * original_h)
    x2_original = round(x2_norm / 1000 * original_w)
    y2_original = round(y2_norm / 1000 * original_h)
    
    # Ensure coordinates are within image bounds
    x1_original = max(0, min(x1_original, original_w))
    y1_original = max(0, min(y1_original, original_h))
    x2_original = max(0, min(x2_original, original_w))
    y2_original = max(0, min(y2_original, original_h))
    
    return [x1_original, y1_original, x2_original, y2_original]


def get_gemini_client() -> GeminiClient:
    """
    Get a configured Gemini client instance
    
    Returns:
        GeminiClient instance
    """
    return GeminiClient()


def parse_lpr_response(response_text: str, original_h: Optional[int] = None, original_w: Optional[int] = None,
                       resized_h: Optional[int] = None, resized_w: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """
    Parse the LPR response from Gemini and scale coordinates back to original image dimensions
    
    Args:
        response_text: Raw response text from the API
        original_h: Original image height
        original_w: Original image width
        resized_h: Height of image sent to API (if resized)
        resized_w: Width of image sent to API (if resized)
        
    Returns:
        Parsed JSON data with scaled coordinates or None if parsing fails
    """
    try:
        # Improved extraction logic to handle various formats and conversational noise
        json_text = response_text.strip()
        
        # 1. Try to find the JSON block using markdown markers
        if '```json' in json_text:
            start = json_text.find('```json') + 7
            end = json_text.find('```', start)
            if end != -1:
                json_text = json_text[start:end].strip()
        elif '```' in json_text:
            start = json_text.find('```') + 3
            end = json_text.find('```', start)
            if end != -1:
                json_text = json_text[start:end].strip()
        
        # 2. If still not valid JSON, try to find the first '{' and last '}'
        if not (json_text.startswith('{') and json_text.endswith('}')):
            start_idx = json_text.find('{')
            end_idx = json_text.rfind('}')
            if start_idx != -1 and end_idx != -1:
                json_text = json_text[start_idx:end_idx + 1]

        # Parse the JSON
        parsed_data = json.loads(json_text)
        
        # Scale coordinates if image dimensions are provided
        if original_h is not None and original_w is not None:
            parsed_data = scale_coordinates_in_response(parsed_data, original_h, original_w, resized_h, resized_w)
        
        logger.info("Successfully parsed LPR response")
        return parsed_data
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON response: {str(e)}")
        logger.debug(f"Raw text received: {response_text}")
        return None
    except Exception as e:
        logger.error(f"Error parsing LPR response: {str(e)}")
        return None


def scale_coordinates_in_response(data: Dict[str, Any], original_h: int, original_w: int,
                                 resized_h: Optional[int] = None, resized_w: Optional[int] = None) -> Dict[str, Any]:
    """
    Scale all coordinates in the LPR response from 0-1000 range to original image dimensions
    
    Args:
        data: Parsed LPR response data
        original_h: Original image height
        original_w: Original image width
        resized_h: Height of image sent to API (if resized)
        resized_w: Width of image sent to API (if resized)
        
    Returns:
        Data with scaled coordinates
    """
    if 'detections' not in data:
        return data
    
    detections = data['detections']
    
    # Handle both list and dictionary formats
    if isinstance(detections, list):
        for detection in detections:
            scale_detection_coordinates(detection, original_h, original_w, resized_h, resized_w)
    elif isinstance(detections, dict):
        for detection_key in detections:
            scale_detection_coordinates(detections[detection_key], original_h, original_w, resized_h, resized_w)
    
    return data


def scale_detection_coordinates(detection: Dict[str, Any], original_h: int, original_w: int,
                               resized_h: Optional[int] = None, resized_w: Optional[int] = None) -> None:
    """
    Scale coordinates for a single detection
    
    Args:
        detection: Detection data with coordinates
        original_h: Original image height
        original_w: Original image width
        resized_h: Height of image sent to API (if resized)
        resized_w: Width of image sent to API (if resized)
    """
    # Scale plate coordinates
    if 'plate' in detection and 'coordinates' in detection['plate']:
        coords = detection['plate']['coordinates']
        if all(key in coords for key in ['x1', 'y1', 'x2', 'y2']):
            bbox = [coords['x1'], coords['y1'], coords['x2'], coords['y2']]
            scaled_bbox = convert_from_normalized_format(bbox, original_h, original_w, resized_h, resized_w)
            coords['x1'], coords['y1'], coords['x2'], coords['y2'] = scaled_bbox
    
    # Scale OCR coordinates
    if 'ocr' in detection:
        ocr_data = detection['ocr']
        if isinstance(ocr_data, list):
            for ocr_item in ocr_data:
                if isinstance(ocr_item, dict) and 'coordinates' in ocr_item:
                    coords = ocr_item['coordinates']
                    if all(key in coords for key in ['x1', 'y1', 'x2', 'y2']):
                        bbox = [coords['x1'], coords['y1'], coords['x2'], coords['y2']]
                        scaled_bbox = convert_from_normalized_format(bbox, original_h, original_w, resized_h, resized_w)
                        coords['x1'], coords['y1'], coords['x2'], coords['y2'] = scaled_bbox
        elif isinstance(ocr_data, dict):
            for ocr_key in ocr_data:
                ocr_item = ocr_data[ocr_key]
                if isinstance(ocr_item, dict) and 'coordinates' in ocr_item:
                    coords = ocr_item['coordinates']
                    if all(key in coords for key in ['x1', 'y1', 'x2', 'y2']):
                        bbox = [coords['x1'], coords['y1'], coords['x2'], coords['y2']]
                        scaled_bbox = convert_from_normalized_format(bbox, original_h, original_w, resized_h, resized_w)
                        coords['x1'], coords['y1'], coords['x2'], coords['y2'] = scaled_bbox
