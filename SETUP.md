# TaxiGuard Platform Setup Guide

This guide will help you set up and run the complete TaxiGuard platform, including the Next.js frontend, Django vision backend, and camera bridge.

## System Architecture

The TaxiGuard platform consists of three main components:

1. **Next.js Frontend** (Port 3000) - Operator and admin dashboards
2. **Django Vision Backend** (Port 8000) - License plate recognition API
3. **Camera Bridge** - Connects physical cameras to the vision API

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.8+
- **Git**
- **Supabase Account** (for database)
- **Qwen API Key** or local Ollama instance (for vision AI)

## Installation Steps

### 1. Clone and Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Set up Python virtual environment for Django backend
cd vision
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

cd ..
```

### 2. Configure Environment Variables

#### Next.js Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and configure:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VISION_API_URL=http://localhost:8000
```

#### Django Vision Backend Configuration

```bash
cd vision
cp .env.example .env
```

Edit `vision/.env` and configure:

```env
SECRET_KEY=generate-a-random-secret-key
DEBUG=true
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# AI Vision Configuration
QWEN_API_KEY=your_qwen_api_key
QWEN_BASE_URL=https://ollama.computedsynergy.com/v1
QWEN_MODEL=qwen3-vl-4b-instruct

# Supabase Integration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Get these IDs from your Supabase database
EXTERNAL_CHECKPOINT_ID=uuid-from-checkpoints-table
EXTERNAL_OPERATOR_ID=uuid-from-operators-table
```

### 3. Set Up Supabase Database

Run the SQL migration scripts in your Supabase SQL editor (in order):

1. `scripts/001_initial_schema.sql` - Creates core tables
2. `scripts/002_add_operators.sql` - Adds operator management
3. `scripts/003_add_payments.sql` - Adds payment tracking
4. `scripts/004_seed_test_vehicles.sql` - Adds test data

### 4. Initialize Django Backend

```bash
cd vision

# Run migrations
python manage.py migrate

# Create Django superuser (optional, for admin panel)
python manage.py createsuperuser

# Test the server
python manage.py runserver
```

Visit `http://localhost:8000/health/` to verify the backend is running.

### 5. Create Admin Account

Use the create_admin.mjs script:

```bash
node scripts/create_admin.mjs
```

Follow the prompts to create your first admin account.

## Running the Platform

### Option 1: Run All Services Together (Recommended)

```bash
npm run dev:all
```

This starts:
- Next.js frontend on `http://localhost:3000`
- Django vision API on `http://localhost:8000`

### Option 2: Run Services Individually

**Terminal 1 - Next.js Frontend:**
```bash
npm run dev
```

**Terminal 2 - Django Vision Backend:**
```bash
npm run dev:vision
# OR manually:
cd vision && python manage.py runserver 0.0.0.0:8000
```

**Terminal 3 - Camera Bridge (Optional):**
```bash
npm run dev:camera
# OR manually:
python edge/camera_bridge.py --api http://localhost:8000/api/v1/ocr/ --loc "Development Station"
```

### Option 3: Full System with Camera

```bash
npm run dev:full
```

This runs all three components simultaneously.

## Testing the System

### 1. Test Frontend Authentication

1. Navigate to `http://localhost:3000`
2. Click "Login" or go to `http://localhost:3000/auth/login`
3. Log in with your admin credentials
4. You should be redirected to the admin dashboard

### 2. Test Vision API

Send a test image to the API:

```bash
curl -X POST http://localhost:8000/api/v1/ocr/ \
  -F "image=@path/to/test-image.jpg" \
  -F "location=Test Station"
```

### 3. Test Camera Bridge

List available cameras:

```bash
python edge/camera_bridge.py --list
```

Run the bridge with a specific camera:

```bash
python edge/camera_bridge.py \
  --api http://localhost:8000/api/v1/ocr/ \
  --cam 0 \
  --loc "Test Checkpoint" \
  --int 5 \
  --show-window
```

Press `q` to quit the preview window.

## Camera Bridge Options

```bash
python edge/camera_bridge.py \
  --api <api_url>              # Vision API endpoint
  --cam <camera_index>         # Camera device index (default: 0)
  --loc <location_name>        # Checkpoint location name
  --int <seconds>              # Capture interval (default: 5)
  --save-frames                # Save captured frames locally
  --show-window                # Show camera preview window
  --local-yolo                 # Use local YOLOv8 for vehicle detection
  --local-llm                  # Use local LLM for plate recognition
  --send-every <N>             # Send to API every N frames
  --min-confidence <0-1>       # Minimum detection confidence
```

## Troubleshooting

### "Module not found" Errors

```bash
# Reinstall dependencies
npm install
cd vision && pip install -r requirements.txt
```

### Camera Not Detected

```bash
# List available cameras
python edge/camera_bridge.py --list

# Try different camera indices
python edge/camera_bridge.py --cam 1
```

### Django Database Locked

```bash
# Stop all Django processes and restart
cd vision
rm db.sqlite3
python manage.py migrate
```

### Authentication Not Working

Ensure `middleware.ts` exists in the root directory (not `proxy.ts`). The file should be:

```
taxi-checkpoint-system/
├── middleware.ts  ✓ (not proxy.ts)
├── app/
├── lib/
└── ...
```

### Supabase Connection Issues

1. Verify your Supabase URL and keys in `.env.local`
2. Check that RLS (Row Level Security) policies allow access
3. Verify the service role key has the necessary permissions

### Vision API Errors

1. Check that Django is running: `http://localhost:8000/health/`
2. Verify your Qwen API key is valid
3. Check `vision/django.log` for detailed error messages

## Project Structure

```
taxi-checkpoint-system/
├── app/                    # Next.js pages and routes
├── components/             # React components
├── lib/                    # Shared libraries
│   ├── actions/           # Server actions
│   ├── supabase/          # Supabase clients
│   └── types.ts           # TypeScript types
├── edge/                   # Camera bridge
│   └── camera_bridge.py
├── vision/                 # Django vision backend
│   ├── lpr_app/           # Main Django app
│   ├── lpr_project/       # Django settings
│   └── manage.py
├── scripts/                # Database migrations
├── middleware.ts           # Authentication middleware
└── package.json
```

## Next Steps

1. Configure your Supabase tables with real data
2. Set up physical cameras at checkpoints
3. Deploy to production (see `DEPLOYMENT.md`)
4. Monitor system health via `/metrics` endpoint

## Support

For issues or questions:
- Check existing documentation
- Review server logs: `vision/django.log`
- Verify environment variables are correct
