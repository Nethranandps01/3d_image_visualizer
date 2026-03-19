# Object Measurement App

A production-ready mobile app that measures real-world object dimensions using computer vision. Place objects on an A4 paper, take a photo, and get precise measurements in centimeters.

## How It Works

1. **Reference Detection**: Detects the A4 paper (210mm × 297mm) in your photo
2. **Perspective Correction**: Applies transformation for accurate bird's-eye view
3. **Object Detection**: Finds rectangular objects on the paper
4. **Measurement**: Calculates real dimensions using the A4 reference scale

## Project Structure

```
object-measure-app/
├── backend/           # FastAPI backend with OpenCV
│   ├── app/
│   │   ├── main.py           # FastAPI application
│   │   ├── routes/           # API endpoints
│   │   ├── models/           # Pydantic schemas
│   │   └── utils/            # Image processing
│   ├── requirements.txt
│   └── README.md
│
├── frontend/          # React + Ionic mobile app
│   ├── src/
│   │   ├── pages/            # UI pages
│   │   ├── services/         # API & camera services
│   │   └── theme/            # Styling
│   ├── capacitor.config.json
│   └── README.md
│
└── README.md
```

## Quick Start

### 1. Start Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 2. Start Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

App available at: http://localhost:3000

### 3. Build Android APK

```bash
cd frontend

# Build web assets
npm run build

# Add Android platform (first time)
npx cap add android

# Sync to Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

In Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)**

## Deploy Backend to Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repository
3. Set root directory to `backend`
4. Configure:
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variable:
   - `ALLOWED_ORIGINS`: Your frontend URLs (comma-separated)

## Configure Frontend for Production

Update `frontend/.env.local`:
```env
VITE_API_URL=https://your-app.onrender.com
```

Then rebuild and sync:
```bash
npm run build && npx cap sync android
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/measure` | Upload image file for measurement |
| POST | `/api/v1/measure/base64` | Send base64 image for measurement |
| GET | `/health` | Health check |

## Requirements

### Backend
- Python 3.11+
- OpenCV
- FastAPI

### Frontend
- Node.js 18+
- Android Studio (for APK build)
- Java JDK 17+

## Tips for Best Results

1. Use a **white A4 paper** on a contrasting surface
2. Ensure **good, even lighting** (avoid shadows)
3. Keep the **entire paper visible** in the frame
4. Place objects **flat on the paper**
5. Objects should be **rectangular** for best accuracy
6. Take photo from **directly above** when possible

## Tech Stack

- **Backend**: FastAPI, OpenCV, Python
- **Frontend**: React, Ionic Framework, TypeScript
- **Mobile**: Capacitor (Android/iOS)
- **Deployment**: Render (backend)
