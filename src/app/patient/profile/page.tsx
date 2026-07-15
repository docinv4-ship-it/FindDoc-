"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, User, Home, Search, Calendar, Bell, Stethoscope, Mail, Phone, Shield, LogOut } from "lucide-react";

export default function PatientProfilePage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push("/login"); // Redirect to login if unauthorized
      } else {
        setUser(user);
      }
      setLoading(false);
    };
    fetchUser();
  }, [supabase, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-12">
      {/* Desktop Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
              <Stethoscope className="w-8 h-8" style={{ color: "#36d1cf" }} />
              <span className="text-xl font-bold text-gray-900">DocFind</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => router.push("/")} className="text-sm font-semibold text-gray-600 hover:text-[#36d1cf] transition-colors">Home</button>
              <button onClick={() => router.push("/patient")} className="text-sm font-semibold text-gray-600 hover:text-[#36d1cf] transition-colors">Find Doctors</button>
              <button onClick={() => router.push("/patient/favorites")} className="text-sm font-semibold text-gray-600 hover:text-[#36d1cf] transition-colors">Favorites</button>
              <button onClick={() => router.push("/patient/chats")} className="text-sm font-semibold text-gray-600 hover:text-[#36d1cf] transition-colors">Chats</button>
              <button onClick={() => router.push("/patient/appointments")} className="text-sm font-semibold text-gray-600 hover:text-[#36d1cf] transition-colors">Appointments</button>
              <button onClick={() => router.push("/patient/profile")} className="flex items-center gap-1 text-sm font-semibold text-[#36d1cf] transition-colors border-b-2 border-[#36d1cf] pb-1">
                <User className="w-4 h-4" /> Account
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Profile Area */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h1>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* User Header Info Card */}
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#e6faf9] flex items-center justify-center text-[#36d1cf]">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{user?.user_metadata?.full_name || "Patient User"}</h2>
              <p className="text-sm text-gray-500">Patient Account</p>
            </div>
          </div>

          {/* Details list */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 py-2 border-b border-gray-50">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Email Address</p>
                <p className="text-sm text-gray-900 font-medium">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 py-2 border-b border-gray-50">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Phone Number</p>
                <p className="text-sm text-gray-900 font-medium">{user?.phone || "Not Provided"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 py-2">
              <Shield className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Account Status</p>
                <p className="text-sm text-emerald-600 font-bold">Active Patient</p>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button 
              onClick={handleSignOut} 
              className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-lg text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" /> Log Out
            </button>
          </div>
        </div>
      </main>

      {/* Synchronized Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 flex justify-between items-center z-50 shadow-lg">
        <button onClick={() => router.push("/")} className="flex flex-col items-center gap-1 bg-transparent border-0">
          <Home className="w-5 h-5" style={{ color: pathname === "/" ? "#36d1cf" : "#9ca3af" }} />
          <span className="text-[10px] font-medium" style={{ color: pathname === "/" ? "#36d1cf" : "#9ca3af" }}>Home</span>
        </button>

        <button onClick={() => router.push("/patient")} className="flex flex-col items-center gap-1 bg-transparent border-0">
          <Search className="w-5 h-5" style={{ color: pathname === "/patient" ? "#36d1cf" : "#9ca3af" }} />
          <span className="text-[10px] font-medium" style={{ color: pathname === "/patient" ? "#36d1cf" : "#9ca3af" }}>Find</span>
        </button>

        <button onClick={() => router.push("/patient/appointments")} className="flex flex-col items-center gap-1 bg-transparent border-0">
          <Calendar className="w-5 h-5" style={{ color: pathname?.includes("/appointments") ? "#36d1cf" : "#9ca3af" }} />
          <span className="text-[10px] font-medium" style={{ color: pathname?.includes("/appointments") ? "#36d1cf" : "#9ca3af" }}>Bookings</span>
        </button>

        <button onClick={() => router.push("/patient/notifications")} className="flex flex-col items-center gap-1 bg-transparent border-0">
          <Bell className="w-5 h-5" style={{ color: pathname?.includes("/notifications") ? "#36d1cf" : "#9ca3af" }} />
          <span className="text-[10px] font-medium" style={{ color: pathname?.includes("/notifications") ? "#36d1cf" : "#9ca3af" }}>Alerts</span>
        </button>

        <button onClick={() => router.push("/patient/profile")} className="flex flex-col items-center gap-1 bg-transparent border-0">
          <User className="w-5 h-5" style={{ color: pathname?.includes("/profile") ? "#36d1cf" : "#9ca3af" }} />
          <span className="text-[10px] font-medium" style={{ color: pathname?.includes("/profile") ? "#36d1cf" : "#9ca3af" }}>Profile</span>
        </button>
      </div>
    </div>
  );
}
