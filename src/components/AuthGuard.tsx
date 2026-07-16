"use client";

import { useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

interface AuthGuardProps {
  children: ReactNode;
  currentPath: string;
}

export default function AuthGuard({ children, currentPath }: AuthGuardProps) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
      } catch (err) {
        console.error("AuthGuard authentication check failed:", err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Live auth status change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Loading State with Premium Pulse Indicator
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-6">
        <div className="relative flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4fd1c5]"></div>
          <div className="absolute h-8 w-8 rounded-full bg-[#4fd1c5]/10 animate-ping"></div>
        </div>
        <p className="mt-4 text-xs font-semibold text-gray-400 uppercase tracking-wider animate-pulse">
          Securing Session...
        </p>
      </div>
    );
  }

  // Safe and Approved
  if (user) {
    return <>{children}</>;
  }

  const handleGoogleLogin = async () => {
    try {
      // 🔥 FIX: Pure currentPath drops all search/query parameters (doctor_id, clinic_id, etc.)
      // We capture window.location.pathname + window.location.search dynamically so params aren't lost after redirect!
      const fullRedirectPath = typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : currentPath;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(fullRedirectPath)}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Google Authentication Initialisation Error:", err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto my-14 bg-white rounded-2xl shadow-xl border border-gray-100 transition-all duration-300 hover:shadow-2xl">
      {/* Premium Seal Lock Graphic */}
      <div className="relative mb-6">
        <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center text-[#4fd1c5] relative z-10">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="absolute inset-0 bg-[#4fd1c5]/15 rounded-full scale-125 animate-pulse"></div>
      </div>

      <h2 className="text-2xl font-black text-gray-800 mb-2 tracking-tight">
        Verification Required
      </h2>
      <p className="text-gray-500 text-sm mb-8 leading-relaxed max-w-xs">
        Apne chat messages, appointments aur confidential medical records ko access karne ke liye 1-click Google sign-in karein.
      </p>

      {/* Modern High-Fidelity OAuth Button */}
      <button
        onClick={handleGoogleLogin}
        className="group relative flex items-center justify-center gap-3 w-full bg-[#1A73E8] text-white p-4 rounded-xl font-bold hover:bg-blue-600 active:scale-[0.98] transition-all duration-200 shadow-md hover:shadow-lg"
      >
        <div className="absolute left-4 bg-white p-2 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.99 5.99 0 0 1 8 12.527a5.99 5.99 0 0 1 5.99-5.99c2.41 0 4.417 1.554 5.16 3.703l3.968-3.078C20.912 3.805 17.733 2 13.99 2 8.163 2 3.4 6.763 3.4 12.59s4.763 10.59 10.59 10.59c5.827 0 10.59-4.763 10.59-10.59 0-.765-.082-1.503-.236-2.305H12.24z" />
          </svg>
        </div>
        <span className="pl-8 text-sm md:text-base">Continue with Google</span>
      </button>

      <span className="mt-5 text-[11px] text-gray-400 font-semibold tracking-wider uppercase">
        🔐 Protected by 256-Bit SSL Encryption
      </span>
    </div>
  );
}
