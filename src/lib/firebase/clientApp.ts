import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase Securely (Singleton pattern)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Aapki Firebase VAPID Key (Fallback ke sath taake Vercel par missing na ho)
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "BEJVqCFB7sE0k2CFepBSWaImTJFCrGOX86BsgvOW2ANG5EfUBO50Nq3_dVSkYTnMD93d-iOTsSnY_X15xU3_vW8";

export const requestForToken = async () => {
  try {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      
      // 1. Explicitly Service Worker Register karein
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

      // 2. Request Permission
      const permission = await Notification.requestPermission();
      
      if (permission === "granted") {
        const messaging = getMessaging(app);

        // 3. Service Worker Registration ke sath Token Request Karein
        const currentToken = await getToken(messaging, { 
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration 
        });

        if (currentToken) {
          return currentToken;
        } else {
          console.warn("No registration token available.");
          return null;
        }
      } else {
        console.warn("Notification permission denied by user.");
        return null;
      }
    }
  } catch (error) {
    console.error("An error occurred while retrieving token:", error);
    throw error; // Throwing error so UI catches real message
  }
};
