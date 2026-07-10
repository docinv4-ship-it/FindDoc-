"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Calendar, Clock, User, Check, X, Phone, MessageCircle, MapPin } from "lucide-react";

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  reason_for_visit: string | null;
  patients: { full_name: string; phone: string | null } | null;
  clinics: { name: string; address: string } | null;
}

export default function DoctorAgendaPage() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, cancelled: 0 });
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/doctor/login"); return; }
      const { data: doctor } = await supabase.from("doctors").select("id, is_onboarded").eq("user_id", user.id).single();
      if (!doctor) { router.push("/doctor/signup"); return; }
      if (!doctor.is_onboarded) { router.push("/doctor/onboarding"); return; }

      const today = new Date().toISOString().split("T")[0];

      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select("id, appointment_date, start_time, end_time, status, reason_for_visit, patients (full_name, phone), clinics (name, address)")
        .eq("doctor_id", doctor.id)
        .eq("appointment_date", today)
        .order("start_time", { ascending: true });

      if (appointmentsData) {
        setAppointments(appointmentsData);
        setStats({
          total: appointmentsData.length,
          completed: appointmentsData.filter((a: Appointment) => a.status === "completed").length,
          pending: appointmentsData.filter((a: Appointment) => a.status === "pending" || a.status === "confirmed").length,
          cancelled: appointmentsData.filter((a: Appointment) => a.status === "cancelled").length,
        });
      }
      setLoading(false);
    };
    fetchData();
  }, [supabase, router]);

  const handleAction = async (appointmentId: string, action: "confirm" | "complete" | "cancel") => {
    const statusMap: Record<string, string> = { confirm: "confirmed", complete: "completed", cancel: "cancelled" };
    await supabase.from("appointments").update({ status: statusMap[action] }).eq("id", appointmentId);
    setAppointments((prev) => prev.map((a) => a.id === appointmentId ? { ...a, status: statusMap[action] } : a));
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} /></div>;

  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Today&apos;s Agenda</h1>
          <p className="text-gray-600 mt-1">{formattedDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5" style={{ color: "#36d1cf" }} />
          <span className="font-medium text-gray-900">{stats.total} appointments</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-sm text-gray-500">Pending</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: "#36d1cf" }}>{stats.completed}</p>
          <p className="text-sm text-gray-500">Completed</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
          <p className="text-sm text-gray-500">Cancelled</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {appointments.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {appointments.map((apt) => (
              <div key={apt.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
                      <Clock className="w-6 h-6" style={{ color: "#36d1cf" }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{formatTime(apt.start_time)}</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{apt.patients?.full_name || "Patient"}</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                        {apt.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      {apt.patients?.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {apt.patients.phone}
                        </div>
                      )}
                      {apt.clinics && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {apt.clinics.name}
                        </div>
                      )}
                    </div>
                    {apt.reason_for_visit && (
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg p-2">{apt.reason_for_visit}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      {apt.status === "pending" && (
                        <>
                          <button onClick={() => handleAction(apt.id, "confirm")} className="px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors" style={{ backgroundColor: "#36d1cf" }}>
                            <Check className="w-4 h-4 inline mr-1" /> Confirm
                          </button>
                          <button onClick={() => handleAction(apt.id, "cancel")} className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                            <X className="w-4 h-4 inline mr-1" /> Cancel
                          </button>
                        </>
                      )}
                      {(apt.status === "confirmed" || apt.status === "pending") && (
                        <button onClick={() => handleAction(apt.id, "complete")} className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                          <Check className="w-4 h-4 inline mr-1" /> Mark Complete
                        </button>
                      )}
                      <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <MessageCircle className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No appointments scheduled for today</p>
          </div>
        )}
      </div>
    </div>
  );
}
