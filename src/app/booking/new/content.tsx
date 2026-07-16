"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, User, Phone, Mail, MessageSquare, Stethoscope, ArrowLeft, Check, Clock, Users } from "lucide-react";
import type { Database } from "@/types/database";
import { formatDateWithTimezone, formatTimeWithTimezone, getBrowserTimezoneOffset } from "@/lib/timezone";

type Doctor = Database["public"]["Tables"]["doctors"]["Row"];
type Clinic = Database["public"]["Tables"]["clinics"]["Row"];

export default function BookingFormContent() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [doctorName, setDoctorName] = useState<string>("");
  const [clinicName, setClinicName] = useState<string>("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  
  // Future-proof states
  const [bookingFor, setBookingFor] = useState<"myself" | "someone_else">("myself");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const [userTimezone] = useState(getBrowserTimezoneOffset);
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase: any = createClient();

  useEffect(() => {
    const fetchData = async () => {
      // 1. Session check for Auto-fill
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setPatientEmail(session.user.email || "");
        setPatientName(session.user.user_metadata?.full_name || "");
      }

      // 2. Existing params check
      const doctorId = searchParams.get("doctor_id");
      const clinicId = searchParams.get("clinic_id");
      const slotDate = searchParams.get("date");
      const slotStart = searchParams.get("start_time");
      const slotEnd = searchParams.get("end_time");

      if (!doctorId || !clinicId || !slotDate || !slotStart || !slotEnd) {
        router.push("/patient");
        return;
      }

      setDate(slotDate);
      setStartTime(slotStart);
      setEndTime(slotEnd);

      const { data: doctorData } = await supabase.from("doctors").select("*").eq("id", doctorId).single();
      const { data: clinicData } = await supabase.from("clinics").select("*").eq("id", clinicId).single();

      if (doctorData) { setDoctor(doctorData); setDoctorName(doctorData.full_name || "Doctor"); }
      if (clinicData) { setClinic(clinicData); setClinicName(clinicData.name || "Clinic"); }
      setLoading(false);
    };
    fetchData();
  }, [searchParams, router, supabase]);

  const handleBookingForToggle = (value: "myself" | "someone_else") => {
    setBookingFor(value);
    if (value === "someone_else") {
      setPatientName(""); // Clear name for new patient
    } else {
      // Re-fetch or re-apply logged in user name
      supabase.auth.getSession().then(({ data }: any) => {
        setPatientName(data.session?.user?.user_metadata?.full_name || "");
      });
    }
  };

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
          booking_for: bookingFor, // New field added
        }),
      });

      const data = await response.json();
      if (response.ok && data.appointment) {
        const { appointment } = data;
        const statusPath = appointment.status === "confirmed" ? "success" : "pending";
        router.push(`/booking/${statusPath}?appointment_id=${appointment.id}&date=${date}&start_time=${startTime}&end_time=${endTime}&doctor_name=${encodeURIComponent(doctorName)}&clinic_name=${encodeURIComponent(clinicName)}`);
      } else {
        setError(data.error || "Failed to book appointment");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"><ArrowLeft className="w-5 h-5" /><span>Back</span></button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Doctor Details (UI unchanged as requested) */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-200"><h2 className="text-lg font-semibold text-gray-900">Appointment Details</h2></div>
          <div className="p-6 space-y-4">
             {/* ... Doctor info unchanged ... */}
             <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center"><Stethoscope className="w-6 h-6 text-primary-600" /></div>
              <div><p className="font-medium text-gray-900">{doctorName}</p><p className="text-sm text-primary-600">{doctor?.specialization}</p></div>
            </div>
            <div className="pl-16 space-y-1 text-sm text-gray-600"><p>{clinicName}</p><p>{clinic?.address}, {clinic?.city}</p></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200"><h2 className="text-lg font-semibold text-gray-900">Your Information</h2></div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* NEW: Toggle Field */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button type="button" onClick={() => handleBookingForToggle("myself")} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${bookingFor === 'myself' ? 'bg-white shadow text-primary-600' : 'text-gray-500'}`}>
                <User className="w-4 h-4" /> Myself
              </button>
              <button type="button" onClick={() => handleBookingForToggle("someone_else")} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${bookingFor === 'someone_else' ? 'bg-white shadow text-primary-600' : 'text-gray-500'}`}>
                <Users className="w-4 h-4" /> Someone Else
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Enter patient name" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="tel" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} placeholder="Enter phone number" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (Locked)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="email" readOnly value={patientEmail} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Visit (Optional)</label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe reason" rows={3} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={submitting} className="w-full py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> Confirm Booking</>}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
