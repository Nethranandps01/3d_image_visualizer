# Object Measurement API - Backend

FastAPI backend for measuring real-world object dimensions using computer vision.

## Quick Start

### Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run the server
uvicorn app.main:app --reload --port 8000
```

### API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Deploy to Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Configure:
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables:
   - `ALLOWED_ORIGINS`: Your frontend URL(s)

## API Endpoints

### POST /api/v1/measure
Upload an image file for measurement.

### POST /api/v1/measure/base64
Send base64 encoded image for measurement.

### GET /health
Health check endpoint.

## How It Works

1. Detects A4 paper (210mm × 297mm) in the image
2. Applies perspective transformation for bird's eye view
3. Detects rectangular objects on the paper
4. Calculates real-world dimensions using A4 as reference
5. Returns measurements in centimeters with annotated image
