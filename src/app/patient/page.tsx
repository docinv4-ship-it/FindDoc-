"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { 
  Stethoscope, Calendar, MessageCircle, User, Loader2, 
  Clock, MapPin, AlertCircle, Heart, ArrowRight 
} from "lucide-react";

// ==========================================
// 🛠️ CONFIGURATION: Find Doctors ka exact path yahan set karein!
const FIND_DOCTORS_ROUTE = "/patient/search"; 
// ==========================================

interface Appointment {
  id: string;
  date: string;
  start_time: string;
  status: "pending" | "confirmed" | "cancelled";
  clinics: {
    name: string;
    address: string;
    city: string;
  } | null;
  doctors: {
    full_name: string;
    specialization: string;
  } | null;
}

export default function PatientDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({
    upcomingCount: 0,
    favoritesCount: 0,
    chatsCount: 0
  });

  const supabase = createClient();

  useEffect(() => {
    const getDashboardData = async () => {
      try {
        // 1. User Session Check
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login"); 
          return;
        }
        setUser(session.user);

        const patientId = session.user.id;

        // 2. Real Appointments Fetch (From 'appointments' table)
        const { data: appData, error: appError } = await supabase
          .from("appointments") 
          .select(`
            id, date, start_time, status,
            clinics (name, address, city),
            doctors (full_name, specialization)
          `)
          .eq("patient_id", patientId)
          .order("date", { ascending: true });

        if (appError) throw appError;

        // 3. Chats Count (From 'conversations' table)
        const { count: chatCount, error: chatError } = await supabase
          .from("conversations")
          .select("*", { count: "exact", head: true })
          .eq("patient_id", patientId);

        // 4. Favorites Count (From 'patient_favorites' table)
        const { count: favCount } = await supabase
          .from("patient_favorites")
          .select("*", { count: "exact", head: true })
          .eq("patient_id", patientId);

        // ✅ FIX: Map data dynamically to ensure TypeScript doesn't see them as raw arrays
        const rawAppointments = appData || [];
        const realAppointments: Appointment[] = rawAppointments.map((app: any) => ({
          id: app.id,
          date: app.date,
          start_time: app.start_time,
          status: app.status,
          clinics: Array.isArray(app.clinics) 
            ? (app.clinics[0] || null) 
            : (app.clinics || null),
          doctors: Array.isArray(app.doctors) 
            ? (app.doctors[0] || null) 
            : (app.doctors || null),
        }));

        setAppointments(realAppointments);

        // Filter active upcoming bookings
        const todayStr = new Date().toISOString().split("T")[0];
        const upcoming = realAppointments.filter(app => app.date >= todayStr && app.status !== "cancelled");

        setStats({
          upcomingCount: upcoming.length,
          favoritesCount: favCount || 0,
          chatsCount: chatCount || 0
        });

      } catch (error) {
        console.error("Dashboard Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };

    getDashboardData();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => router.push("/patient")} className="flex items-center gap-3 bg-transparent border-0 text-left">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse" style={{ backgroundColor: "#36d1cf" }}>
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">DocFind</span>
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
              {user?.email || "Patient Profile"}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-600 mb-1">Control Center</p>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}! 👋
          </h1>
          <p className="text-gray-500 mt-1">Manage your health consultations and checkups at a glance.</p>
        </div>

        {/* Action Banner */}
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border border-teal-100 p-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Need professional care?</h3>
            <p className="text-sm text-gray-600">Connect instantly with the region&apos;s highest-ranked healthcare consultants.</p>
          </div>
          {/* ✅ FIXED PATH: Now properly redirects to finding doctor page */}
          <button 
            onClick={() => router.push(FIND_DOCTORS_ROUTE)} 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium shadow-sm transition-all hover:opacity-90 self-start md:self-auto"
            style={{ backgroundColor: "#36d1cf" }}
          >
            Start Finding Doctors <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Upcoming Bookings</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.upcomingCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-teal-50">
              <Calendar className="w-6 h-6" style={{ color: "#36d1cf" }} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Favorite Clinicians</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.favoritesCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-rose-50">
              <Heart className="w-6 h-6 text-rose-500" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Direct Consult Chats</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.chatsCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50">
              <MessageCircle className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Upcoming Schedule Section */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" /> Upcoming Schedule
            </h2>
          </div>

          <div className="p-5">
            {appointments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 font-medium">No bookings found</p>
                <p className="text-xs text-gray-400 mt-1">Book an appointment to see your schedule here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((app) => (
                  <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-all gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{app.doctors?.full_name || "Doctor"}</h4>
                        <p className="text-xs text-gray-500">
                          {app.doctors?.specialization || "General Practitioner"} - {app.clinics?.name || "Clinic"}
                        </p>
                        <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                          <MapPin className="w-3 h-3 animate-bounce" style={{ color: "#36d1cf" }} />
                          <span>{app.clinics?.address}, {app.clinics?.city}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-start sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                        app.status === "confirmed" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                        app.status === "pending" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                        "bg-gray-50 text-gray-700"
                      }`}>
                        {app.status}
                      </span>
                      <p className="text-xs font-medium text-gray-600">
                        {app.date} at {app.start_time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Patient Advisory */}
        <div className="bg-amber-50/50 rounded-2xl border border-amber-100 p-5">
          <h4 className="font-semibold text-amber-900 flex items-center gap-2 text-sm mb-3">
            <AlertCircle className="w-4 h-4 text-amber-600" /> Patient Advisory
          </h4>
          <ul className="space-y-2 text-xs text-amber-800 leading-relaxed list-disc pl-4">
            <li><strong>Check-in time:</strong> Please ensure you arrive 15 minutes before your scheduled slot for registration.</li>
            <li><strong>Direct Chat:</strong> Message your medical provider post-confirmation directly using the portal&apos;s Chats interface.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}