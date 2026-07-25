import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

// Aapki Firebase config yahan aayegi (Environment variables se)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase securely (Singleton pattern)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const requestForToken = async () => {
  try {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const messaging = getMessaging(app);
      
      // Request Permission from User explicitly
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        // VAPID KEY zaroori hai Push notifications ke liye (Firebase Console se milta hai)
        const currentToken = await getToken(messaging, { 
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY 
        });
        
        if (currentToken) {
          return currentToken;
        } else {
          console.warn("No registration token available. Request permission to generate one.");
          return null;
        }
      } else {
        console.warn("Notification permission denied by user.");
        return null;
      }
    }
  } catch (error) {
    console.error("An error occurred while retrieving token:", error);
    return null;
  }
};
