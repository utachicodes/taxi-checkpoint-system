# Author: UtachiCodes
import json
import logging
import time
from typing import Optional, Dict, Any
import requests
from openai import OpenAI, DefaultHttpxClient
from django.conf import settings

logger = logging.getLogger(__name__)


class QwenVLClient:
    """
    Client for interacting with Qwen3-VL API using OpenAI-compatible interface
    """
    
    def __init__(self):
        """Initialize the Qwen3-VL client"""
        self.api_key = settings.QWEN_API_KEY
        self.base_url = settings.QWEN_BASE_URL
        self.model = settings.QWEN_MODEL
        
        # Add diagnostic logging
        logger.info(f"DEBUG: API Key configured: {bool(self.api_key)}")
        logger.info(f"DEBUG: Base URL: {self.base_url}")
        logger.info(f"DEBUG: Model: {self.model}")
        
        if not self.api_key:
            raise ValueError("QWEN_API_KEY is not configured in settings")
        
        # Create httpx client to avoid proxies parameter issue
        # This fixes the compatibility issue between OpenAI and httpx
        http_client = DefaultHttpxClient()
        
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
            http_client=http_client
        )
        
        logger.info(f"QwenVLClient initialized with model: {self.model}")
    
    def analyze_image(self, base64_image: str, prompt: str) -> Optional[str]:
        """
        Send image and prompt to Qwen3-VL for analysis
        
        Args:
            base64_image: Base64 encoded image string
            prompt: Text prompt for the model
            
        Returns:
            Model response text or None if error occurs
        """
        try:
            start_time = time.time()

            # If OPENROUTER is configured, use its HTTP API (openrouter.ai compatible)
            openrouter_key = getattr(settings, 'OPENROUTER_API_KEY', None)
            openrouter_url = getattr(settings, 'OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1/chat/completions')
            model_name = getattr(settings, 'QWEN_MODEL', self.model)

            payload = {
                "model": model_name,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}},
                            {"type": "text", "text": prompt}
                        ]
                    }
                ]
            }

            if openrouter_key:
                headers = {
                    "Authorization": f"Bearer {openrouter_key}",
                    "Content-Type": "application/json",
                }
                # Optional headers from settings
                referer = getattr(settings, 'OPENROUTER_HTTP_REFERER', None)
                title = getattr(settings, 'OPENROUTER_X_TITLE', None)
                if referer:
                    headers['HTTP-Referer'] = referer
                if title:
                    headers['X-Title'] = title

                logger.info(f"DEBUG: Sending request to OpenRouter endpoint: {openrouter_url}")
                r = requests.post(openrouter_url, headers=headers, json=payload, timeout=60)
                duration = (time.time() - start_time) * 1000
                if r.status_code == 200:
                    # The OpenRouter/chat response structure mirrors OpenAI Chat completions
                    try:
                        resp_json = r.json()
                        # Safely navigate possible shapes
                        content = None
                        if 'choices' in resp_json and len(resp_json['choices']) > 0:
                            choice = resp_json['choices'][0]
                            # choice.message.content may be str or structured
                            msg = choice.get('message') or choice.get('delta') or {}
                            content = msg.get('content') if isinstance(msg, dict) else None
                        if content is None:
                            # Fallback: try top-level text
                            content = resp_json.get('choices', [{}])[0].get('message', {}).get('content')
                        logger.info(f"OpenRouter call completed successfully in {duration:.2f}ms")
                        return content
                    except Exception as e:
                        logger.error(f"Failed to decode OpenRouter JSON: {e}")
                        return None
                else:
                    logger.error(f"OpenRouter API Error: {r.status_code} - {r.text}")
                    return None

            # Fallback to OpenAI-compatible client if OpenRouter not configured
            messages = [{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}},
                    {"type": "text", "text": prompt}
                ]
            }]

            logger.info(f"DEBUG: Sending request to Qwen3-VL API via OpenAI client")
            response = self.client.chat.completions.create(
                model=model_name,
                messages=messages,
                max_tokens=4096,
                temperature=0.1
            )

            duration = (time.time() - start_time) * 1000
            result = response.choices[0].message.content
            logger.info(f"API call completed successfully in {duration:.2f}ms")
            return result

        except Exception as e:
            logger.error(f"Error calling Qwen3-VL API: {str(e)}")
            return None
    
    def health_check(self) -> bool:
        """
        Check if the API is accessible
        
        Returns:
            True if API is accessible, False otherwise
        """
        try:
            # Send a simple test request
            test_prompt = "Hello, can you respond with 'OK'?"
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": test_prompt}],
                max_tokens=10
            )
            
            return response.choices[0].message.content is not None
            
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return False


# LPR prompt template for license plate recognition
LPR_PROMPT = """You are a highly advanced License Plate Recognition Agent.
Your Goal: Detect and read ANY license plate in the image.

Key Directives:
1. **Detect Everything**: Look for license plates even if:
   - The image is a photo of a screen (phone/monitor).
   - The vehicle is only partially visible.
   - The image is blurry or dark.
   - It is a close-up of just the plate.

2. **Senegal Context**: Prioritize formats like "DK-1234-A" or "AA-123-BB". 

3. **Output Format**:
Respond ONLY with this JSON structure:
{
    "is_vehicle": true,
    "detections": [
        {
            "plate": {
                "confidence": 0.99,
                "coordinates": {"x1": 0, "y1": 0, "x2": 1000, "y2": 1000}
            },
            "ocr": [
                {
                    "text": "PLATE_NUMBER",
                    "confidence": 0.99
                }
            ]
        }
    ]
}

- If you see a plate, set "is_vehicle": true.
- "coordinates" are 0-1000 range.
- NO MARKDOWN. NO CONVERSATIONAL TEXT. ONLY RAW JSON."""


def convert_from_qwen2vl_format(bbox, original_h, original_w, resized_h=None, resized_w=None):
    """
    Convert coordinates from Qwen2VL format (0-1000) back to original image dimensions.
    This reverses the convert_to_qwen2vl_format function.
    
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
    # The key insight is that the 0-1000 range represents the original image aspect ratio
    # regardless of the actual resized dimensions sent to the API
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


def get_qwen_client() -> QwenVLClient:
    """
    Get a configured Qwen3-VL client instance
    
    Returns:
        QwenVLClient instance
    """
    return QwenVLClient()


def parse_lpr_response(response_text: str, original_h: Optional[int] = None, original_w: Optional[int] = None,
                       resized_h: Optional[int] = None, resized_w: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """
    Parse the LPR response from Qwen3-VL and scale coordinates back to original image dimensions
    
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
            scaled_bbox = convert_from_qwen2vl_format(bbox, original_h, original_w, resized_h, resized_w)
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
                        scaled_bbox = convert_from_qwen2vl_format(bbox, original_h, original_w, resized_h, resized_w)
                        coords['x1'], coords['y1'], coords['x2'], coords['y2'] = scaled_bbox
        elif isinstance(ocr_data, dict):
            for ocr_key in ocr_data:
                ocr_item = ocr_data[ocr_key]
                if isinstance(ocr_item, dict) and 'coordinates' in ocr_item:
                    coords = ocr_item['coordinates']
                    if all(key in coords for key in ['x1', 'y1', 'x2', 'y2']):
                        bbox = [coords['x1'], coords['y1'], coords['x2'], coords['y2']]
                        scaled_bbox = convert_from_qwen2vl_format(bbox, original_h, original_w, resized_h, resized_w)
                        coords['x1'], coords['y1'], coords['x2'], coords['y2'] = scaled_bbox