"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, createContext, useContext } from "react";
import { DocFindSplashIcon } from "./DocFindIcon";

const SPLASH_SHOWN_KEY = "docfind-splash-shown";

interface PWAContextType {
  isReady: boolean;
}

const PWAContext = createContext<PWAContextType>({ isReady: false });

export function usePWA() {
  return useContext(PWAContext);
}

export default function PWAProvider({ children }: { children?: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("SW registration failed:", err);
      });
    }

    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true;

    const splashShown = sessionStorage.getItem(SPLASH_SHOWN_KEY);

    if (isStandalone && splashShown !== "true") {
      setShowSplash(true);
      sessionStorage.setItem(SPLASH_SHOWN_KEY, "true");

      // Visible for 500ms, then 200ms fade = 700ms total (within 0.5-0.8s range)
      const fadeTimer = setTimeout(() => setIsFading(true), 500);
      const completeTimer = setTimeout(() => {
        setShowSplash(false);
        setIsReady(true);
      }, 700);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(completeTimer);
      };
    } else {
      setIsReady(true);
    }
  }, []);

  return (
    <PWAContext.Provider value={{ isReady }}>
      {showSplash && (
        <div
          className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-200 ${
            isFading ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
          style={{
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
        >
          <style>{`
            @keyframes df-bloom {
              0% { transform: scale(0.6); opacity: 0; }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes df-petal-in {
              0% { transform: translateY(8px) scale(0.7); opacity: 0; }
              100% { transform: translateY(0) scale(1); opacity: 1; }
            }
            @keyframes df-center-in {
              0% { transform: scale(0); opacity: 0; }
              100% { transform: scale(1); opacity: 1; }
            }
          `}</style>
          <DocFindSplashIcon size={140} />
        </div>
      )}
      {children}
    </PWAContext.Provider>
  );
}
