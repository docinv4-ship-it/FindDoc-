"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, Phone, Lock, Calendar, Clock, MapPin, User, Stethoscope, Check, X, AlertCircle, RefreshCw } from "lucide-react";

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
  const [step, setStep] = useState<"phone" | "otp" | "results" | "cancel" | "reschedule">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [cancelOtp, setCancelOtp] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<{start_time: string; end_time: string}[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleOtp, setRescheduleOtp] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
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
      setError("An error occurred. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || !verificationId) return;
    setVerifyingOtp(true);
    setError(null);
    try {
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verification_id: verificationId, otp: otp.trim() }),
      });
      const data = await response.json();
      if (response.ok) {
        const lookupResponse = await fetch(`/api/bookings/lookup?phone=${encodeURIComponent(phone.trim())}&verification_id=${verificationId}`);
        const lookupData = await lookupResponse.json();
        if (lookupResponse.ok) {
          setAppointments(lookupData.appointments || []);
          setStep("results");
        } else {
          setError(lookupData.error || "Failed to fetch appointments");
        }
      } else {
        setError(data.error || "Invalid OTP");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleCancelClick = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setStep("cancel");
    setError(null);
    setCancelOtp("");
    setCancelReason("");
  };

  const handleSendCancelOtp = async () => {
    if (!phone.trim()) return;
    setSendingOtp(true);
    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), purpose: "cancel" }),
      });
      if (response.ok) setError(null);
      else setError("Failed to send OTP");
    } catch {
      setError("Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment || !cancelOtp.trim()) return;
    setCancelling(true);
    setError(null);
    try {
      const response = await fetch(`/api/appointment/${selectedAppointment.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), otp_code: cancelOtp.trim(), cancellation_reason: cancelReason.trim() || "Cancelled by patient" }),
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
    setRescheduleOtp("");
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

  const handleSendRescheduleOtp = async () => {
    if (!phone.trim()) return;
    setSendingOtp(true);
    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), purpose: "reschedule" }),
      });
      if (response.ok) setError(null);
      else setError("Failed to send OTP");
    } catch {
      setError("Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment || !rescheduleOtp.trim() || !newDate || !newStartTime || !newEndTime) return;
    setRescheduling(true);
    setError(null);
    try {
      const response = await fetch(`/api/appointment/${selectedAppointment.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          otp_code: rescheduleOtp.trim(),
          new_appointment_date: newDate,
          new_start_time: newStartTime,
          new_end_time: newEndTime,
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {step === "phone" && (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Find Your Appointments</h1>
              <p className="text-gray-600 mt-2">Enter your phone number to view your booked appointments</p>
            </div>

            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" required />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={sendingOtp || !phone.trim()} className="w-full py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                {sendingOtp ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Verification Code"}
              </button>
            </form>
          </div>
        )}

        {step === "otp" && (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Verify Your Number</h1>
              <p className="text-gray-600 mt-2">We sent a verification code to {phone}</p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="relative">
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter verification code" maxLength={6} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-500" required />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={verifyingOtp || !otp.trim()} className="w-full py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                {verifyingOtp ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & View Appointments"}
              </button>
              <button type="button" onClick={() => { setStep("phone"); setOtp(""); setError(null); }} className="w-full py-2 text-gray-600 hover:text-gray-900 text-sm">
                Use a different number
              </button>
            </form>
          </div>
        )}

        {step === "results" && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Your Appointments</h1>
              <p className="text-gray-600 mt-1">Phone: {phone}</p>
            </div>

            {appointments.length > 0 ? (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <div key={apt.id} className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{apt.doctors?.full_name || "Doctor"}</p>
                          <p className="text-sm text-primary-600">{apt.doctors?.specialization}</p>
                        </div>
                      </div>
                      {getStatusBadge(apt.status)}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
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
                        <p className="text-sm text-gray-500 mt-2">
                          <span className="font-medium">Reason:</span> {apt.reason_for_visit}
                        </p>
                      )}
                    </div>

                    {["pending", "confirmed"].includes(apt.status) && (
                      <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
                        <button onClick={() => handleRescheduleClick(apt)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary-100 hover:bg-primary-200 text-primary-700 font-medium rounded-lg transition-colors">
                          <RefreshCw className="w-4 h-4" /> Reschedule
                        </button>
                        <button onClick={() => handleCancelClick(apt)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-colors">
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
                <p className="text-gray-600 font-medium">No appointments found</p>
                <p className="text-sm text-gray-500 mt-1">No appointments were found for this phone number</p>
                <button onClick={() => router.push("/patient")} className="mt-4 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors">
                  Find a Doctor
                </button>
              </div>
            )}
          </div>
        )}

        {step === "cancel" && selectedAppointment && (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Cancel Appointment</h1>
              <p className="text-gray-600 mt-2">Are you sure you want to cancel this appointment?</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
              <p className="text-sm"><span className="font-medium">Date:</span> {formatDate(selectedAppointment.appointment_date)}</p>
              <p className="text-sm"><span className="font-medium">Time:</span> {selectedAppointment.start_time} - {selectedAppointment.end_time}</p>
              <p className="text-sm"><span className="font-medium">Doctor:</span> {selectedAppointment.doctors?.full_name}</p>
            </div>

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for cancellation (optional)</label>
                <input type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Enter reason" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">We need to verify your identity</p>
                <button type="button" onClick={handleSendCancelOtp} disabled={sendingOtp} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  {sendingOtp ? "Sending..." : "Send OTP"}
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP to confirm cancellation</label>
                <input type="text" value={cancelOtp} onChange={(e) => setCancelOtp(e.target.value)} maxLength={6} placeholder="Enter 6-digit OTP" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-500" required />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => { setStep("results"); setSelectedAppointment(null); }} className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  Go Back
                </button>
                <button type="submit" disabled={cancelling || !cancelOtp.trim()} className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                  {cancelling ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Cancellation"}
                </button>
              </div>
            </form>
          </div>
        )}

        {step === "reschedule" && selectedAppointment && (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-8 h-8 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Reschedule Appointment</h1>
              <p className="text-gray-600 mt-2">Select a new date and time for your appointment</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
              <p className="text-sm"><span className="font-medium">Current Date:</span> {formatDate(selectedAppointment.appointment_date)}</p>
              <p className="text-sm"><span className="font-medium">Current Time:</span> {selectedAppointment.start_time} - {selectedAppointment.end_time}</p>
            </div>

            <form onSubmit={handleConfirmReschedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Date</label>
                <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} min={new Date().toISOString().split("T")[0]} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" required />
              </div>
              <button type="button" onClick={handleLoadSlots} disabled={!newDate || loadingSlots} className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50">
                {loadingSlots ? "Loading..." : "Load Available Slots"}
              </button>
              {availableSlots.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select New Time</label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot) => (
                      <button key={slot.start_time} type="button" onClick={() => { setNewStartTime(slot.start_time); setNewEndTime(slot.end_time); }} className={`py-2 px-3 text-sm rounded-lg border transition-colors ${newStartTime === slot.start_time ? "bg-primary-500 text-white border-primary-500" : "bg-white border-gray-200 hover:border-primary-300"}`}>
                        {slot.start_time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">We need to verify your identity</p>
                <button type="button" onClick={handleSendRescheduleOtp} disabled={sendingOtp} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  {sendingOtp ? "Sending..." : "Send OTP"}
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP to confirm reschedule</label>
                <input type="text" value={rescheduleOtp} onChange={(e) => setRescheduleOtp(e.target.value)} maxLength={6} placeholder="Enter 6-digit OTP" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-500" required />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => { setStep("results"); setSelectedAppointment(null); }} className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  Go Back
                </button>
                <button type="submit" disabled={rescheduling || !rescheduleOtp.trim() || !newDate || !newStartTime} className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
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
