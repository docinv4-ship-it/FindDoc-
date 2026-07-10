"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, Clock, X } from "lucide-react";

const SESSION_TIMEOUT_MINUTES = 30; // Configurable session timeout
const WARNING_BEFORE_MINUTES = 5; // Show warning 5 minutes before timeout
const EXTEND_BY_MINUTES = 15; // Extend session by 15 minutes on activity

interface SessionTimeoutProviderProps {
  children: React.ReactNode;
}

export default function SessionTimeoutProvider({ children }: SessionTimeoutProviderProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  const extendSession = useCallback(async () => {
    try {
      await supabase.auth.refreshSession();
      setLastActivity(Date.now());
      setShowWarning(false);
    } catch (err) {
      console.error("Error extending session:", err);
    }
  }, [supabase]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/doctor/login?message=session_expired";
    } catch (err) {
      console.error("Error logging out:", err);
    }
  }, [supabase]);

  useEffect(() => {
    setMounted(true);

    // Track user activity
    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    // Listen for user activity
    const activityEvents = ["mousedown", "keydown", "touchstart", "scroll"];
    activityEvents.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Check session every minute
    const interval = setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - lastActivity;
      const inactiveMinutes = inactiveTime / (1000 * 60);

      // Check if user is still signed in
      supabase.auth.getSession().then(({ data }: { data: { session: unknown } }) => {
        if (!data.session && inactiveMinutes > SESSION_TIMEOUT_MINUTES) {
          logout();
          return;
        }
      });

      // Get time remaining
      const timeRemainingMs = SESSION_TIMEOUT_MINUTES * 60 * 1000 - inactiveTime;
      const timeRemainingMins = Math.ceil(timeRemainingMs / (1000 * 60));

      setTimeRemaining(timeRemainingMins);

      // Show warning if within threshold
      if (inactiveMinutes >= (SESSION_TIMEOUT_MINUTES - WARNING_BEFORE_MINUTES)) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }

      // Auto logout if exceeded
      if (inactiveMinutes >= SESSION_TIMEOUT_MINUTES) {
        logout();
      }
    }, 60000); // Check every minute

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(interval);
    };
  }, [lastActivity, supabase, logout]);

  if (!mounted) return <>{children}</>;

  return (
    <>
      {children}
      {showWarning && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-white rounded-xl shadow-lg border border-amber-200 overflow-hidden">
          <div className="bg-amber-50 p-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-gray-900 text-sm">Session Expiring Soon</p>
              <p className="text-xs text-gray-600 mt-1">
                Your session will expire in {timeRemaining} minute{timeRemaining !== 1 ? "s" : ""} due to inactivity.
              </p>
            </div>
            <button
              onClick={() => setShowWarning(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 border-t border-amber-100 flex gap-2">
            <button
              onClick={extendSession}
              className="flex-1 py-2 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2"
              style={{ backgroundColor: "#36d1cf" }}
            >
              <Clock className="w-4 h-4" /> Stay Signed In
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-50 rounded-lg border border-gray-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
