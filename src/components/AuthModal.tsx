"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { X, Loader2, Stethoscope, ArrowRight } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectPath?: string; // Custom redirect target (Default: "/patient")
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  redirectPath = "/patient" 
}: AuthModalProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  // Mount state check to prevent SSR hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard accessibility (Close on ESC) and background scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  // Handle Google OAuth Sign-In
  const handleGoogleLogin = async () => {
    try {
      setIsSigningIn(true);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Dynamic redirect targeting the project callback page
          redirectTo: `${window.location.origin}/auth/callback?next=${redirectPath}`,
        },
      });

      if (error) throw error;
    } catch (err) {
      console.error("Google authentication failed:", err);
      setIsSigningIn(false);
    }
  };

  // Handle "Skip for now" navigation
  const handleSkip = () => {
    onClose();
    router.push(redirectPath);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark backdrop with blur */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-2xl transition-all duration-300 scale-100 animate-scale-up border border-gray-100">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-[#36d1cf]/50"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Branding & Logo */}
        <div className="text-center mt-4 mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 border border-teal-100 mb-4 animate-bounce-short">
            <Stethoscope className="h-7 w-7 text-[#36d1cf]" />
          </div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight">Welcome to DocFind</h3>
          <p className="text-sm text-gray-500 mt-1.5 max-w-[280px] mx-auto">
            Find and book appointments with verified doctors in seconds.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3.5">
          {/* Continue with Google Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl shadow-sm hover:bg-gray-50 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {isSigningIn ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#36d1cf]" />
            ) : (
              // Official Google Flat Icon SVG
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
            )}
            <span>{isSigningIn ? "Connecting to Google..." : "Continue with Google"}</span>
          </button>

          {/* Skip for Now Button */}
          <button
            onClick={handleSkip}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-bold rounded-xl transition-all active:scale-[0.99] border border-transparent text-[#36d1cf] bg-teal-50/50 hover:bg-teal-50 active:bg-teal-100 disabled:opacity-50"
          >
            <span>Skip for now</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Info / Footer Disclaimer */}
        <div className="mt-6 text-center">
          <p className="text-[11px] text-gray-400">
            By continuing, you agree to our terms of service and secure patient privacy policies.
          </p>
        </div>
      </div>
    </div>
  );
}
