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
  Star,
  Check,
  Send
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
  has_reviewed?: boolean; // Added for Review System
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
  // Added "review" to steps
  const [step, setStep] = useState<"results" | "cancel" | "reschedule" | "review">("results");
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  // Review System States
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  // --- API Fetch: Load Appointments & Cross-reference Reviews ---
  useEffect(() => {
    const fetchUserDataAndBookings = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);

          // 1. Resolve Patient ID
          let pId = null;
          const { data: profileById } = await supabase.from("patients").select("id").eq("id", user.id).maybeSingle();
          pId = profileById?.id;
          
          if (!pId && user.email) {
            const { data: profileByEmail } = await supabase.from("patients").select("id").eq("email", user.email).maybeSingle();
            pId = profileByEmail?.id;
          }
          setPatientId(pId);

          // 2. Fetch Appointments
          const response = await fetch(
            `/api/bookings/lookup?email=${encodeURIComponent(user.email || "")}&userId=${user.id}`
          );
          const data = await response.json();
          
          if (response.ok) {
            let fetchedAppointments = data.appointments || [];

            // 3. If Patient ID found, check which appointments are already reviewed
            if (pId) {
              const { data: reviewsData } = await supabase
                .from("reviews")
                .select("appointment_id")
                .eq("patient_id", pId);

              const reviewedIds = new Set(
                reviewsData?.map((r: { appointment_id: string }) => r.appointment_id) || []
              );

              fetchedAppointments = fetchedAppointments.map((apt: any) => ({
                ...apt,
                has_reviewed: reviewedIds.has(apt.id)
              }));
            }
            
            setAppointments(fetchedAppointments);
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

  // --- Actions ---
  const handleCancelClick = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setStep("cancel");
    setError(null);
    setCancelReason("");
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

  const handleReviewClick = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setStep("review");
    setError(null);
    setSuccess(null);
    setRating(5);
    setComment("");
  };

  // --- Submissions ---
  const handleConfirmCancel = async (e: React.FormEvent) => {
    // ... (Keep existing cancel logic exactly the same)
    e.preventDefault();
    if (!selectedAppointment) return;
    setCancelling(true);
    setError(null);
    try {
      const response = await fetch(`/api/appointment/${selectedAppointment.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancellation_reason: cancelReason.trim() || "Cancelled by patient", userId: currentUser?.id }),
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

  const handleLoadSlots = async () => {
     // ... (Keep existing load slots logic)
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
    // ... (Keep existing reschedule logic)
    e.preventDefault();
    if (!selectedAppointment || !newDate || !newStartTime || !newEndTime) return;
    setRescheduling(true);
    setError(null);
    try {
      const response = await fetch(`/api/appointment/${selectedAppointment.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_appointment_date: newDate, new_start_time: newStartTime, new_end_time: newEndTime, userId: currentUser?.id }),
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

  // NEW: Handle Review Submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment || !patientId) {
      setError("Patient profile not verified.");
      return;
    }
    setSubmittingReview(true);
    setError(null);
    try {
      const { error: reviewError } = await supabase.from("reviews").insert({
        doctor_id: selectedAppointment.doctors?.id,
        patient_id: patientId,
        appointment_id: selectedAppointment.id,
        rating,
        comment: comment.trim() || null,
        is_verified: true,
      });

      if (reviewError) {
        setError("Failed to submit your review. Please try again.");
      } else {
        setSuccess("Review submitted successfully!");
        setAppointments((prev) => 
          prev.map((a) => a.id === selectedAppointment.id ? { ...a, has_reviewed: true } : a)
        );
        setTimeout(() => {
          setStep("results");
          setSelectedAppointment(null);
          setSuccess(null);
        }, 2000);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setSubmittingReview(false);
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
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* =======================
            STEP: MAIN DASHBOARD
        ======================= */}
        {step === "results" && (
          <div>
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900">Your appointments</h1>
            </div>

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
                            
                            {/* NEW REVIEW LOGIC INTEGRATED HERE */}
                            {isPast && apt.status !== "cancelled" && (
                              apt.has_reviewed ? (
                                <div className="flex-1 py-2.5 bg-green-50 border border-green-100 text-green-700 text-sm font-bold rounded-lg flex justify-center items-center gap-2">
                                  <Check className="w-4 h-4" /> Reviewed
                                </div>
                              ) : (
                                <button onClick={() => handleReviewClick(apt)} className="flex-1 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-2">
                                  <Star className="w-4 h-4" /> Leave Review
                                </button>
                              )
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
            STEP: REVIEW FLOW (NEW)
        ======================= */}
        {step === "review" && selectedAppointment && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-sm">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-teal-50 border border-teal-100">
                <User className="w-8 h-8 text-[#36d1cf]" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Rate Dr. {selectedAppointment.doctors?.full_name}</h2>
              <p className="text-sm font-medium text-gray-500 mt-1">
                {selectedAppointment.clinics?.name} • {formatDate(selectedAppointment.appointment_date)}
              </p>
            </div>

            {success ? (
              <div className="text-center py-8 animate-fade-in">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-teal-50 border border-teal-100">
                  <Check className="w-8 h-8 text-[#36d1cf]" />
                </div>
                <p className="text-gray-900 font-bold">{success}</p>
                <p className="text-sm text-gray-500 mt-1">Returning to appointments list...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 text-center uppercase tracking-wider">
                    Your Rating
                  </label>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1.5 transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star
                          className="w-9 h-9 transition-colors"
                          style={{ 
                            color: star <= rating ? "#36d1cf" : "#e5e7eb", 
                            fill: star <= rating ? "#36d1cf" : "transparent" 
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Your Experience (optional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    placeholder="Describe how your appointment went. Sharing your experience helps other patients..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#36d1cf]/30 focus:border-[#36d1cf] resize-none text-sm"
                  />
                </div>

                {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setStep("results"); setSelectedAppointment(null); }}
                    className="flex-1 py-3 border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="flex-1 py-3 text-white font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-colors hover:bg-teal-600"
                    style={{ backgroundColor: "#36d1cf" }}
                  >
                    {submittingReview ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> 
                        Submit Review
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* =======================
            STEP: CANCEL FLOW
        ======================= */}
        {step === "cancel" && selectedAppointment && (
            // Note: I kept your existing Cancel UI intact to save space.
            // ... (Your Cancel UI goes here)
        )}

        {/* =======================
            STEP: RESCHEDULE FLOW
        ======================= */}
        {step === "reschedule" && selectedAppointment && (
            // Note: I kept your existing Reschedule UI intact to save space.
            // ... (Your Reschedule UI goes here)
        )}

      </main>
    </div>
  );
}
