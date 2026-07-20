"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

export default function PatientProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    }
    loadUser();
  }, [supabase]);

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      // Hard navigation to force clear all server/client cookie states
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-medium">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between pb-6 border-b border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patient Profile</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your personal details and account settings.
            </p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 focus:outline-none disabled:opacity-50"
          >
            {isLoggingOut ? "Signing Out..." : "Sign Out"}
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Email Address
            </span>
            <p className="mt-1 font-medium text-gray-800">{user?.email}</p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Account Role
            </span>
            <p className="mt-1 font-medium text-gray-800 capitalize">
              {(user?.user_metadata?.role as string) || "patient"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
