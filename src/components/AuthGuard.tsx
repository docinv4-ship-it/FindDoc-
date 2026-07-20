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

  useEffect(() => {
    setMounted(true);
    let isSubscribed = true;

    const initAuth = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (isSubscribed) setUser(currentUser ?? null);
      } catch (err) {
        console.error("AuthGuard session error:", err);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isSubscribed) {
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) setIsAuthenticating(false);
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

      const targetPath = typeof window !== "undefined"
        ? window.location.pathname + window.location.search + window.location.hash
        : currentPath || "/patient";

      const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(targetPath)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) throw error;
    } catch (err: unknown) {
      console.error("Google Auth error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Authentication failed.");
      setIsAuthenticating(false);
    }
  }, [currentPath, supabase]);

  if (!mounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
        <div className="h-8 w-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-600 animate-spin" />
      </div>
    );
  }

  if (user) {
    return <>{children}</>;
  }

  return (
    <div className="w-full max-w-md mx-auto my-12 p-8 bg-white rounded-3xl shadow-xl border border-gray-100 text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to DocFind</h2>
      <p className="text-sm text-gray-500 mb-6">Continue with Google to access your dashboard.</p>

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl text-left">
          {errorMessage}
        </div>
      )}

      <button
        onClick={handleGoogleLogin}
        disabled={isAuthenticating}
        className="w-full py-3 px-4 rounded-xl bg-gray-900 text-white font-medium text-sm hover:bg-black transition-all"
      >
        {isAuthenticating ? "Connecting..." : "Continue with Google"}
      </button>
    </div>
  );
}
