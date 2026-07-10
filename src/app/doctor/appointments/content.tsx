"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, Filter, Calendar, Clock, User, Check, X, AlertCircle, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import type { Database } from "@/types/database";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
type Clinic = Database["public"]["Tables"]["clinics"]["Row"];
type Patient = Database["public"]["Tables"]["patients"]["Row"];

interface AppointmentWithDetails extends Appointment {
  clinics: Clinic | null;
  patients: Patient | null;
}

const ITEMS_PER_PAGE = 10;

export default function DoctorAppointmentsContent() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClinic, setSelectedClinic] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/doctor/login"); return; }
      const { data: doctor } = await supabase.from("doctors").select("id, is_onboarded").eq("user_id", user.id).single();
      if (!doctor) { router.push("/doctor/signup"); return; }
      if (!doctor.is_onboarded) { router.push("/doctor/onboarding"); return; }
      setDoctorId(doctor.id);

      const { data: clinicsData } = await supabase.from("clinics").select("*").eq("doctor_id", doctor.id);
      if (clinicsData) setClinics(clinicsData);

      await fetchAppointments(doctor.id);
      setLoading(false);
    };
    fetchData();
  }, [supabase, router]);

  useEffect(() => {
    const conversationId = searchParams.get("conversation");
    const patientId = searchParams.get("patient");
    if (conversationId && patientId) {
      setSelectedStatus("pending");
    }
  }, [searchParams]);

  const fetchAppointments = async (docId: string) => {
    let query = supabase.from("appointments").select(`*, clinics (*), patients (*)`).eq("doctor_id", docId).order("appointment_date", { ascending: false }).order("start_time", { ascending: true });

    const { data, error } = await query;
    if (!error && data) setAppointments(data as AppointmentWithDetails[]);
  };

  const handleAction = async (appointmentId: string, action: "confirm" | "reject" | "complete" | "cancel" | "no_show") => {
    setActioningId(appointmentId);
    try {
      const response = await fetch(`/api/appointment/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (response.ok && data.new_status) {
        setAppointments((prev) => prev.map((apt) => apt.id === appointmentId ? { ...apt, status: data.new_status as Appointment["status"] } : apt));
      }
    } catch (err) {
      console.error("Error updating appointment:", err);
    } finally {
      setActioningId(null);
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch = !searchQuery || apt.patients?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || apt.patients?.phone?.includes(searchQuery);
    const matchesClinic = selectedClinic === "all" || apt.clinic_id === selectedClinic;
    const matchesStatus = selectedStatus === "all" || apt.status === selectedStatus;
    const matchesDate = !selectedDate || apt.appointment_date === selectedDate;
    return matchesSearch && matchesClinic && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filteredAppointments.length / ITEMS_PER_PAGE);
  const paginatedAppointments = filteredAppointments.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-green-100 text-green-800",
      completed: "bg-blue-100 text-blue-800",
      cancelled: "bg-gray-100 text-gray-800",
      no_show: "bg-red-100 text-red-800",
    };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-800"}`}>{status === "no_show" ? "No Show" : status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all your patient appointments</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Search by patient name or phone..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select value={selectedClinic} onChange={(e) => { setSelectedClinic(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="all">All Clinics</option>
              {clinics.map((clinic) => (<option key={clinic.id} value={clinic.id}>{clinic.name}</option>))}
            </select>
            <select value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
            <input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {paginatedAppointments.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clinic</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedAppointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{apt.patients?.full_name || "Unknown"}</p>
                            <p className="text-xs text-gray-500">{apt.patients?.phone || "N/A"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-900">{apt.clinics?.name || "N/A"}</p>
                        <p className="text-xs text-gray-500">{apt.clinics?.city}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{formatDate(apt.appointment_date)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-500">{apt.start_time} - {apt.end_time}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-600 max-w-[200px] truncate">{apt.reason_for_visit || "-"}</p>
                      </td>
                      <td className="px-4 py-4">{getStatusBadge(apt.status)}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {apt.status === "pending" && (
                            <>
                              <button onClick={() => handleAction(apt.id, "confirm")} disabled={actioningId === apt.id} className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors disabled:opacity-50"><Check className="w-4 h-4" /></button>
                              <button onClick={() => handleAction(apt.id, "reject")} disabled={actioningId === apt.id} className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors disabled:opacity-50"><X className="w-4 h-4" /></button>
                            </>
                          )}
                          {apt.status === "confirmed" && (
                            <>
                              <button onClick={() => handleAction(apt.id, "complete")} disabled={actioningId === apt.id} className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors disabled:opacity-50" title="Mark Complete"><Check className="w-4 h-4" /></button>
                              <button onClick={() => handleAction(apt.id, "no_show")} disabled={actioningId === apt.id} className="p-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-colors disabled:opacity-50" title="Mark No-Show"><AlertCircle className="w-4 h-4" /></button>
                              <button onClick={() => handleAction(apt.id, "cancel")} disabled={actioningId === apt.id} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50" title="Cancel"><X className="w-4 h-4" /></button>
                            </>
                          )}
                          {apt.status === "completed" && (
                            <span className="text-xs text-gray-400">Completed</span>
                          )}
                          {apt.status === "cancelled" && (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                          {apt.status === "no_show" && (
                            <span className="text-xs text-orange-500">No-show</span>
                          )}
                          {apt.patients && (
                            <button onClick={() => router.push(`/doctor/inbox?patient=${apt.patient_id}`)} className="p-2 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-lg transition-colors"><MessageCircle className="w-4 h-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">Page {currentPage} of {totalPages}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No appointments found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
