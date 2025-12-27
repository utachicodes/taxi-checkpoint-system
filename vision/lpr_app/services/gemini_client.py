# Author: UtachiCodes
import json
import logging
import base64
import requests
from typing import Optional, Dict, Any
from django.conf import settings

logger = logging.getLogger(__name__)


class GeminiClient:
    """
    Client for interacting with Google Gemini API for vision-based license plate recognition
    Uses REST API directly for better compatibility
    """
    
    def __init__(self):
        """Initialize the Gemini client"""
        self.api_key = getattr(settings, 'GEMINI_API_KEY', None)
        model_from_settings = getattr(settings, 'GEMINI_MODEL', None)
        
        # Try model names that work with REST API v1
        # REST API uses format: models/gemini-1.5-pro or models/gemini-pro-vision
        self.model_candidates = [
            model_from_settings,  # User-specified model
            'models/gemini-1.5-pro',      # REST API format
            'models/gemini-1.5-flash',     # REST API format
            'models/gemini-pro-vision',    # Vision-specific model
            'models/gemini-pro',           # Fallback
        ]
        
        # Filter out None values and use first available
        self.model_candidates = [m for m in self.model_candidates if m]
        self.model_name = self.model_candidates[0] if self.model_candidates else 'models/gemini-1.5-pro'
        
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured in settings")
        
        # Use REST API v1 endpoint (more stable than v1beta)
        self.api_url = f"https://generativelanguage.googleapis.com/v1/{self.model_name}:generateContent"
        
        logger.info(f"GeminiClient initialized with model: {self.model_name}")
        if len(self.model_candidates) > 1:
            logger.debug(f"Alternative models available: {self.model_candidates[1:]}")
    
    def analyze_image(self, base64_image: str) -> Optional[str]:
        """
        Send image and prompt to Gemini for analysis using REST API
        
        Args:
            base64_image: Base64 encoded image string
            
        Returns:
            Model response text or None if error occurs
        """
        prompt = settings.LPR_PROMPT
        
        # Try each model candidate until one works
        for model_name in self.model_candidates:
            try:
                # Use REST API v1 endpoint
                api_url = f"https://generativelanguage.googleapis.com/v1/{model_name}:generateContent?key={self.api_key}"
                
                logger.debug(f"Attempting API call with model: {model_name}")
                
                # Prepare request payload for REST API
                payload = {
                    "contents": [{
                        "parts": [
                            {"text": prompt},
                            {
                                "inline_data": {
                                    "mime_type": "image/jpeg",
                                    "data": base64_image
                                }
                            }
                        ]
                    }]
                }
                
                headers = {
                    "Content-Type": "application/json"
                }
                
                response = requests.post(api_url, json=payload, headers=headers, timeout=30)
                
                if response.status_code == 200:
                    result = response.json()
                    
                    # Extract text from response
                    if result and 'candidates' in result and len(result['candidates']) > 0:
                        candidate = result['candidates'][0]
                        if 'content' in candidate and 'parts' in candidate['content']:
                            text_parts = [part.get('text', '') for part in candidate['content']['parts'] if 'text' in part]
                            response_text = ''.join(text_parts)
                            
                            if response_text:
                                logger.info(f"Gemini API call completed successfully with model: {model_name}")
                                self.model_name = model_name  # Update to working model
                                return response_text
                    
                    logger.error(f"Gemini returned empty response for model: {model_name}")
                    continue
                else:
                    error_data = response.json() if response.text else {}
                    error_str = f"{response.status_code} {response.reason}"
                    if error_data.get('error'):
                        error_str = f"{error_str}: {error_data['error']}"
                    
                    logger.warning(f"Error calling Gemini API with model '{model_name}': {error_str}")
                    
                    # If model not found, try next candidate
                    if response.status_code == 404 or 'NOT_FOUND' in str(error_data):
                        logger.info(f"Model '{model_name}' not found, will try next alternative")
                        continue
                    else:
                        # For other errors, log and try next model
                        logger.debug(f"Non-404 error with model '{model_name}', trying next model")
                        continue
                    
            except requests.exceptions.RequestException as e:
                logger.warning(f"Request error with model '{model_name}': {str(e)}")
                continue
            except Exception as e:
                error_str = str(e)
                logger.warning(f"Error calling Gemini API with model '{model_name}': {error_str}")
                continue
        
        # If we get here, all models failed
        logger.error("All Gemini model alternatives failed")
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
            
            # Use REST API
            api_url = f"https://generativelanguage.googleapis.com/v1/{self.model_name}:generateContent?key={self.api_key}"
            
            payload = {
                "contents": [{
                    "parts": [
                        {"text": "Describe this image briefly."},
                        {
                            "inline_data": {
                                "mime_type": "image/png",
                                "data": test_image
                            }
                        }
                    ]
                }]
            }
            
            headers = {"Content-Type": "application/json"}
            response = requests.post(api_url, json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result and 'candidates' in result and len(result['candidates']) > 0:
                    candidate = result['candidates'][0]
                    if 'content' in candidate and 'parts' in candidate['content']:
                        text_parts = [part.get('text', '') for part in candidate['content']['parts'] if 'text' in part]
                        return bool(''.join(text_parts))
            
            return False
            
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
