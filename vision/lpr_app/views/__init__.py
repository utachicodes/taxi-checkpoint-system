"""
Views module for LPR app.

This module provides focused imports for the microservice architecture.
The actual views are organized into separate modules for better maintainability.
"""

# Import api and file views
from .api_views import *
from .file_views import *

# Maintain backward compatibility with existing imports
__all__ = [
    # API views
    'api_health_check',
    'api_ocr_upload',
    'upload_progress',
    'metrics_view',
    
    # File views
    'download_image',
]
