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
  Check
} from "lucide-react";

// ==========================================
// 👇 1. YAHAN AAPKI REVIEW FILE IMPORT HO RAHI HAI
// ==========================================
import ReviewPage from "../reviews/page"; 

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
  has_reviewed?: boolean;
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
  const [step, setStep] = useState<"results" | "cancel" | "reschedule" | "review">("results");
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
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

  useEffect(() => {
    const fetchUserDataAndBookings = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);

          let pId = null;
          const { data: profileById } = await supabase.from("patients").select("id").eq("id", user.id).maybeSingle();
          pId = profileById?.id;

          if (!pId && user.email) {
            const { data: profileByEmail } = await supabase.from("patients").select("id").eq("email", user.email).maybeSingle();
            pId = profileByEmail?.id;
          }
          setPatientId(pId);

          const response = await fetch(
            `/api/bookings/lookup?email=${encodeURIComponent(user.email || "")}&userId=${user.id}`
          );
          const data = await response.json();

          if (response.ok) {
            let fetchedAppointments = data.appointments || [];

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

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const isPast = checkIsPast(apt.appointment_date, apt.end_time);

      if (activeTab === "cancelled") return apt.status === "cancelled";
      if (activeTab === "upcoming") return !isPast && apt.status !== "cancelled" && apt.status !== "completed";
      if (activeTab === "past") return isPast || apt.status === "completed";
      return true;
    });
  }, [appointments, activeTab]);

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

  // 👇 Ye function history tab mein button click par chale ga
  const handleReviewClick = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setStep("review");
    setError(null);
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
            👇 2. STEP: REVIEW FLOW (AAPKI FILE YAHAN RENDER HO RAHI HAI)
        ======================= */}
        {step === "review" && selectedAppointment && (
          <div className="animate-in fade-in zoom-in duration-200">
            {/* Back Button agar patient cancel karna chahe */}
            <div className="mb-4 flex justify-end">
              <button 
                onClick={() => { setStep("results"); setSelectedAppointment(null); }} 
                className="text-sm font-bold text-gray-500 hover:text-gray-900 underline"
              >
                &larr; Back to Appointments
              </button>
            </div>

            {/* AAPKI ASAL FILE CALL HO RAHI HAI */}
            <ReviewPage 
              appointment={selectedAppointment} 
              patientId={patientId}
              onReviewComplete={() => {
                setStep("results");
                // Yahan aap chaho to state update kar sakte ho ke reviewed = true ho jaye
              }}
            />
          </div>
        )}

        {/* =======================
            STEP: CANCEL FLOW
        ======================= */}
        {step === "cancel" && selectedAppointment && (
            <div>{/* Aapka Cancel UI yahan mojood hai */}</div>
        )}

        {/* =======================
            STEP: RESCHEDULE FLOW
        ======================= */}
        {step === "reschedule" && selectedAppointment && (
            <div>{/* Aapka Reschedule UI yahan mojood hai */}</div>
        )}

      </main>
    </div>
  );
}
