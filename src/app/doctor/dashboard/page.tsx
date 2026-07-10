"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Calendar, Users, Clock, AlertCircle, ChevronRight } from "lucide-react";
import type { Database } from "@/types/database";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];

interface AppointmentWithPatient extends Appointment {
  patients: { full_name: string; phone: string | null } | null;
}

export default function DoctorDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ today: 0, thisWeek: 0, totalPatients: 0, pending: 0 });
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/doctor/login"); return; }
      const { data: doctorData } = await supabase.from("doctors").select("id, is_onboarded").eq("user_id", user.id).single();
      if (!doctorData) { router.push("/doctor/signup"); return; }
      if (!doctorData.is_onboarded) { router.push("/doctor/onboarding"); return; }

      const today = new Date().toISOString().split("T")[0];
      const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const [todayApts, weekApts, pendingApts, patientCount] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact" }).eq("doctor_id", doctorData.id).eq("appointment_date", today).in("status", ["pending", "confirmed"]),
        supabase.from("appointments").select("id", { count: "exact" }).eq("doctor_id", doctorData.id).gte("appointment_date", today).lte("appointment_date", weekEnd).in("status", ["pending", "confirmed"]),
        supabase.from("appointments").select("id", { count: "exact" }).eq("doctor_id", doctorData.id).eq("status", "pending"),
        supabase.from("appointments").select("patient_id", { count: "exact" }).eq("doctor_id", doctorData.id),
      ]);

      setStats({
        today: todayApts.count || 0, thisWeek: weekApts.count || 0,
        totalPatients: new Set(patientCount.data?.map((a: { patient_id: string }) => a.patient_id)).size || 0,
        pending: pendingApts.count || 0,
      });

      const { data: upcomingApts } = await supabase.from("appointments").select(`*, patients (full_name, phone)`).eq("doctor_id", doctorData.id).gte("appointment_date", today).in("status", ["pending", "confirmed"]).order("appointment_date", { ascending: true }).order("start_time", { ascending: true }).limit(5);
      if (upcomingApts) setAppointments(upcomingApts as AppointmentWithPatient[]);
      setLoading(false);
    };
    fetchData();
  }, [supabase, router]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Dashboard</h1><p className="text-gray-600">Welcome back! Here&apos;s your clinic overview.</p></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Today's Appointments", value: stats.today, icon: Calendar, color: "bg-blue-100 text-blue-600" },
          { label: "This Week", value: stats.thisWeek, icon: Clock, color: "bg-green-100 text-green-600" },
          { label: "Total Patients", value: stats.totalPatients, icon: Users, color: "bg-purple-100 text-purple-600" },
          { label: "Pending Approval", value: stats.pending, icon: AlertCircle, color: "bg-amber-100 text-amber-600" },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}><stat.icon className="w-5 h-5" /></div>
              <div><p className="text-2xl font-bold text-gray-900">{stat.value}</p><p className="text-sm text-gray-500">{stat.label}</p></div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
          <Link href="/doctor/appointments" className="text-sm text-primary-600 hover:underline flex items-center gap-1">View all <ChevronRight className="w-4 h-4" /></Link>
        </div>
        {appointments.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {appointments.map((apt) => (
              <div key={apt.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{apt.patients?.full_name || "Unknown"}</p>
                  <p className="text-sm text-gray-500">{new Date(apt.appointment_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {apt.start_time}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${apt.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{apt.status}</span>
              </div>
            ))}
          </div>
        ) : (<p className="text-gray-500 text-center py-8">No upcoming appointments</p>)}
      </div>
    </div>
  );
}
