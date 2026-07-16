
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Loader2, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Stethoscope, 
  X, 
  AlertCircle, 
  RefreshCw, 
  Mail 
} from "lucide-react";

// ==========================================
// 🛠️ CONFIGURATION: Find Doctors ka exact path yahan set karein!
// Agar aapka search page "/patient/search" hai, ya "/patient/find", ya "/doctors" hai, 
// toh bas is niche wali line ko change karein, poore page ke buttons sahi ho jayenge.
const FIND_DOCTORS_ROUTE = "/patient/search"; 
// ==========================================

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  reason_for_visit: string | null;
  clinics: { id: string; name: string; address: string; city: string } | null;
  doctors: { id: string; full_name: string; specialization: string } | null;
}

export default function PatientAppointmentsContent() {
  const [step, setStep] = useState<"results" | "cancel" | "reschedule">("results");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection and Cancellation
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Rescheduling
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<{start_time: string; end_time: string}[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  // Load User Data & Appointments automatically on Mount
  useEffect(() => {
    const fetchUserDataAndBookings = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          // Query the API using authenticated metadata (email and userId)
          const response = await fetch(
            `/api/bookings/lookup?email=${encodeURIComponent(user.email || "")}&userId=${user.id}`
          );
          const data = await response.json();
          if (response.ok) {
            setAppointments(data.appointments || []);
          } else {
            setError(data.error || "Failed to retrieve your appointments.");
          }
        } else {
          setError("No authenticated user session found.");
        }
      } catch (err) {
        console.error("Lookup error:", err);
        setError("An error occurred while establishing secure connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserDataAndBookings();
  }, [supabase]);

  const handleCancelClick = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setStep("cancel");
    setError(null);
    setCancelReason("");
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;
    setCancelling(true);
    setError(null);
    try {
      const response = await fetch(`/api/appointment/${selectedAppointment.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          cancellation_reason: cancelReason.trim() || "Cancelled by patient",
          userId: currentUser?.id
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setAppointments((prev) => prev.map((a) => a.id === selectedAppointment.id ? { ...a, status: "cancelled" } : a));
        setStep("results");
        setSelectedAppointment(null);
      } else {
        setError(data.error || "Failed to cancel appointment");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const handleRescheduleClick = async (apt: Appointment) => {
    setSelectedAppointment(apt);
    setNewDate("");
    setNewStartTime("");
    setNewEndTime("");
    setAvailableSlots([]);
    setError(null);
    setStep("reschedule");
  };

  const handleLoadSlots = async () => {
    if (!selectedAppointment?.clinics?.id || !newDate) return;
    setLoadingSlots(true);
    try {
      const response = await fetch(`/api/slots?clinic_id=${selectedAppointment.clinics.id}&date=${newDate}`);
      const data = await response.json();
      if (response.ok) {
        setAvailableSlots((data.slots || []).filter((s: { is_available: boolean }) => s.is_available));
      } else {
        setError(data.error || "Failed to load slots");
      }
    } catch {
      setError("Failed to load available slots");
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment || !newDate || !newStartTime || !newEndTime) return;
    setRescheduling(true);
    setError(null);
    try {
      const response = await fetch(`/api/appointment/${selectedAppointment.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_appointment_date: newDate,
          new_start_time: newStartTime,
          new_end_time: newEndTime,
          userId: currentUser?.id
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setAppointments((prev) => prev.map((a) => a.id === selectedAppointment.id ? { ...a, appointment_date: newDate, start_time: newStartTime, end_time: newEndTime, status: data.new_status } : a));
        setStep("results");
        setSelectedAppointment(null);
      } else {
        setError(data.error || "Failed to reschedule appointment");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setRescheduling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-green-100 text-green-800",
      completed: "bg-blue-100 text-blue-800",
      cancelled: "bg-gray-100 text-gray-800",
      no_show: "bg-red-100 text-red-800",
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-800"}`}>
        {status === "no_show" ? "No Show" : status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#36d1cf" }} />
        <p className="mt-4 text-sm font-semibold text-gray-500 uppercase tracking-wider animate-pulse">
          Loading appointments securely...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            {/* Logo clicks go back to Dashboard Home */}
            <button onClick={() => router.push("/patient")} className="flex items-center gap-2">
              <Stethoscope className="w-8 h-8" style={{ color: "#36d1cf" }} />
              <span className="text-xl font-bold text-gray-900">DocFind</span>
            </button>
            <nav className="flex items-center gap-4">
              <button onClick={() => router.push("/patient/favorites")} className="text-sm text-gray-600 hover:text-gray-900">Favorites</button>
              <button onClick={() => router.push("/patient/chats")} className="text-sm text-gray-600 hover:text-gray-900">Chats</button>
              {/* ✅ FIXED PATH: Now dynamically uses FIND_DOCTORS_ROUTE */}
              <button onClick={() => router.push(FIND_DOCTORS_ROUTE)} className="text-sm font-medium" style={{ color: "#36d1cf" }}>Find Doctors</button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {step === "results" && (
          <div>
            <div className="text-center mb-8 bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="text-left">
                <h1 className="text-2xl font-black text-gray-900">Your Appointments</h1>
                <div className="flex items-center gap-2 mt-1 text-gray-500 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{currentUser?.email}</span>
                </div>
              </div>
              <span className="bg-teal-50 text-[#36d1cf] px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider">
                🔐 Secured
              </span>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex items-center gap-2 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {appointments.length > 0 ? (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <div key={apt.id} className="bg-white rounded-xl border border-gray-200 p-6 transition-all duration-200 hover:shadow-md">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-[#36d1cf]" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{apt.doctors?.full_name || "Doctor"}</p>
                          <p className="text-sm font-medium text-[#36d1cf]">{apt.doctors?.specialization}</p>
                        </div>
                      </div>
                      {getStatusBadge(apt.status)}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 animate-pulse" />
                        <span className="text-sm text-gray-600">{apt.clinics?.name}, {apt.clinics?.city}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{formatDate(apt.appointment_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{apt.start_time} - {apt.end_time}</span>
                      </div>
                      {apt.reason_for_visit && (
                        <p className="text-sm text-gray-500 mt-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                          <span className="font-bold text-gray-700">Reason:</span> {apt.reason_for_visit}
                        </p>
                      )}
                    </div>

                    {["pending", "confirmed"].includes(apt.status) && (
                      <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
                        <button onClick={() => handleRescheduleClick(apt)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-teal-50 hover:bg-teal-100 text-[#36d1cf] font-bold rounded-lg transition-colors">
                          <RefreshCw className="w-4 h-4" /> Reschedule
                        </button>
                        <button onClick={() => handleCancelClick(apt)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg transition-colors">
                          <X className="w-4 h-4" /> Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-bold">No appointments found</p>
                <p className="text-sm text-gray-500 mt-1">We couldn't find any appointments linked to your credentials.</p>
                {/* ✅ FIXED PATH: Now dynamically uses FIND_DOCTORS_ROUTE */}
                <button onClick={() => router.push(FIND_DOCTORS_ROUTE)} className="mt-6 px-6 py-3 bg-[#36d1cf] hover:bg-teal-600 text-white font-bold rounded-xl transition-colors shadow-md hover:shadow-lg">
                  Find a Doctor
                </button>
              </div>
            )}
          </div>
        )}

        {step === "cancel" && selectedAppointment && (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-500 animate-bounce" />
              </div>
              <h1 className="text-2xl font-black text-gray-900">Cancel Appointment</h1>
              <p className="text-gray-600 mt-2">Are you sure you want to cancel this booking?</p>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-6 space-y-2">
              <p className="text-sm"><span className="font-bold text-gray-700">Doctor:</span> {selectedAppointment.doctors?.full_name}</p>
              <p className="text-sm"><span className="font-bold text-gray-700">Date:</span> {formatDate(selectedAppointment.appointment_date)}</p>
              <p className="text-sm"><span className="font-bold text-gray-700">Time:</span> {selectedAppointment.start_time} - {selectedAppointment.end_time}</p>
            </div>

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Reason for cancellation (optional)</label>
                <input type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Please let us know why you are cancelling..." className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#36d1cf]" />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => { setStep("results"); setSelectedAppointment(null); }} className="flex-1 py-3 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors">
                  Go Back
                </button>
                <button type="submit" disabled={cancelling} className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md">
                  {cancelling ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Cancel"}
                </button>
              </div>
            </form>
          </div>
        )}

        {step === "reschedule" && selectedAppointment && (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-8 h-8 text-[#36d1cf] animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <h1 className="text-2xl font-black text-gray-900">Reschedule Appointment</h1>
              <p className="text-gray-600 mt-2">Choose a new date and time configuration below.</p>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-6 space-y-2">
              <p className="text-sm"><span className="font-bold text-gray-700">Current Date:</span> {formatDate(selectedAppointment.appointment_date)}</p>
              <p className="text-sm"><span className="font-bold text-gray-700">Current Time:</span> {selectedAppointment.start_time} - {selectedAppointment.end_time}</p>
            </div>

            <form onSubmit={handleConfirmReschedule} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Select New Date</label>
                <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} min={new Date().toISOString().split("T")[0]} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#36d1cf]" required />
              </div>

              <button type="button" onClick={handleLoadSlots} disabled={!newDate || loadingSlots} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors disabled:opacity-50">
                {loadingSlots ? "Loading slots..." : "Check Available Slots"}
              </button>

              {availableSlots.length > 0 && (
                <div className="animate-fadeIn">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Select New Time Slot</label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot) => (
                      <button key={slot.start_time} type="button" onClick={() => { setNewStartTime(slot.start_time); setNewEndTime(slot.end_time); }} className={`py-2.5 px-3 text-xs md:text-sm font-bold rounded-xl border transition-all ${newStartTime === slot.start_time ? "bg-[#36d1cf] text-white border-[#36d1cf]" : "bg-white border-gray-200 hover:border-[#36d1cf]"}`}>
                        {slot.start_time}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => { setStep("results"); setSelectedAppointment(null); }} className="flex-1 py-3 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors">
                  Go Back
                </button>
                <button type="submit" disabled={rescheduling || !newDate || !newStartTime} className="flex-1 py-3 bg-[#36d1cf] hover:bg-teal-600 disabled:bg-teal-200 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md">
                  {rescheduling ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Reschedule"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
