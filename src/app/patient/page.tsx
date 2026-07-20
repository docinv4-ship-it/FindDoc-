"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Calendar, MessageSquare, Loader2, ArrowRight } from "lucide-react";

export default function PatientDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    const getData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);

      const { data: appData } = await supabase
        .from("appointments")
        .select(`id, date, start_time, status, clinics (name), doctors (full_name)`)
        .eq("patient_id", session.user.id)
        .order("date", { ascending: true })
        .limit(3);

      if (appData) setAppointments(appData);
      setLoading(false);
    };
    getData();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="pt-6 px-5 pb-24">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          Hi, {user?.user_metadata?.full_name?.split(" ")[0] || "Patient"} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">Ready for your consultation?</p>
      </div>

      {/* Primary Actions */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link href="/patient/search" className="bg-cyan-500 text-white rounded-2xl p-4 flex flex-col items-start gap-3 shadow-sm hover:bg-cyan-600 transition-colors">
          <div className="bg-white/20 p-2 rounded-xl"><Search className="w-5 h-5" /></div>
          <span className="font-semibold text-sm">Find Doctor</span>
        </Link>
        <Link href="/patient/chats" className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-start gap-3 shadow-sm hover:border-cyan-200 transition-colors">
          <div className="bg-gray-50 p-2 rounded-xl"><MessageSquare className="w-5 h-5 text-gray-600" /></div>
          <span className="font-semibold text-sm text-gray-900">My Chats</span>
        </Link>
      </div>

      {/* Bookings Overview */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold text-gray-900 text-sm">Upcoming Bookings</h2>
        <Link href="/patient/appointments" className="text-xs font-semibold text-cyan-500 flex items-center gap-1 hover:underline">
          See all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm">
          <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-500">No upcoming bookings</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((app) => {
            const clinic = Array.isArray(app.clinics) ? app.clinics[0] : app.clinics;
            const doctor = Array.isArray(app.doctors) ? app.doctors[0] : app.doctors;

            return (
              <div key={app.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                <div>
                  <h4 className="font-semibold text-sm text-gray-900">{doctor?.full_name || "Doctor"}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{clinic?.name || "Clinic"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-md inline-block mb-1">{app.status}</p>
                  <p className="text-[11px] text-gray-400 font-medium">{app.date} • {app.start_time}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
