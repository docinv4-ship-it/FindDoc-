"use client";

import { useEffect, useState, ReactNode, useCallback } from "react";
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

  // Handle Initial Session & Real-time Listener
  useEffect(() => {
    setMounted(true);
    let isSubscribed = true;

    const initAuth = async () => {
      try {
        const {
          data: { user: currentUser },
          error,
        } = await supabase.auth.getUser();

        if (error && error.status !== 401) {
          console.error("AuthGuard session fetch error:", error.message);
        }

        if (isSubscribed) {
          setUser(currentUser ?? null);
        }
      } catch (err) {
        console.error("Unexpected AuthGuard error:", err);
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isSubscribed) {
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          setIsAuthenticating(false);
        }
      }
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleGoogleLogin = useCallback(async () => {
    try {
      setIsAuthenticating(true);
      setErrorMessage(null);

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
          queryParams: {
            // FORCE GOOGLE TO DISPLAY ACCOUNT SELECTOR EVERY TIME
            prompt: "select_account",
            access_type: "offline",
          },
        },
      });

      if (error) throw error;
    } catch (err: unknown) {
      console.error("Google Auth initialization error:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Authentication failed. Please try again."
      );
      setIsAuthenticating(false);
    }
  }, [currentPath, supabase]);

  // SSR Hydration & Initial Loading Screen (Vercel Style Minimal Loader)
  if (!mounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] w-full p-8">
        <div className="relative flex items-center justify-center">
          <div className="h-10 w-10 rounded-full border-2 border-teal-500/20 border-t-teal-600 animate-spin" />
          <div className="absolute h-4 w-4 rounded-full bg-teal-500/20 animate-pulse" />
        </div>
        <p className="mt-4 text-[11px] font-semibold text-gray-400 uppercase tracking-widest animate-pulse">
          Authenticating Session...
        </p>
      </div>
    );
  }

  // Authenticated User -> Grant Instant Access
  if (user) {
    return <>{children}</>;
  }

  // Unauthenticated Fallback Card (Bolt.new / Vercel Aesthetic)
  return (
    <div className="w-full max-w-md mx-auto my-12 p-8 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-teal-900/5 border border-gray-100 text-center transition-all duration-300">
      {/* Icon Graphic */}
      <div className="relative mx-auto mb-6 w-16 h-16 flex items-center justify-center">
        <div className="absolute inset-0 bg-teal-500/10 rounded-2xl rotate-6 transition-transform group-hover:rotate-12" />
        <div className="relative z-10 w-16 h-16 bg-teal-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
      </div>

      <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-2">
        Sign in to DocFind
      </h2>
      <p className="text-sm text-gray-500 mb-8 leading-relaxed max-w-xs mx-auto">
        Access your medical appointments, chats, and records securely.
      </p>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-6 p-3.5 rounded-2xl bg-red-50 border border-red-100 text-xs text-red-600 font-medium text-left flex items-start gap-2.5">
          <svg
            className="w-4 h-4 text-red-500 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="leading-tight">{errorMessage}</span>
        </div>
      )}

      {/* OAuth Button */}
      <button
        onClick={handleGoogleLogin}
        disabled={isAuthenticating}
        className="group relative flex items-center justify-center w-full py-3.5 px-4 rounded-2xl bg-gray-900 text-white font-medium text-sm shadow-lg shadow-gray-900/10 transition-all duration-200 hover:bg-black hover:shadow-xl hover:shadow-gray-900/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isAuthenticating ? (
          <span className="flex items-center gap-2.5 text-gray-300">
            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Redirecting to Google...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-3">
            <svg className="w-4 h-4 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </span>
        )}
      </button>

      <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-[11px] font-medium text-gray-400">
        <svg className="w-3.5 h-3.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span>End-to-End Encrypted Healthcare Portal</span>
      </div>
    </div>
  );
}
