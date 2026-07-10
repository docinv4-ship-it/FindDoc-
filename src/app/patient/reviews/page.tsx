"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Phone, Lock, Star, Stethoscope, User, Send, AlertCircle, Check } from "lucide-react";

interface CompletedAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  doctors: { id: string; full_name: string; specialization: string } | null;
  clinics: { id: string; name: string } | null;
  has_reviewed: boolean;
}

function PatientReviewsContent() {
  const [step, setStep] = useState<"phone" | "otp" | "list" | "submit">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<CompletedAppointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<CompletedAppointment | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingOtp(true);
    setError(null);
    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), purpose: "lookup" }),
      });
      const data = await response.json();
      if (response.ok) {
        setVerificationId(data.verification_id);
        setStep("otp");
      } else {
        setError(data.error || "Failed to send OTP");
      }
    } catch {
      setError("An error occurred");
    }
    setSendingOtp(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyingOtp(true);
    setError(null);
    try {
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verification_id: verificationId, otp: otp.trim() }),
      });
      if (response.ok) {
        await fetchAppointments();
      } else {
        setError("Invalid OTP");
      }
    } catch {
      setError("An error occurred");
    }
    setVerifyingOtp(false);
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data: patientData } = await supabase.from("patients").select("id").eq("phone", phone.trim()).single();
      if (!patientData) {
        setError("No patient found with this phone number");
        setLoading(false);
        return;
      }
      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select(`id, appointment_date, start_time, status, doctors (id, full_name, specialization), clinics (id, name)`)
        .eq("patient_id", patientData.id)
        .eq("status", "completed")
        .order("appointment_date", { ascending: false });
      if (appointmentsData) {
        const { data: reviewsData } = await supabase.from("reviews").select("appointment_id").eq("patient_id", patientData.id);
        const reviewedIds = new Set(reviewsData?.map((r: { appointment_id: string }) => r.appointment_id) || []);
        const withReviewFlag = appointmentsData.map((apt: CompletedAppointment) => ({
          ...apt,
          has_reviewed: reviewedIds.has(apt.id),
        }));
        setAppointments(withReviewFlag);
        setStep("list");
      }
    } catch {
      setError("Failed to load appointments");
    }
    setLoading(false);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data: patientData } = await supabase.from("patients").select("id").eq("phone", phone.trim()).single();
      if (!patientData) {
        setError("Patient not found");
        setSubmitting(false);
        return;
      }
      const { error: reviewError } = await supabase.from("reviews").insert({
        doctor_id: selectedAppointment.doctors?.id,
        patient_id: patientData.id,
        appointment_id: selectedAppointment.id,
        rating,
        comment: comment.trim() || null,
        is_verified: true,
      });
      if (reviewError) {
        setError("Failed to submit review");
      } else {
        setSuccess("Review submitted successfully!");
        setAppointments((prev) => prev.map((a) => a.id === selectedAppointment.id ? { ...a, has_reviewed: true } : a));
        setTimeout(() => {
          setStep("list");
          setSelectedAppointment(null);
          setSuccess(null);
          setRating(5);
          setComment("");
        }, 2000);
      }
    } catch {
      setError("An error occurred");
    }
    setSubmitting(false);
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <button onClick={() => router.push("/patient")} className="flex items-center gap-2">
              <Stethoscope className="w-8 h-8" style={{ color: "#36d1cf" }} />
              <span className="text-xl font-bold text-gray-900">DocFind</span>
            </button>
            <nav className="flex items-center gap-4">
              <button onClick={() => router.push("/patient/favorites")} className="text-sm text-gray-600 hover:text-gray-900">Favorites</button>
              <button onClick={() => router.push("/patient/chats")} className="text-sm text-gray-600 hover:text-gray-900">Chats</button>
              <button onClick={() => router.push("/patient")} className="text-sm font-medium" style={{ color: "#36d1cf" }}>Find Doctors</button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        {step === "phone" && (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#e6faf9" }}>
                <Star className="w-8 h-8" style={{ color: "#36d1cf" }} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Leave a Review</h1>
              <p className="text-gray-600 mt-2">Verify your phone to review completed appointments</p>
            </div>
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" required />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={sendingOtp || !phone.trim()} className="w-full py-3 text-white font-medium rounded-lg disabled:opacity-50 transition-colors" style={{ backgroundColor: "#36d1cf" }}>
                {sendingOtp ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Continue"}
              </button>
            </form>
          </div>
        )}

        {step === "otp" && (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#e6faf9" }}>
                <Lock className="w-8 h-8" style={{ color: "#36d1cf" }} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Verify</h1>
              <p className="text-gray-600 mt-2">Code sent to {phone}</p>
            </div>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter code" maxLength={6} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-center text-2xl tracking-widest" required />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={verifyingOtp || !otp.trim()} className="w-full py-3 text-white font-medium rounded-lg disabled:opacity-50" style={{ backgroundColor: "#36d1cf" }}>
                {verifyingOtp ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Verify"}
              </button>
            </form>
          </div>
        )}

        {step === "list" && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Your Completed Appointments</h1>
              <p className="text-gray-600 mt-1">Leave reviews for doctors you've visited</p>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} /></div>
            ) : appointments.length > 0 ? (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <div key={apt.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
                          <User className="w-6 h-6" style={{ color: "#36d1cf" }} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{apt.doctors?.full_name || "Doctor"}</p>
                          <p className="text-sm" style={{ color: "#36d1cf" }}>{apt.doctors?.specialization}</p>
                          <p className="text-xs text-gray-500 mt-1">{formatDate(apt.appointment_date)} • {apt.clinics?.name}</p>
                        </div>
                      </div>
                      {apt.has_reviewed ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Reviewed
                        </span>
                      ) : (
                        <button
                          onClick={() => { setSelectedAppointment(apt); setStep("submit"); setError(null); setSuccess(null); }}
                          className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                          style={{ backgroundColor: "#36d1cf" }}
                        >
                          Write Review
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No completed appointments yet</p>
                <p className="text-sm text-gray-400 mt-1">Complete an appointment to leave a review</p>
                <button onClick={() => router.push("/patient")} className="mt-4 text-sm font-medium" style={{ color: "#36d1cf" }}>Find Doctors</button>
              </div>
            )}
          </div>
        )}

        {step === "submit" && selectedAppointment && (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#e6faf9" }}>
                <User className="w-8 h-8" style={{ color: "#36d1cf" }} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Rate Dr. {selectedAppointment.doctors?.full_name}</h2>
              <p className="text-sm text-gray-500">{selectedAppointment.clinics?.name} • {formatDate(selectedAppointment.appointment_date)}</p>
            </div>

            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#e6faf9" }}>
                  <Check className="w-8 h-8" style={{ color: "#239999" }} />
                </div>
                <p className="text-gray-900 font-medium">{success}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3 text-center">Your Rating</label>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-2 transition-transform hover:scale-110"
                      >
                        <Star
                          className="w-8 h-8 transition-colors"
                          style={{ color: star <= rating ? "#36d1cf" : "#e5e7eb", fill: star <= rating ? "#36d1cf" : "transparent" }}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Review (optional)</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    placeholder="Share your experience with this doctor..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setStep("list"); setSelectedAppointment(null); }}
                    className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 text-white font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: "#36d1cf" }}
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Submit Review</>}
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

export default function PatientReviewsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} /></div>}>
      <PatientReviewsContent />
    </Suspense>
  );
}
