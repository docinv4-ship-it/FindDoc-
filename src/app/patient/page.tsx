"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Calendar, Loader2, MessageSquare, Bell, Clock } from "lucide-react";
// Yeh aapki Firebase file honi chahiye jahan se token milta hai (Neeche file #3 di gayi hai)
import { requestForToken } from "@/lib/firebase/clientApp"; 

// Type Definitions for Production Level TypeScript
interface Appointment {
  id: string;
  date: string;
  start_time: string;
  status: string;
  clinics: { name: string };
  doctors: { full_name: string };
}

export default function PatientDashboard() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // 1. Data Fetching Logic (Secure & Fast)
  const fetchDashboardData = useCallback(async () => {
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        router.replace("/login");
        return;
      }
      setUser(session.user);

      // Extract Patient ID properly (Using user_id to find actual patient record)
      const { data: patientProfile, error: profileError } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", session.user.id)
        .single();
        
      const actualPatientId = patientProfile ? patientProfile.id : session.user.id;

      // Fetch Upcoming Appointments
      const { data: appData, error: appError } = await supabase
        .from("appointments")
        .select(`
          id, 
          date, 
          start_time, 
          status, 
          clinics (name), 
          doctors (full_name)
        `)
        .eq("patient_id", actualPatientId)
        .gte("date", new Date().toISOString().split('T')[0]) // Only future & today
        .order("date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(3);

      if (appError) throw appError;
      setAppointments(appData as Appointment[] || []);

    } catch (err) {
      console.error("[DASHBOARD_FETCH_ERROR]", err);
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  // =========================================================================
  // 2. BIG FIX: FCM TOKEN GENERATION & SYNC LOGIC
  // =========================================================================
  const setupPushNotifications = useCallback(async (userId: string) => {
    try {
      // Is browser supportive of Service Workers?
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        const token = await requestForToken();
        
        if (token) {
          console.log("FCM Token Generated Successfully. Syncing with DB...");
          // Save the token to the database so the webhook can find it!
          const { error: dbError } = await supabase
            .from("patients")
            .update({ 
              fcm_token: token, 
              updated_at: new Date().toISOString() 
            })
            .eq("user_id", userId);
            
          if (dbError) console.error("[FCM_DB_SYNC_ERROR]", dbError);
        }
      }
    } catch (error) {
      console.error("[PUSH_NOTIFICATION_SETUP_FAILED]", error);
    }
  }, [supabase]);

  // Execute on Mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Execute when user is authenticated
  useEffect(() => {
    if (user) {
      setupPushNotifications(user.id);
    }
  }, [user, setupPushNotifications]);

  // 3. Loading State (Smooth UX)
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <h2 className="text-xl font-semibold text-slate-700">Loading Dashboard...</h2>
      </div>
    );
  }

  // 4. Real UI
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Welcome Back! 👋</h1>
            <p className="text-slate-500 mt-1">Manage your health and appointments.</p>
          </div>
          <div className="flex gap-4">
            <Link href="/patient/search" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md shadow-blue-200">
              <Search className="w-5 h-5" />
              Find Doctor
            </Link>
          </div>
        </header>

        {/* Upcoming Appointments Section */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-500" />
              Upcoming Appointments
            </h2>
            <Link href="/patient/appointments" className="text-blue-600 hover:text-blue-800 font-medium text-sm">
              View All
            </Link>
          </div>

          {appointments.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-600">No upcoming appointments</h3>
              <p className="text-slate-500 mt-1">Book a doctor to get started.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {appointments.map((apt) => (
                <div key={apt.id} className="p-5 border border-slate-100 rounded-xl hover:shadow-md transition-shadow bg-slate-50 relative overflow-hidden">
                  {/* Status Badge */}
                  <span className={`absolute top-4 right-4 text-xs font-bold px-2.5 py-1 rounded-full ${
                    apt.status === "confirmed" ? "bg-green-100 text-green-700" : 
                    apt.status === "pending" ? "bg-orange-100 text-orange-700" : 
                    "bg-slate-200 text-slate-700"
                  }`}>
                    {apt.status.toUpperCase()}
                  </span>

                  <h3 className="font-bold text-lg text-slate-800 pr-20">{apt.doctors?.full_name}</h3>
                  <p className="text-sm text-slate-500 mb-4">{apt.clinics?.name}</p>
                  
                  <div className="flex items-center gap-4 text-sm font-medium text-slate-600 mb-5">
                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-blue-500" /> {new Date(apt.date).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-blue-500" /> {apt.start_time.slice(0, 5)}</span>
                  </div>

                  {/* Chat Unlock Button */}
                  {apt.status === "confirmed" ? (
                    <Link href={`/patient/chat/${apt.id}`} className="flex items-center justify-center gap-2 w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-2.5 rounded-lg font-semibold transition-colors">
                      <MessageSquare className="w-4 h-4" /> Open Chat
                    </Link>
                  ) : (
                    <button disabled className="flex items-center justify-center gap-2 w-full bg-slate-200 text-slate-400 py-2.5 rounded-lg font-semibold cursor-not-allowed">
                      <Bell className="w-4 h-4" /> Awaiting Confirmation
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
