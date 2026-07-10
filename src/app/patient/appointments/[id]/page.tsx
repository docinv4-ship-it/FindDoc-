"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Calendar, Clock, MapPin, User, Loader2, CheckCircle, XCircle,
  Phone, Mail, FileText, Download, Share2, Printer, ArrowLeft, AlertCircle
} from "lucide-react";

interface AppointmentDetails {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  reason_for_visit: string | null;
  created_at: string;
  updated_at: string;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  rescheduled_from: Record<string, unknown> | null;
  rescheduled_at: string | null;
  clinics: {
    id: string;
    name: string;
    address: string;
    city: string;
    phone: string | null;
    email: string | null;
    consultation_fee: number;
  } | null;
  doctors: {
    id: string;
    full_name: string;
    specialization: string;
    phone: string | null;
    email: string;
    profile_image_url: string | null;
  } | null;
  patients: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
  } | null;
}

function AppointmentDetailContent() {
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  const appointmentId = searchParams.get("id");

  useEffect(() => {
    const fetchAppointment = async () => {
      if (!appointmentId) {
        setError("No appointment ID provided");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/appointment/${appointmentId}`);
        const data = await response.json();

        if (response.ok) {
          setAppointment(data.appointment);
        } else {
          setError(data.error || "Failed to load appointment");
        }
      } catch {
        setError("Failed to load appointment details");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [appointmentId]);

  const generateBookingReference = () => {
    if (!appointment) return "";
    const dateStr = new Date(appointment.created_at).getTime().toString(36).toUpperCase();
    return `DF-${dateStr}-${appointment.id.slice(0, 6).toUpperCase()}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStatusIcon = () => {
    if (!appointment) return null;
    switch (appointment.status) {
      case "confirmed":
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case "completed":
        return <CheckCircle className="w-6 h-6 text-blue-600" />;
      case "cancelled":
        return <XCircle className="w-6 h-6 text-gray-500" />;
      case "no_show":
        return <AlertCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Clock className="w-6 h-6 text-yellow-600" />;
    }
  };

  const getStatusBadge = () => {
    if (!appointment) return null;
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      confirmed: "bg-green-100 text-green-800 border-green-200",
      completed: "bg-blue-100 text-blue-800 border-blue-200",
      cancelled: "bg-gray-100 text-gray-800 border-gray-200",
      no_show: "bg-red-100 text-red-800 border-red-200",
    };
    return (
      <span className={`px-4 py-2 rounded-full text-sm font-medium border ${styles[appointment.status] || "bg-gray-100 text-gray-800 border-gray-200"}`}>
        {appointment.status === "no_show" ? "No Show" : appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
      </span>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!appointment) return;
    const shareData = {
      title: `Appointment with Dr. ${appointment.doctors?.full_name}`,
      text: `My appointment is on ${formatDate(appointment.appointment_date)} at ${formatTime(appointment.start_time)}`,
      url: window.location.href,
    };
    if (navigator.share) {
      await navigator.share(shareData);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Appointment Not Found</h1>
          <p className="text-gray-600 mb-4">{error || "The requested appointment could not be found."}</p>
          <button
            onClick={() => router.push("/patient/appointments")}
            className="px-6 py-2 text-white rounded-lg font-medium"
            style={{ backgroundColor: "#36d1cf" }}
          >
            View All Appointments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 print:py-0">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 print:shadow-none">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              {getStatusIcon()}
              <div>
                <h1 className="text-xl font-bold text-gray-900">Appointment Details</h1>
                <p className="text-gray-500 text-sm">Reference: {generateBookingReference()}</p>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Date and Time */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 print:shadow-none">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Appointment</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium text-gray-900">{formatDate(appointment.appointment_date)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Time</p>
                    <p className="font-medium text-gray-900">{formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</p>
                  </div>
                </div>
              </div>
              {appointment.reason_for_visit && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Reason for Visit</p>
                  <p className="text-gray-900">{appointment.reason_for_visit}</p>
                </div>
              )}
            </div>

            {/* Doctor Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 print:shadow-none">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Doctor</h2>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
                  {appointment.doctors?.profile_image_url ? (
                    <img src={appointment.doctors.profile_image_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="w-7 h-7" style={{ color: "#36d1cf" }} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Dr. {appointment.doctors?.full_name}</p>
                  <p className="text-sm" style={{ color: "#36d1cf" }}>{appointment.doctors?.specialization}</p>
                  <div className="mt-2 space-y-1">
                    {appointment.doctors?.phone && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Phone className="w-4 h-4" /> {appointment.doctors.phone}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Mail className="w-4 h-4" /> {appointment.doctors?.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Clinic Info */}
            {appointment.clinics && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 print:shadow-none">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Clinic</h2>
                <div className="space-y-2">
                  <p className="font-medium text-gray-900">{appointment.clinics.name}</p>
                  <div className="flex items-start gap-2 text-gray-600">
                    <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{appointment.clinics.address}, {appointment.clinics.city}</span>
                  </div>
                  {appointment.clinics.phone && (
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Phone className="w-4 h-4" /> {appointment.clinics.phone}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Status History */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 print:shadow-none">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Status History</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-gray-500">Booked:</span>
                  <span className="text-gray-900">{formatDate(appointment.created_at)}</span>
                </div>
                {appointment.status === "cancelled" && appointment.cancelled_at && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-gray-500">{appointment.cancelled_by === "doctor" ? "Cancelled by doctor" : "Cancelled by patient"}:</span>
                    <span className="text-gray-900">{formatDate(appointment.cancelled_at)}</span>
                    {appointment.cancellation_reason && (
                      <span className="text-gray-500 ml-2">({appointment.cancellation_reason})</span>
                    )}
                  </div>
                )}
                {appointment.status === "completed" && appointment.completed_at && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-gray-500">Completed:</span>
                    <span className="text-gray-900">{formatDate(appointment.completed_at)}</span>
                  </div>
                )}
                {appointment.rescheduled_from && appointment.rescheduled_at && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-gray-500">Rescheduled:</span>
                    <span className="text-gray-900">{formatDate(appointment.rescheduled_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Receipt */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 print:shadow-none">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Consultation Fee</h2>
              <div className="text-center py-4">
                <p className="text-4xl font-bold text-gray-900">
                  ${appointment.clinics?.consultation_fee || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">per visit</p>
              </div>
              <div className="border-t border-gray-100 pt-4 mt-4">
                <p className="text-xs text-gray-500">This is a confirmation of your booking. Payment is typically collected at the clinic during your visit.</p>
              </div>
            </div>

            {/* Patient Info */}
            {appointment.patients && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 print:shadow-none">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Patient</h2>
                <div className="space-y-2">
                  <p className="font-medium text-gray-900">{appointment.patients.full_name}</p>
                  {appointment.patients.phone && (
                    <p className="text-sm text-gray-600">{appointment.patients.phone}</p>
                  )}
                  {appointment.patients.email && (
                    <p className="text-sm text-gray-600">{appointment.patients.email}</p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 print:hidden">
              <h2 className="text-sm font-semibold text-gray-500 mb-3">Actions</h2>
              <div className="space-y-2">
                <button
                  onClick={handlePrint}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button
                  onClick={handleShare}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AppointmentDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} />
      </div>
    }>
      <AppointmentDetailContent />
    </Suspense>
  );
}
