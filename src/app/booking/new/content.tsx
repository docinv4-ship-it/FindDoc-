"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, User, Phone, Mail, MessageSquare, Stethoscope, ArrowLeft, Check, Clock } from "lucide-react";
import type { Database } from "@/types/database";
import { getTimezone, formatDateWithTimezone, formatTimeWithTimezone, getBrowserTimezoneOffset } from "@/lib/timezone";

type Doctor = Database["public"]["Tables"]["doctors"]["Row"];
type Clinic = Database["public"]["Tables"]["clinics"]["Row"];

export default function BookingFormContent() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [doctorName, setDoctorName] = useState<string>("");
  const [clinicName, setClinicName] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [userTimezone] = useState(getBrowserTimezoneOffset);
  const searchParams = useSearchParams();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const doctorId = searchParams.get("doctor_id");
      const clinicId = searchParams.get("clinic_id");
      const slotDate = searchParams.get("date");
      const slotStart = searchParams.get("start_time");
      const slotEnd = searchParams.get("end_time");
      const prefilledName = searchParams.get("name");
      const prefilledPhone = searchParams.get("phone");

      if (!doctorId || !clinicId || !slotDate || !slotStart || !slotEnd) {
        router.push("/patient");
        return;
      }

      setDate(slotDate);
      setStartTime(slotStart);
      setEndTime(slotEnd);
      if (prefilledName) setPatientName(prefilledName);
      if (prefilledPhone) setPatientPhone(prefilledPhone);

      const { data: doctorData } = await supabase.from("doctors").select("*").eq("id", doctorId).single();
      const { data: clinicData } = await supabase.from("clinics").select("*").eq("id", clinicId).single();

      if (doctorData) {
        setDoctor(doctorData);
        setDoctorName(doctorData.full_name || "Doctor");
      }
      if (clinicData) {
        setClinic(clinicData);
        setClinicName(clinicData.name || "Clinic");
      }
      setLoading(false);
    };
    fetchData();
  }, [searchParams, router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctor || !clinic || !patientName.trim() || !patientPhone.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: doctor.id,
          clinic_id: clinic.id,
          appointment_date: date,
          start_time: startTime,
          end_time: endTime,
          patient_name: patientName.trim(),
          patient_phone: patientPhone.trim(),
          patient_email: patientEmail.trim() || null,
          reason_for_visit: reason.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.appointment) {
        const { appointment } = data;
        if (appointment.status === "confirmed") {
          router.push(`/booking/success?appointment_id=${appointment.id}&date=${date}&start_time=${startTime}&end_time=${endTime}&doctor_name=${encodeURIComponent(doctorName)}&clinic_name=${encodeURIComponent(clinicName)}`);
        } else {
          router.push(`/booking/pending?appointment_id=${appointment.id}&date=${date}&start_time=${startTime}&end_time=${endTime}&doctor_name=${encodeURIComponent(doctorName)}&clinic_name=${encodeURIComponent(clinicName)}`);
        }
      } else {
        setError(data.error || "Failed to book appointment");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => formatDateWithTimezone(dateStr);
  const formatTime = (time: string) => formatTimeWithTimezone(time);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Appointment Details</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{doctorName}</p>
                <p className="text-sm text-primary-600">{doctor?.specialization}</p>
              </div>
            </div>
            <div className="pl-16 space-y-1 text-sm text-gray-600">
              <p>{clinicName}</p>
              <p>{clinic?.address}, {clinic?.city}</p>
            </div>
            <div className="pl-16 pt-2 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg">
                <span className="text-gray-600">{formatDate(date)}</span>
              </div>
              <div className="flex items-center gap-2 bg-primary-100 px-3 py-1.5 rounded-lg">
                <span className="text-primary-700 font-medium">{formatTime(startTime)} - {formatTime(endTime)}</span>
              </div>
              {clinic && (
                <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg">
                  <span className="text-green-700 font-medium">Consultation Fee: ${clinic.consultation_fee}</span>
                </div>
              )}
            </div>
            <div className="pl-16 pt-2 flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Times shown in your timezone ({userTimezone})</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Information</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Enter your full name" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="tel" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} placeholder="Enter your phone number" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="email" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} placeholder="Enter your email" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Visit (Optional)</label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Briefly describe your reason for visit" rows={3} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={submitting || !patientName.trim() || !patientPhone.trim()} className="w-full py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> Confirm Booking</>}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
