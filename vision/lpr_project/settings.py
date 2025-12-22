import os
from pathlib import Path
from decouple import config

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-me-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=lambda v: [s.strip() for s in v.split(',')])

# CSRF Trusted Origins for cross-origin requests
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default='http://localhost:3000', cast=lambda v: [s.strip() for s in v.split(',') if s.strip()])

# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
CORS_ALLOW_CREDENTIALS = True

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'lpr_app',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'lpr_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'lpr_project.wsgi.application'

# Database
# Use environment variable for database location, fallback to project root
DATABASE_PATH = config('DATABASE_PATH', default=str(BASE_DIR / 'db.sqlite3'), cast=str)
DATABASE_DIR = Path(DATABASE_PATH).parent
LOG_DIR = DATABASE_DIR

# Ensure directories exist
if not DATABASE_DIR.exists():
    os.makedirs(DATABASE_DIR)

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': DATABASE_PATH,
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Ensure static directory exists for development
if not os.path.exists('/app'):
    # Development environment - ensure lpr_app/static directory exists
    static_app_dir = BASE_DIR / 'lpr_app' / 'static'
    os.makedirs(static_app_dir, exist_ok=True)

STATICFILES_DIRS = [
    BASE_DIR / 'lpr_app' / 'static',
]

# Media files (Uploaded images)
MEDIA_URL = '/media/'
# Use environment variable for media location, fallback to project root
MEDIA_ROOT = str(config('MEDIA_PATH', default=str(BASE_DIR / 'media'), cast=str))

# Ensure media directory exists
MEDIA_DIR = Path(MEDIA_ROOT)
if not MEDIA_DIR.exists():
    os.makedirs(MEDIA_DIR)

# File upload settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 250 * 1024  # 250KB
DATA_UPLOAD_MAX_MEMORY_SIZE = 250 * 1024  # 250KB
UPLOAD_FILE_MAX_SIZE = 250 * 1024  # 250KB

# Allowed file types for upload
ALLOWED_IMAGE_TYPES = ['jpeg', 'jpg', 'png', 'webp']

# TaxiGuard Vision: API Configuration
QWEN_API_KEY = config('QWEN_API_KEY', default='')
QWEN_BASE_URL = config('QWEN_BASE_URL', default='https://ollama.computedsynergy.com/v1')
QWEN_MODEL = config('QWEN_MODEL', default='qwen3-vl-4b-instruct')

# OpenRouter / OpenRouter.ai configuration (optional)
OPENROUTER_API_KEY = config('OPENROUTER_API_KEY', default='')
OPENROUTER_BASE_URL = config('OPENROUTER_BASE_URL', default='https://openrouter.ai/api/v1/chat/completions')
# Optional headers for OpenRouter requests
OPENROUTER_HTTP_REFERER = config('OPENROUTER_HTTP_REFERER', default='')
OPENROUTER_X_TITLE = config('OPENROUTER_X_TITLE', default='')

# TaxiGuard Core: Supabase Configuration
SUPABASE_URL = config('SUPABASE_URL', default='')
SUPABASE_SERVICE_ROLE_KEY = config('SUPABASE_SERVICE_ROLE_KEY', default='')
EXTERNAL_CHECKPOINT_ID = config('EXTERNAL_CHECKPOINT_ID', default='')
EXTERNAL_OPERATOR_ID = config('EXTERNAL_OPERATOR_ID', default='')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Security settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Email settings (for error notifications, optional)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Logging configuration

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': LOG_DIR / 'django.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'lpr_app': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}
# Canary Configuration
CANARY_ENABLED = config('CANARY_ENABLED', default='true', cast=bool)
CANARY_HEADER_NAME = config('CANARY_HEADER_NAME', default='X-Canary-Request')
CANARY_HEADER_VALUE = config('CANARY_HEADER_VALUE', default='random-string-not-known-outside')
CANARY_INTERVAL = config('CANARY_INTERVAL', default='900', cast=int)
