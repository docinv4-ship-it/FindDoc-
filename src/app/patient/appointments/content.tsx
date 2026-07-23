"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Loader2, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  X, 
  AlertCircle, 
  RefreshCw, 
  Star
} from "lucide-react";

// ==========================================
// 🛠️ CONFIGURATION: Find Doctors Route
// ==========================================
const FIND_DOCTORS_ROUTE = "/patient/search"; 

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

// --- LOGIC: Check if Appointment Time has Passed ---
function checkIsPast(dateStr: string, endTimeStr?: string): boolean {
  try {
    const today = new Date();
    const appDate = new Date(dateStr);
    
    today.setHours(0, 0, 0, 0);
    appDate.setHours(0, 0, 0, 0);

    if (appDate < today) return true; 
    if (appDate > today) return false; 

    if (endTimeStr) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [hours, minutes] = endTimeStr.split(":").map(Number);
      const slotEndMinutes = hours * 60 + minutes;
      return currentMinutes >= slotEndMinutes;
    }
    return false;
  } catch (e) {
    return false;
  }
}

export default function PatientAppointmentsContent() {
  const [step, setStep] = useState<"results" | "cancel" | "reschedule">("results");
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection & Actions
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

  // --- API Fetch: Load Only Authenticated User's Data ---
  useEffect(() => {
    const fetchUserDataAndBookings = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
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
        setError("An error occurred while establishing secure connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserDataAndBookings();
  }, [supabase]);

  // --- Filter Engine for Tabs ---
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const isPast = checkIsPast(apt.appointment_date, apt.end_time);

      if (activeTab === "cancelled") {
        return apt.status === "cancelled";
      }
      if (activeTab === "upcoming") {
        return !isPast && apt.status !== "cancelled" && apt.status !== "completed";
      }
      if (activeTab === "past") {
        return isPast || apt.status === "completed";
      }
      return true;
    });
  }, [appointments, activeTab]);

  // --- Handlers ---
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
      if (response.ok) {
        setAppointments((prev) => prev.map((a) => a.id === selectedAppointment.id ? { ...a, status: "cancelled" } : a));
        setStep("results");
        setSelectedAppointment(null);
      } else {
        const data = await response.json();
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
        setAppointments((prev) => prev.map((a) => a.id === selectedAppointment.id ? { ...a, appointment_date: newDate, start_time: newStartTime, end_time: newEndTime, status: data.new_status || "pending" } : a));
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

  // --- Dynamic Smart Badge UI ---
  const renderStatusBadge = (status: string, isPast: boolean) => {
    if (status === "cancelled") return <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-red-50 text-red-600 uppercase tracking-wide">Cancelled</span>;
    if (isPast || status === "completed") return <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-600 uppercase tracking-wide">Completed</span>;
    if (status === "pending") return <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-yellow-50 text-yellow-600 uppercase tracking-wide">Pending</span>;
    return <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-50 text-[#36d1cf] uppercase tracking-wide">Confirmed</span>;
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* 
        NOTE: Local Header is completely removed. 
        Your global layout header will automatically take over this space cleanly.
      */}

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* =======================
            STEP: MAIN DASHBOARD
        ======================= */}
        {step === "results" && (
          <div>
            {/* CLEAN MINIMAL HEADER */}
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900">Your appointments</h1>
            </div>

            {/* TAB SYSTEM */}
            <div className="flex p-1 bg-gray-100 rounded-lg mb-8">
              {(["upcoming", "past", "cancelled"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-[13px] font-semibold rounded-md capitalize transition-all ${
                    activeTab === tab
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "past" ? "History" : tab}
                </button>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {/* APPOINTMENT LIST */}
            {filteredAppointments.length > 0 ? (
              <div className="space-y-4">
                {filteredAppointments.map((apt) => {
                  const isPast = checkIsPast(apt.appointment_date, apt.end_time);

                  return (
                    <div key={apt.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex gap-3 items-center">
                          <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-[15px]">{apt.doctors?.full_name || "Doctor"}</p>
                            <p className="text-[13px] font-medium text-gray-500">{apt.doctors?.specialization}</p>
                          </div>
                        </div>
                        {renderStatusBadge(apt.status, isPast)}
                      </div>

                      <div className="space-y-2 mb-5">
                        <div className="flex items-center gap-2.5 text-gray-600 text-[13px]">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{formatDate(apt.appointment_date)}</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-gray-600 text-[13px]">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{apt.start_time} - {apt.end_time}</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-gray-600 text-[13px]">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>{apt.clinics?.name}, {apt.clinics?.city}</span>
                        </div>
                      </div>

                      {/* SMART ACTION BUTTONS */}
                      <div className="pt-4 border-t border-gray-100 flex gap-2">
                        {!isPast && apt.status !== "cancelled" ? (
                          <>
                            <button onClick={() => handleRescheduleClick(apt)} className="flex-1 py-2.5 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-2">
                              <RefreshCw className="w-4 h-4" /> Reschedule
                            </button>
                            <button onClick={() => handleCancelClick(apt)} className="flex-1 py-2.5 bg-white border border-gray-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 text-gray-700 text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-2">
                              <X className="w-4 h-4" /> Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => router.push(FIND_DOCTORS_ROUTE)} className="flex-1 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold rounded-lg transition-colors flex justify-center items-center">
                              Book Again
                            </button>
                            {isPast && apt.status !== "cancelled" && (
                              <button className="flex-1 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-2">
                                <Star className="w-4 h-4" /> Leave Review
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
                <p className="text-gray-500 font-medium text-sm mb-4">No appointments found in {activeTab}.</p>
                <button onClick={() => router.push(FIND_DOCTORS_ROUTE)} className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold rounded-lg transition-colors">
                  Find a Doctor
                </button>
              </div>
            )}
          </div>
        )}

        {/* =======================
            STEP: CANCEL FLOW
        ======================= */}
        {step === "cancel" && selectedAppointment && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Cancel Appointment</h2>
            <p className="text-sm text-gray-500 mb-6">Please provide a reason to help the clinic manage their schedule.</p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-100 space-y-1">
              <p className="text-sm"><span className="font-semibold text-gray-700">Doctor:</span> {selectedAppointment.doctors?.full_name}</p>
              <p className="text-sm"><span className="font-semibold text-gray-700">Time:</span> {selectedAppointment.start_time} - {selectedAppointment.end_time}</p>
            </div>

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div>
                <input 
                  type="text" 
                  value={cancelReason} 
                  onChange={(e) => setCancelReason(e.target.value)} 
                  placeholder="Reason for cancellation (optional)" 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#36d1cf] focus:ring-1 focus:ring-[#36d1cf] transition-all" 
                />
              </div>

              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setStep("results"); setSelectedAppointment(null); }} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors">
                  Keep Appointment
                </button>
                <button type="submit" disabled={cancelling} className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                  {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Cancel"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =======================
            STEP: RESCHEDULE FLOW
        ======================= */}
        {step === "reschedule" && selectedAppointment && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Reschedule Appointment</h2>
            <p className="text-sm text-gray-500 mb-6">Select a new date and available time slot.</p>

            <form onSubmit={handleConfirmReschedule} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Select Date</label>
                <input 
                  type="date" 
                  value={newDate} 
                  onChange={(e) => setNewDate(e.target.value)} 
                  min={new Date().toISOString().split("T")[0]} 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#36d1cf] focus:ring-1 focus:ring-[#36d1cf] transition-all" 
                  required 
                />
              </div>

              <button type="button" onClick={handleLoadSlots} disabled={!newDate || loadingSlots} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-lg transition-colors disabled:opacity-50">
                {loadingSlots ? "Loading..." : "Check Availability"}
              </button>

              {availableSlots.length > 0 && (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Select Time</label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot) => (
                      <button 
                        key={slot.start_time} 
                        type="button" 
                        onClick={() => { setNewStartTime(slot.start_time); setNewEndTime(slot.end_time); }} 
                        className={`py-2 px-2 text-[13px] font-bold rounded-lg border transition-all ${newStartTime === slot.start_time ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200 hover:border-gray-400 text-gray-700"}`}
                      >
                        {slot.start_time}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setStep("results"); setSelectedAppointment(null); }} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors">
                  Back
                </button>
                <button type="submit" disabled={rescheduling || !newDate || !newStartTime} className="flex-1 py-3 bg-[#36d1cf] hover:bg-[#2ebab8] disabled:bg-teal-200 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                  {rescheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm New Time"}
                </button>
              </div>
            </form>
          </div>
        )}

      </main>
    </div>
  );
}
