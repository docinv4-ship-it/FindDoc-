import { getToken } from "firebase/messaging";
import { getFirebaseMessaging } from "./firebase";
import { createClient } from "@/lib/supabase/client";

export async function requestAndSaveFCMToken(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("This browser does not support desktop notification");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission denied by user");
      return null;
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    // Register Service Worker explicitly
    const serviceWorkerRegistration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    const fcmToken = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY,
      serviceWorkerRegistration,
    });

    if (!fcmToken) {
      console.error("Failed to generate FCM Token");
      return null;
    }

    // Save token to Supabase user_fcm_tokens table
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase.from("user_fcm_tokens").upsert(
        {
          user_id: user.id,
          fcm_token: fcmToken,
          device_type: "web",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "fcm_token" }
      );

      if (error) {
        console.error("Error saving FCM Token to Supabase:", error);
      }
    }

    return fcmToken;
  } catch (error) {
    console.error("An error occurred while requesting FCM token:", error);
    return null;
  }
}
