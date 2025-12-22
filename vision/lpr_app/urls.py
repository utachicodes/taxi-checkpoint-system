from django.urls import path

# Import views from their respective modules
from .views.api_views import (
    api_health_check, api_ocr_upload, metrics_view
)
from .views.file_views import download_image

app_name = 'lpr_app'

urlpatterns = [
    # API health check
    path('health/', api_health_check, name='health_check'),
    
    # REST API endpoints
    path('api/v1/ocr/', api_ocr_upload, name='api_ocr_upload'),
    
    # Prometheus metrics endpoint
    path('metrics/', metrics_view, name='metrics'),
    
    # Download images (used for proof in records)
    path('download/<int:image_id>/<str:image_type>/', download_image, name='download_image'),
]
