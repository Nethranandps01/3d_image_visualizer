# Object Measurement App - Frontend

React + Ionic frontend for measuring real-world object dimensions using your phone camera.

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit http://localhost:3000

### Environment Variables

Create `.env.local` file:
```env
VITE_API_URL=http://localhost:8000  # Your backend URL
```

## Build for Production

```bash
npm run build
```

## Build Android APK with Capacitor

### Prerequisites
- Android Studio installed
- Android SDK configured
- Java JDK 17+

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Build the web app
npm run build

# 3. Add Android platform (first time only)
npx cap add android

# 4. Sync web assets to Android
npx cap sync android

# 5. Open in Android Studio
npx cap open android
```

### In Android Studio:
1. Wait for Gradle sync to complete
2. Go to **Build > Generate Signed Bundle / APK**
3. Select **APK**
4. Create or select a keystore
5. Choose **release** build variant
6. Build!

### Quick Debug APK (unsigned)
```bash
npx cap run android
```

Or in Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)**

## Updating After Code Changes

```bash
npm run build && npx cap sync android
```

## Project Structure

```
src/
├── App.tsx              # Main app component
├── main.tsx             # Entry point
├── pages/
│   └── HomePage.tsx     # Main measurement page
├── services/
│   ├── api.ts           # Backend API calls
│   └── camera.ts        # Camera/gallery functions
└── theme/
    ├── variables.css    # Ionic theme variables
    └── global.css       # Global styles
```

## Features

- Camera capture with Capacitor Camera plugin
- Gallery image selection
- Real-time measurement processing
- Annotated result images
- Dark mode support
- Pull-to-refresh
