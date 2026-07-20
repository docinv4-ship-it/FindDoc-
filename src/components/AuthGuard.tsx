"use client";

import { useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

interface AuthGuardProps {
  children: ReactNode;
  currentPath?: string;
}

export default function AuthGuard({ children, currentPath }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    let isSubscribed = true;

    const checkAuth = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (isSubscribed) {
          setUser(currentUser);
        }
      } catch (err) {
        console.error("AuthGuard session verification failed:", err);
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    // Real-time Auth State Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isSubscribed) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleGoogleLogin = async () => {
    try {
      setIsAuthenticating(true);
      setErrorMessage(null);

      // Dynamically preserve full pathname, query params, and hash tags
      const targetPath =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search + window.location.hash
          : currentPath || "/patient";

      const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        targetPath
      )}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) throw error;
    } catch (err: unknown) {
      console.error("Google Auth initialization error:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Authentication process failed. Please try again."
      );
      setIsAuthenticating(false);
    }
  };

  // SSR Hydration & Initial Loading Protection
  if (!mounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] w-full p-8">
        <div className="relative flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-2 border-teal-500/20 border-t-teal-500 animate-spin" />
          <div className="absolute h-6 w-6 rounded-full bg-teal-500/10 animate-ping" />
        </div>
        <p className="mt-4 text-xs font-semibold text-gray-400 uppercase tracking-widest animate-pulse">
          Securing Session...
        </p>
      </div>
    );
  }

  // Authenticated User -> Grant Access
  if (user) {
    return <>{children}</>;
  }

  // Unauthenticated Fallback Screen
  return (
    <div className="w-full max-w-md mx-auto my-12 p-8 bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 text-center transition-all duration-300 hover:shadow-2xl">
      {/* Security Seal Lock Graphic */}
      <div className="relative mx-auto mb-6 w-20 h-20 flex items-center justify-center">
        <div className="absolute inset-0 bg-teal-500/10 rounded-full animate-ping opacity-75" />
        <div className="relative z-10 w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center text-teal-600 border border-teal-100">
          <svg
            className="w-10 h-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">
        Verification Required
      </h2>
      <p className="text-sm text-gray-500 mb-6 leading-relaxed max-w-xs mx-auto">
        Apne chat messages, appointments aur confidential medical records ko access karne ke liye 1-click Google sign-in karein.
      </p>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600 font-medium text-left flex items-start gap-2">
          <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* High-Fidelity OAuth Action Button */}
      <button
        onClick={handleGoogleLogin}
        disabled={isAuthenticating}
        className="group relative flex items-center justify-center w-full py-3.5 px-4 rounded-2xl bg-white border border-gray-300 text-gray-700 font-semibold text-sm shadow-sm transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isAuthenticating ? (
          <span className="flex items-center gap-2 text-gray-600">
            <svg className="animate-spin h-5 w-5 text-gray-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Connecting to Google...
          </span>
        ) : (
          <>
            <svg className="w-5 h-5 absolute left-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="pl-6">Continue with Google</span>
          </>
        )}
      </button>

      <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
        <svg className="w-3.5 h-3.5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span>Protected by 256-Bit Enterprise Encryption</span>
      </div>
    </div>
  );
}
