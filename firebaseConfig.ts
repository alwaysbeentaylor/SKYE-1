import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

// REPLACE WITH YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB-PLACEHOLDER",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "skye-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "skye-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "skye-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const requestNotificationPermission = async (uid: string) => {
    try {
      const supported = await isSupported();
      if (!supported) {
          return null;
      }
      
      // Skip FCM if service worker registration fails - not critical for MVP
      // The app will use browser notifications instead
      const messaging = getMessaging(app);
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        try {
          const token = await getToken(messaging, { 
              vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY 
          });
          console.log('FCM Token:', token);
          return token;
        } catch (fcmError: any) {
          // FCM failed, but browser notifications still work
          console.log('FCM registration skipped, using browser notifications');
          return null;
        }
      }
    } catch (error: any) {
      // Silently fail - notifications are optional
      // Browser notifications will still work via Notification API
    }
    return null;
};

