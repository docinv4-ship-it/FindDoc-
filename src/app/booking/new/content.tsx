"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, User, Phone, Mail, MessageSquare, Stethoscope, ArrowLeft, Check, Users } from "lucide-react";
import type { Database } from "@/types/database";

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

  const [bookingFor, setBookingFor] = useState<"myself" | "someone_else">("myself");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Session check & Safe Profile Fetch
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setPatientEmail(session.user.email || "");
          setPatientName(session.user.user_metadata?.full_name || session.user.user_metadata?.name || "");

          const { data: patientProfile } = await supabase
            .from("patients")
            .select("phone, full_name")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (patientProfile) {
            if (patientProfile.phone) setPatientPhone(patientProfile.phone);
            if (patientProfile.full_name) setPatientName(patientProfile.full_name);
          }
        }

        // 2. Query Params validation
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

        // 3. Fetch Doctor and Clinic Strictly
        const { data: doctorData, error: docErr } = await supabase.from("doctors").select("*").eq("id", doctorId).maybeSingle();
        const { data: clinicData, error: clinicErr } = await supabase.from("clinics").select("*").eq("id", clinicId).maybeSingle();

        if (docErr || !doctorData) {
          setError("Doctor information could not be loaded. Please try again.");
          setLoading(false);
          return;
        }
        
        if (clinicErr || !clinicData) {
          setError("Clinic information could not be loaded. Please try again.");
          setLoading(false);
          return;
        }

        setDoctor(doctorData); 
        setDoctorName(doctorData.full_name || "Doctor");
        setClinic(clinicData); 
        setClinicName(clinicData.name || "Clinic");

      } catch (err) {
        console.error("Initialization Error:", err);
        setError("Something went wrong while loading the form.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [searchParams, router, supabase]);

  const handleBookingForToggle = (value: "myself" | "someone_else") => {
    setBookingFor(value);
    if (value === "someone_else") {
      setPatientName("");
      setPatientPhone("");
    } else {
      supabase.auth.getSession().then(({ data }: any) => {
        setPatientName(data.session?.user?.user_metadata?.full_name || data.session?.user?.user_metadata?.name || "");
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const submittedName = patientName.trim();
    const submittedPhone = patientPhone.trim();

    if (!doctor || !clinic) {
      setError("Session invalid. Please refresh the page.");
      return;
    }

    if (!submittedName || !submittedPhone) {
      setError("Please provide both Patient Name and Phone Number.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: doctor.id,
          clinic_id: clinic.id,
          date: date, // Ensuring strictly expected keys are sent
          appointment_date: date, // Fallback for safety
          start_time: startTime,
          end_time: endTime,
          patient_name: submittedName,
          patient_phone: submittedPhone,
          patient_email: patientEmail.trim() || null,
          reason_for_visit: reason.trim() || null,
          booking_for: bookingFor,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.appointment) {
        const { appointment } = data;
        const statusPath = appointment.status === "confirmed" ? "success" : "pending";
        router.push(`/booking/${statusPath}?appointment_id=${appointment.id}&date=${date}&start_time=${startTime}&end_time=${endTime}&doctor_name=${encodeURIComponent(doctorName)}&clinic_name=${encodeURIComponent(clinicName)}`);
      } else {
        setError(data.error || "Failed to book appointment. Please check your details.");
      }
    } catch (err) {
      console.error("Submit Error:", err);
      setError("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  // If loading is done but doctor/clinic is missing due to error
  if (error && (!doctor || !clinic)) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium mb-4 max-w-md text-center border border-red-100 shadow-sm">
          {error}
        </div>
        <button onClick={() => router.push('/patient')} className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium text-sm">Back</span>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-base font-semibold text-gray-900">Appointment Details</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-600 shrink-0">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-lg">{doctorName}</p>
                <p className="text-sm text-cyan-600 font-medium">{doctor?.specialization}</p>
              </div>
            </div>
            <div className="pl-16 space-y-1 text-sm text-gray-500">
              <p className="font-medium text-gray-700">{clinicName}</p>
              <p>{clinic?.address}, {clinic?.city}</p>
              <p className="text-xs text-gray-400 mt-2">
                Date: <strong className="text-gray-700">{date}</strong> | Slot: <strong className="text-gray-700">{startTime} - {endTime}</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-base font-semibold text-gray-900">Your Information</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => handleBookingForToggle("myself")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                  bookingFor === "myself" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                }`}
              >
                <User className="w-4 h-4" /> Myself
              </button>
              <button
                type="button"
                onClick={() => handleBookingForToggle("someone_else")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                  bookingFor === "someone_else" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                }`}
              >
                <Users className="w-4 h-4" /> Someone Else
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Enter patient name"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number *</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email (Locked)</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  readOnly
                  value={patientEmail}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-sm text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Visit (Optional)</label>
              <div className="relative">
                <MessageSquare className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe reason for visit..."
                  rows={3}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl font-medium border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white font-medium text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" /> Confirm Booking
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
