"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Loader2, Stethoscope, User, Calendar, Bell, LogOut, 
  ArrowRight, MessageSquare, Heart, Clock, CheckCircle2, Search, ArrowUpRight
} from "lucide-react";
import AuthModal from "@/components/AuthModal";

export default function PatientDashboard() {
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [stats, setStats] = useState({ appointments: 0, favorites: 0, messages: 0 });
  
  const router = useRouter();
  const pathname = usePathname();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const fetchUserAndStats = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          // Dummy counts for elite dashboard metrics (In production, fetch from Supabase)
          setStats({ appointments: 2, favorites: 5, messages: 1 });
        }
      } catch (err) {
        console.error("Dashboard session error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserAndStats();
  }, [supabase]);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      router.replace("/");
    } catch (err) {
      console.error("Logout error:", err);
      setLoading(false);
    }
  };

  const handleProtectedAction = (targetPath: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
    } else {
      router.push(targetPath);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#36d1cf]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-12 font-sans">
      {/* Premium Navbar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => router.push("/")}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#36d1cf]">
                <Stethoscope className="w-5.5 h-5.5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">DocFind</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-8">
              <button onClick={() => router.push("/patient")} className="text-sm font-semibold text-[#36d1cf] border-b-2 border-[#36d1cf] pb-1 bg-transparent border-0 cursor-pointer">Home</button>
              <button onClick={() => router.push("/patient/search")} className="text-sm font-semibold text-gray-600 hover:text-[#36d1cf] transition-colors bg-transparent border-0 cursor-pointer">Find Doctors</button>
              <button onClick={() => handleProtectedAction("/patient/favorites")} className="text-sm font-semibold text-gray-600 hover:text-[#36d1cf] transition-colors bg-transparent border-0 cursor-pointer">Favorites</button>
              <button onClick={() => handleProtectedAction("/patient/chats")} className="text-sm font-semibold text-gray-600 hover:text-[#36d1cf] transition-colors bg-transparent border-0 cursor-pointer">Chats</button>
              <button onClick={() => handleProtectedAction("/patient/appointments")} className="text-sm font-semibold text-gray-600 hover:text-[#36d1cf] transition-colors bg-transparent border-0 cursor-pointer">Appointments</button>
              
              {user ? (
                <div className="flex items-center gap-3">
                  <button onClick={() => router.push("/patient/profile")} className="flex items-center gap-1.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition-all border-0 cursor-pointer">
                    <User className="w-4 h-4 text-gray-500" /> {user.email?.split("@")[0]}
                  </button>
                  <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors bg-transparent border-0 cursor-pointer">
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsAuthModalOpen(true)} className="px-5 py-2.5 text-sm font-bold text-white bg-[#36d1cf] hover:bg-[#2eb3b1] rounded-xl transition-all border-0 cursor-pointer shadow-sm">
                  Sign In
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Welcome Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <p className="text-sm font-bold text-[#36d1cf] tracking-wide uppercase">Control Center</p>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mt-1">
            {user ? `Welcome back, ${user.email?.split("@")[0]}! 👋` : "Welcome to DocFind! 👋"}
          </h1>
          <p className="text-gray-500 text-sm mt-1.5">Manage your health consultations and checkups at a glance.</p>
        </div>

        {/* Quick Action Widget / Search Banner */}
        <div className="bg-gradient-to-r from-teal-500 to-[#36d1cf] rounded-2xl p-6 md:p-8 text-white shadow-md mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="max-w-lg">
            <h2 className="text-xl md:text-2xl font-bold">Need professional care?</h2>
            <p className="text-white/80 text-sm mt-2">Connect instantly with the region's highest-ranked healthcare consultants and specialists.</p>
          </div>
          <button 
            onClick={() => router.push("/patient/search")}
            className="flex items-center gap-2 px-6 py-3.5 bg-white text-teal-600 hover:text-teal-700 font-bold rounded-xl transition-all shadow-lg shadow-teal-900/10 border-0 cursor-pointer text-sm whitespace-nowrap active:scale-[0.98]"
          >
            <Search className="w-4 h-4" /> Start Finding Doctors
          </button>
        </div>

        {/* Dynamic Statistics Metrics */}
        {user && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            {[
              { label: "Upcoming Bookings", value: stats.appointments, icon: Calendar, color: "text-[#36d1cf] bg-teal-50" },
              { label: "Favorite Clinicians", value: stats.favorites, icon: Heart, color: "text-rose-500 bg-rose-50" },
              { label: "Direct Consult Chats", value: stats.messages, icon: MessageSquare, color: "text-blue-500 bg-blue-50" },
            ].map((stat, i) => (
              <div key={i} className="bg-white p-5 rounded-xl border border-gray-200/80 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming Visits Panel */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" /> Upcoming Schedule
              </h3>
              {user && (
                <button 
                  onClick={() => router.push("/patient/appointments")}
                  className="text-xs font-bold text-[#36d1cf] hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                >
                  View All <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Appointment State Logic */}
            {user ? (
              <div className="space-y-4">
                {/* Visual Card Example of active appointment */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-[#36d1cf]/40 transition-all bg-gray-50/50">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-[#e6faf9] flex items-center justify-center text-[#36d1cf] font-extrabold text-sm">SK</div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">Dr. Sheraz Khan</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Internal Medicine • SK Clinic</p>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-0 text-left sm:text-right flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Confirmed
                    </span>
                    <p className="text-xs font-bold text-gray-700 mt-1.5">Tomorrow at 10:30 AM</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl bg-gray-50/40">
                <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h4 className="font-bold text-gray-700 text-sm">Secure Your Next Session</h4>
                <p className="text-gray-500 text-xs mt-1 max-w-xs mx-auto">Please login to securely book, track, and manage your medical consultations.</p>
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-[#36d1cf] hover:bg-[#2eb3b1] text-white text-xs font-bold rounded-lg transition-all border-0 cursor-pointer shadow-sm"
                >
                  Connect Account
                </button>
              </div>
            )}
          </div>

          {/* Quick Tips Panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" /> Patient Advisory
              </h3>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#36d1cf] mt-2 flex-shrink-0" />
                  <p className="text-xs text-gray-600 leading-relaxed"><strong className="text-gray-800">Check-in time:</strong> Please ensure you arrive 15 minutes before your scheduled slot for registration.</p>
                </li>
                <li className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#36d1cf] mt-2 flex-shrink-0" />
                  <p className="text-xs text-gray-600 leading-relaxed"><strong className="text-gray-800">Direct Chat:</strong> Message your medical provider post-confirmation directly using the portal's Chats interface.</p>
                </li>
              </ul>
            </div>
            <div className="pt-6 border-t border-gray-100 mt-6">
              <p className="text-[11px] text-gray-400">© 2026 DocFind. All actions secure and encrypted.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Sync Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 flex justify-between items-center z-50 shadow-lg">
        <button onClick={() => router.push("/patient")} className="flex flex-col items-center gap-1 bg-transparent border-0 cursor-pointer">
          <HomeIcon className="w-5 h-5" color={pathname === "/patient" ? "#36d1cf" : "#9ca3af"} />
          <span className="text-[10px] font-bold" style={{ color: pathname === "/patient" ? "#36d1cf" : "#9ca3af" }}>Home</span>
        </button>

        <button onClick={() => router.push("/patient/search")} className="flex flex-col items-center gap-1 bg-transparent border-0 cursor-pointer">
          <Search className="w-5 h-5" style={{ color: pathname === "/patient/search" ? "#36d1cf" : "#9ca3af" }} />
          <span className="text-[10px] font-bold" style={{ color: pathname === "/patient/search" ? "#36d1cf" : "#9ca3af" }}>Find</span>
        </button>

        <button onClick={() => handleProtectedAction("/patient/appointments")} className="flex flex-col items-center gap-1 bg-transparent border-0 cursor-pointer">
          <Calendar className="w-5 h-5" style={{ color: pathname?.includes("/appointments") ? "#36d1cf" : "#9ca3af" }} />
          <span className="text-[10px] font-bold" style={{ color: pathname?.includes("/appointments") ? "#36d1cf" : "#9ca3af" }}>Bookings</span>
        </button>

        <button onClick={() => handleProtectedAction("/patient/profile")} className="flex flex-col items-center gap-1 bg-transparent border-0 cursor-pointer">
          <User className="w-5 h-5" style={{ color: pathname?.includes("/profile") ? "#36d1cf" : "#9ca3af" }} />
          <span className="text-[10px] font-bold" style={{ color: pathname?.includes("/profile") ? "#36d1cf" : "#9ca3af" }}>Profile</span>
        </button>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} redirectPath="/patient" />
    </div>
  );
}

// Temporary internal wrapper to dodge dynamic conflicts with direct imports
function HomeIcon({ className, color }: { className?: string; color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}
