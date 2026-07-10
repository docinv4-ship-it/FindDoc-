"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { DocFindSplashIcon } from "./DocFindIcon";

const SPLASH_KEY = "docfind-splash-shown";

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const splashShown = sessionStorage.getItem(SPLASH_KEY);

    if (splashShown === "true") {
      setIsVisible(false);
      onComplete();
      return;
    }

    sessionStorage.setItem(SPLASH_KEY, "true");

    // 500ms visible + 200ms fade = 700ms total (within 0.5-0.8s range)
    const showTimer = setTimeout(() => setIsFading(true), 500);
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 700);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [onComplete]);

  if (!isVisible) return null;

  return (
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
  );
}

export function useSplashScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(display-mode: standalone)").matches ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window.navigator as any).standalone === true);

    if (!isStandalone) {
      setShowSplash(false);
      setIsReady(true);
      return;
    }

    const splashShown = sessionStorage.getItem(SPLASH_KEY);
    if (splashShown === "true") {
      setShowSplash(false);
      setIsReady(true);
    }
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
    setIsReady(true);
  };

  return { showSplash, isReady, handleSplashComplete };
}
