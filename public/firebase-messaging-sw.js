importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// Extract config params dynamically passed during service worker registration
const locationParams = new URLSearchParams(self.location.search);

const firebaseConfig = {
  apiKey: locationParams.get("apiKey") || "",
  authDomain: locationParams.get("authDomain") || "",
  projectId: locationParams.get("projectId") || "",
  storageBucket: locationParams.get("storageBucket") || "",
  messagingSenderId: locationParams.get("messagingSenderId") || "",
  appId: locationParams.get("appId") || "",
};

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw.js] Received background message:", payload);

    const notificationTitle = payload.notification?.title || "DocFind Notification";
    const notificationOptions = {
      body: payload.notification?.body || "You have a new update.",
      icon: "/icon.png",
      badge: "/badge.png",
      data: payload.data || {},
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}
