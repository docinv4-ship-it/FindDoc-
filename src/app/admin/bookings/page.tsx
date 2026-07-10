"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Search, Calendar, Filter } from "lucide-react";

interface Booking {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  reason_for_visit: string | null;
  cancellation_reason: string | null;
  patients: { id: string; full_name: string; phone: string | null } | null;
  doctors: { id: string; full_name: string; specialization: string } | null;
  clinics: { id: string; name: string; city: string } | null;
}

export default function AdminBookingsPage() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from("appointments").select("id, appointment_date, start_time, end_time, status, reason_for_visit, cancellation_reason, patients (id, full_name, phone), doctors (id, full_name, specialization), clinics (id, name, city)").order("appointment_date", { ascending: false }).order("start_time", { ascending: true });
      if (!error && data) setBookings(data);
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch = !searchQuery || b.patients?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || b.doctors?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || b.clinics?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-green-100 text-green-800",
      completed: "bg-blue-100 text-blue-800",
      cancelled: "bg-gray-100 text-gray-800",
      no_show: "bg-red-100 text-red-800",
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-800"}`}>{status === "no_show" ? "No Show" : status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-600 mt-1">View and manage all appointments</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by patient, doctor, or clinic..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredBookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clinic</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">{b.patients?.full_name || "Unknown"}</p>
                      <p className="text-xs text-gray-500">{b.patients?.phone || "N/A"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900">{b.doctors?.full_name || "Unknown"}</p>
                      <p className="text-xs text-primary-600">{b.doctors?.specialization}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900">{b.clinics?.name || "N/A"}</p>
                      <p className="text-xs text-gray-500">{b.clinics?.city}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900">{formatDate(b.appointment_date)}</p>
                      <p className="text-xs text-gray-500">{b.start_time} - {b.end_time}</p>
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(b.status)}</td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-600 max-w-[200px] truncate">{b.status === "cancelled" ? b.cancellation_reason : b.reason_for_visit || "-"}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No bookings found</p>
          </div>
        )}
      </div>
    </div>
  );
}
