"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import Link from "next/link";
import { 
  User, 
  Clock, 
  FileText, 
  Shield, 
  HelpCircle, 
  LogOut, 
  ChevronRight,
  Mail
} from "lucide-react";

export default function PatientProfilePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
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
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-gray-400 font-medium text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        
        {/* Profile Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 border border-gray-100">
              <User size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Patient Profile</h1>
              <p className="text-gray-500 text-sm">Manage account settings</p>
            </div>
          </div>
        </div>

        {/* Account Details */}
        <section className="mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">Account</h2>
          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Email</span>
              <span className="font-medium text-gray-900">{user?.email}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Role</span>
              <span className="font-medium text-gray-900 capitalize">
                {(user?.user_metadata?.role as string) || "Patient"}
              </span>
            </div>
          </div>
        </section>

        {/* Activity Nav */}
        <section className="mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">Activity</h2>
          <nav className="space-y-2">
            {[
              { label: "Consultation History", icon: Clock },
              { label: "Medical Records", icon: FileText },
              { label: "Privacy & Security", icon: Shield },
            ].map((item) => (
              <button key={item.label} className="w-full flex items-center justify-between py-3 group hover:opacity-70 transition-opacity text-left">
                <div className="flex items-center gap-3">
                  <item.icon size={18} className="text-gray-400" />
                  <span className="font-medium text-gray-900">{item.label}</span>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </button>
            ))}
          </nav>
        </section>

        {/* Support Section */}
        <section className="pt-8 border-t border-gray-200">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">Help & Support</h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <HelpCircle size={20} className="text-[#36d1cf] mt-0.5" />
              <div>
                <h3 className="font-bold mb-1">Help Center</h3>
                <p className="text-sm text-gray-500 mb-3">Browse documentation and FAQs for instant answers.</p>
                <Link href="/support" className="text-sm font-bold text-[#36d1cf] hover:underline">
                  Visit Support →
                </Link>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Mail size={20} className="text-[#36d1cf] mt-0.5" />
              <div>
                <h3 className="font-bold mb-1">Contact Us</h3>
                <p className="text-sm text-gray-500">Need direct assistance? Email our support team anytime.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Sign Out */}
        <div className="mt-16 pt-8 border-t border-gray-100">
          <button 
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="flex items-center gap-2 text-red-600 font-bold hover:opacity-75 transition-opacity disabled:opacity-50"
          >
            <LogOut size={18} />
            {isLoggingOut ? "Signing Out..." : "Sign Out"}
          </button>
        </div>

      </div>
    </div>
  );
}
