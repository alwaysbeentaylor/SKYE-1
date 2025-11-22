# SKYE - Deployment Guide

## Stap 1: Firebase Setup

1. Ga naar https://console.firebase.google.com
2. Maak een nieuw project aan: "SKYE"
3. Enable **Authentication** → Email/Password
4. Enable **Firestore Database** → Start in test mode → Kies locatie (europe-west)
5. Enable **Cloud Messaging** → Generate VAPID key
6. Kopieer je Firebase config uit Project Settings → Your apps → Web app

## Stap 2: Environment Variables

Maak een `.env` bestand in de root (kopieer van `.env.example`):

```env
VITE_FIREBASE_API_KEY=je-api-key
VITE_FIREBASE_AUTH_DOMAIN=je-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=je-project-id
VITE_FIREBASE_STORAGE_BUCKET=je-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef
VITE_FIREBASE_VAPID_KEY=je-vapid-key
VITE_SOCKET_URL=http://localhost:3001
```

## Stap 3: GitHub Setup

1. Maak een nieuwe repository op GitHub (bijv. "skye-app")
2. Push je code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/jouw-username/skye-app.git
   git push -u origin main
   ```

## Stap 4: Backend Deployment (Render.com)

1. Ga naar https://render.com en maak account
2. Klik "New" → "Web Service"
3. Connect je GitHub repository
4. Settings:
   - **Name:** skye-backend
   - **Root Directory:** server
   - **Environment:** Node
   - **Build Command:** npm install
   - **Start Command:** node server.js
5. Klik "Create Web Service"
6. Wacht tot deployment klaar is
7. Kopieer de URL (bijv. `https://skye-backend.onrender.com`)

## Stap 5: Frontend Deployment (Vercel)

1. Ga naar https://vercel.com en maak account
2. Klik "Import Project"
3. Kies je GitHub repository
4. Vercel detecteert automatisch Vite
5. Voeg Environment Variables toe:
   - `VITE_FIREBASE_API_KEY` = (van Firebase)
   - `VITE_FIREBASE_AUTH_DOMAIN` = ...
   - `VITE_FIREBASE_PROJECT_ID` = ...
   - `VITE_FIREBASE_STORAGE_BUCKET` = ...
   - `VITE_FIREBASE_MESSAGING_SENDER_ID` = ...
   - `VITE_FIREBASE_APP_ID` = ...
   - `VITE_FIREBASE_VAPID_KEY` = ...
   - `VITE_SOCKET_URL` = (je Render backend URL)
6. Klik "Deploy"
7. Wacht tot deployment klaar is

## Stap 6: Testen

1. Open je Vercel URL op je telefoon
2. Test de app functionaliteit
3. Voor PWA installatie: Klik "Add to Home Screen" in je browser menu

## Troubleshooting

- **Backend niet bereikbaar:** Check of Render service "Live" is
- **Firebase errors:** Check of alle env vars correct zijn in Vercel
- **Socket connection fails:** Check of VITE_SOCKET_URL correct is (moet HTTPS zijn voor productie)


