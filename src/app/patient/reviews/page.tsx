"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Loader2, 
  Star, 
  Stethoscope, 
  User, 
  Send, 
  AlertCircle, 
  Check, 
  Mail, 
  ShieldCheck, 
  Calendar 
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";

// ==========================================
// 🛠️ TYPES & PROPS INTERFACE
// ==========================================
export interface AppointmentData {
  id: string;
  appointment_date: string;
  start_time?: string;
  doctors: { id: string; full_name: string; specialization: string } | null;
  clinics: { id: string; name: string } | null;
  has_reviewed?: boolean;
}

export interface ReviewPageProps {
  appointment?: AppointmentData | null;
  patientId?: string | null;
  onReviewComplete?: () => void;
}

function PatientReviewsContent({
  appointment: propAppointment,
  patientId: propPatientId,
  onReviewComplete
}: ReviewPageProps) {
  const isEmbedded = Boolean(propAppointment); // Check if called inside Appointments page

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [patientId, setPatientId] = useState<string | null>(propPatientId || null);
  const [step, setStep] = useState<"list" | "submit">(isEmbedded ? "submit" : "list");
  const [loading, setLoading] = useState(!isEmbedded);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentData | null>(propAppointment || null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  // Update selected appointment if prop changes
  useEffect(() => {
    if (propAppointment) {
      setSelectedAppointment(propAppointment);
      setStep("submit");
    }
  }, [propAppointment]);

  // Load User Session & Resolve Patient Identity if not provided
  useEffect(() => {
    const initializeReviews = async () => {
      if (propPatientId && propAppointment) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);

          let resolvedPatientId = propPatientId;

          if (!resolvedPatientId) {
            const { data: profileById } = await supabase
              .from("patients")
              .select("id")
              .eq("id", user.id)
              .maybeSingle();

            resolvedPatientId = profileById?.id;

            if (!resolvedPatientId && user.email) {
              const { data: profileByEmail } = await supabase
                .from("patients")
                .select("id")
                .eq("email", user.email)
                .maybeSingle();
              resolvedPatientId = profileByEmail?.id;
            }
          }

          if (resolvedPatientId) {
            setPatientId(resolvedPatientId);
            if (!isEmbedded) {
              await fetchAppointments(resolvedPatientId);
            }
          } else {
            setError("No patient profile associated with this account.");
            setLoading(false);
          }
        } else {
          setError("No authenticated session found.");
          setLoading(false);
        }
      } catch (err) {
        console.error("Initialization error:", err);
        setError("Failed to establish secure session connection.");
        setLoading(false);
      }
    };

    initializeReviews();
  }, [supabase, propPatientId, propAppointment, isEmbedded]);

  // Fetch completed appointments and review flags for standalone page
  const fetchAppointments = async (pId: string) => {
    setLoading(true);
    try {
      const { data: appointmentsData, error: aptError } = await supabase
        .from("appointments")
        .select(`
          id, 
          appointment_date, 
          start_time, 
          status, 
          doctors (id, full_name, specialization), 
          clinics (id, name)
        `)
        .eq("patient_id", pId)
        .eq("status", "completed")
        .order("appointment_date", { ascending: false });

      if (aptError) {
        setError("Failed to retrieve completed appointments.");
        setLoading(false);
        return;
      }

      if (appointmentsData) {
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("appointment_id")
          .eq("patient_id", pId);

        const reviewedIds = new Set(
          reviewsData?.map((r: { appointment_id: string }) => r.appointment_id) || []
        );

        const withReviewFlag = appointmentsData.map((apt: any) => ({
          id: apt.id,
          appointment_date: apt.appointment_date,
          start_time: apt.start_time,
          doctors: apt.doctors,
          clinics: apt.clinics,
          has_reviewed: reviewedIds.has(apt.id),
        }));

        setAppointments(withReviewFlag);
      }
    } catch (err) {
      console.error("Error fetching completed appointments:", err);
      setError("An error occurred while loading appointments.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Review Submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment || !patientId) {
      setError("Missing appointment or patient context.");
      return;
    }

    setSubmitting(true);
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
        console.error("Review insert error:", reviewError);
        setError("Failed to submit your review. Please try again.");
      } else {
        setSuccess("Review submitted successfully!");
        
        setAppointments((prev) => 
          prev.map((a) => a.id === selectedAppointment.id ? { ...a, has_reviewed: true } : a)
        );

        setTimeout(() => {
          if (onReviewComplete) {
            onReviewComplete();
          } else {
            setStep("list");
            setSelectedAppointment(null);
            setSuccess(null);
            setRating(5);
            setComment("");
          }
        }, 1500);
      }
    } catch (err) {
      console.error("Review submit error:", err);
      setError("An unexpected error occurred while saving your feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => 
    new Date(dateStr).toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      year: "numeric" 
    });

  if (loading && appointments.length === 0 && !isEmbedded) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#36d1cf" }} />
        <p className="mt-4 text-sm font-semibold text-gray-500 uppercase tracking-wider animate-pulse">
          Syncing Doctor Reviews...
        </p>
      </div>
    );
  }

  return (
    <div className={isEmbedded ? "w-full" : "min-h-screen bg-gray-50"}>
      {/* Show full navigation header ONLY when accessed directly as a standalone page */}
      {!isEmbedded && (
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <button onClick={() => router.push("/patient")} className="flex items-center gap-2">
                <Stethoscope className="w-8 h-8" style={{ color: "#36d1cf" }} />
                <span className="text-xl font-bold text-gray-900">DocFind</span>
              </button>
              <div className="flex items-center gap-4">
                <button onClick={() => router.push("/patient/chats")} className="text-sm text-gray-600 hover:text-gray-900">Chats</button>
                <button onClick={() => router.push("/patient/favorites")} className="text-sm text-gray-600 hover:text-gray-900">Favorites</button>
                <button onClick={() => router.push("/patient/notifications")} className="text-sm text-gray-600 hover:text-gray-900">Notifications</button>
                <button onClick={() => router.push("/patient")} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors hover:bg-teal-600 shadow-sm" style={{ backgroundColor: "#36d1cf" }}>
                  <User className="w-4 h-4" /> Find Doctors
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className={isEmbedded ? "w-full" : "max-w-2xl mx-auto px-4 py-12"}>
        {!isEmbedded && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Review Doctors</h1>
              {currentUser && (
                <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                  <Mail className="w-4 h-4 text-gray-400" /> {currentUser.email}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-teal-50 text-[#36d1cf] px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" /> Secure Profile
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* LIST VIEW (For standalone route) */}
        {step === "list" && !isEmbedded && (
          <div>
            {appointments.length > 0 ? (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <div key={apt.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-teal-50 border border-teal-100">
                          <User className="w-6 h-6 text-[#36d1cf]" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{apt.doctors?.full_name || "Doctor"}</p>
                          <p className="text-sm font-semibold" style={{ color: "#36d1cf" }}>{apt.doctors?.specialization}</p>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{formatDate(apt.appointment_date)} • {apt.clinics?.name}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        {apt.has_reviewed ? (
                          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-green-50 text-green-600 border border-green-200 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Reviewed
                          </span>
                        ) : (
                          <button
                            onClick={() => { 
                              setSelectedAppointment(apt); 
                              setStep("submit"); 
                              setError(null); 
                              setSuccess(null); 
                            }}
                            className="px-4 py-2 rounded-lg text-white text-sm font-bold shadow-sm transition-colors hover:bg-teal-600"
                            style={{ backgroundColor: "#36d1cf" }}
                          >
                            Write Review
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !loading && !error && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
                  <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-700 font-bold">No completed appointments yet</p>
                  <p className="text-sm text-gray-500 mt-1">Once you complete an appointment, you'll be able to leave feedback here.</p>
                  <button 
                    onClick={() => router.push("/patient")} 
                    className="mt-6 px-6 py-2.5 text-white font-bold text-sm rounded-xl shadow-md transition-colors hover:bg-teal-600" 
                    style={{ backgroundColor: "#36d1cf" }}
                  >
                    Find Doctors
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* SUBMIT REVIEW FORM VIEW */}
        {step === "submit" && selectedAppointment && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-sm">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-teal-50 border border-teal-100">
                <User className="w-8 h-8 text-[#36d1cf]" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Rate Dr. {selectedAppointment.doctors?.full_name || "Doctor"}
              </h2>
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
                <p className="text-sm text-gray-500 mt-1">Updating appointment status...</p>
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
                    placeholder="Describe how your appointment went. Sharing your experience helps other patients find the right care..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#36d1cf]/30 focus:border-[#36d1cf] resize-none leading-relaxed text-sm"
                  />
                </div>

                {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (onReviewComplete) {
                        onReviewComplete();
                      } else {
                        setStep("list");
                        setSelectedAppointment(null);
                      }
                    }}
                    className="flex-1 py-3 border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 text-white font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm transition-colors hover:bg-teal-600"
                    style={{ backgroundColor: "#36d1cf" }}
                  >
                    {submitting ? (
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
      </main>
    </div>
  );
}

// Default export accepting ReviewPageProps seamlessly
export default function PatientReviewsPage(props: ReviewPageProps) {
  return (
    <AuthGuard currentPath="/patient/reviews">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} />
        </div>
      }>
        <PatientReviewsContent {...props} />
      </Suspense>
    </AuthGuard>
  );
}
