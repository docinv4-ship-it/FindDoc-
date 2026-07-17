"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Check, ChevronLeft, ChevronRight, MapPin } from "lucide-react";

// Modular Steps Component Injections
import BasicInfoStep from "@/components/onboarding/BasicInfoStep";
import ContactStep from "@/components/onboarding/ContactStep";
import LocationStep from "@/components/onboarding/LocationStep";
import ClinicDetailsStep from "@/components/onboarding/ClinicDetailsStep";
import ConsultationStep from "@/components/onboarding/ConsultationStep";
import AvailabilityStep from "@/components/onboarding/AvailabilityStep";
import PublicProfileStep from "@/components/onboarding/PublicProfileStep";
import DocumentsStep from "@/components/onboarding/DocumentsStep";
import ReviewStep from "@/components/onboarding/ReviewStep";

// Strict Feature Types
import type {
  BasicInfo, Contact, Consultation,
  VerificationDocument
} from "./types";
import type { LocationState } from "@/components/onboarding/LocationStep";
import type { AvailabilityData } from "@/lib/validation/onboarding-group3";

// UI Component Expected Types for Step 4
interface ClinicDetailsUI {
  about: string;
  logoUrl: string;
  coverImageUrl: string;
  images: string[];
  languages: string[];
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
const stepLabels = [
  "Basic Info", 
  "Contact", 
  "Location", 
  "Clinic Details", 
  "Consultation", 
  "Availability", 
  "Public Profile", 
  "Documents", 
  "Review"
];

export default function DoctorOnboardingPage() {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const supabase = createClient();

  // --- CORE INTEGRATED STATES ---
  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    clinicName: "",
    doctorName: "",
    specialization: "",
    customSpecialization: "",
    qualification: "",
    experienceYears: "",
    registrationNumber: "",
  });

  const [contact, setContact] = useState<Contact>({
    mobile: "",
    email: "",
    website: "",
    facebook: "",
    instagram: "",
    linkedin: "",
    whatsapp: "",
  });

  // Upgraded Location Matrix State
  const [location, setLocation] = useState<LocationState>({
    country: "Pakistan",
    countryIso: "PK",
    province: "Khyber Pakhtunkhwa",
    provinceIso: "PK-KP",
    zone: "Kohat",
    streetAddress: "",
    zipCode: "",
    latitude: 33.5889,
    longitude: 71.4429,
    currency: "PKR",
  });

  // Fixed Name Mismatch to perfectly satisfy UI Types
  const [clinicDetails, setClinicDetails] = useState<ClinicDetailsUI>({
    about: "",
    logoUrl: "",
    coverImageUrl: "",
    images: [],
    languages: [],
  });

  const [consultation, setConsultation] = useState<Consultation>({
    fee: "100",
    consultationType: "in_person",
    slotDuration: "30",
    bufferTime: "0",
    bookingMode: "auto",
  });

  // Synced with onboarding-group3 Structure
  const [availability, setAvailability] = useState<AvailabilityData>({
    schedule: [
      { day: "Monday", isAvailable: true, slots: [{ id: "init-1", startTime: "09:00", endTime: "17:00" }] },
      { day: "Tuesday", isAvailable: true, slots: [{ id: "init-2", startTime: "09:00", endTime: "17:00" }] },
      { day: "Wednesday", isAvailable: true, slots: [{ id: "init-3", startTime: "09:00", endTime: "17:00" }] },
      { day: "Thursday", isAvailable: true, slots: [{ id: "init-4", startTime: "09:00", endTime: "17:00" }] },
      { day: "Friday", isAvailable: true, slots: [{ id: "init-5", startTime: "09:00", endTime: "17:00" }] },
      { day: "Saturday", isAvailable: false, slots: [] },
      { day: "Sunday", isAvailable: false, slots: [] },
    ]
  });

  const [documents, setDocuments] = useState<VerificationDocument[]>([]);

  // --- INITIAL DATA HANDSHAKE & PROFILE SYNC ---
  useEffect(() => {
    const checkAuthAndSync = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return router.push("/doctor/login");

        const { data: doctorData, error: fetchErr } = await supabase
          .from("doctors")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (fetchErr || !doctorData) return router.push("/doctor/signup");
        if (doctorData.is_onboarded) return router.push("/doctor/dashboard");

        setDoctorId(doctorData.id);

        // Core profile fields dynamic hydration
        setBasicInfo(prev => ({
          ...prev,
          doctorName: doctorData.full_name || "",
          specialization: doctorData.specialization || "",
          qualification: doctorData.qualification || "",
          experienceYears: doctorData.experience_years?.toString() || "",
          registrationNumber: doctorData.registration_number || "",
        }));

        setContact(prev => ({
          ...prev,
          mobile: doctorData.phone || "",
          email: doctorData.email || ""
        }));

      } catch (err) {
        console.error("Initialization Protocol Crash: ", err);
      } finally {
        setLoading(false);
      }
    };
    checkAuthAndSync();
  }, [supabase, router]);

  // --- GLOBAL FILE ASSET STORAGE UPLOADER ---
  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    if (!doctorId) return null;
    if (file.size > MAX_FILE_SIZE) {
      setError(`File ${file.name} exceeds the allowable 5MB payload limit.`);
      return null;
    }
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${doctorId}/${folder}/${Date.now()}.${ext}`;
      const { data, error: uploadErr } = await supabase.storage
        .from("clinic-images")
        .upload(fileName, file);

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from("clinic-images")
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (err) {
      console.error("Storage upload crash:", err);
      return null;
    }
  };

  // --- STRICT VALIDATION BARRIER ---
  const validateStep = (s: number): boolean => {
    setError(null);
    setErrors({});
    switch (s) {
      case 1:
        if (!basicInfo.clinicName.trim() || !basicInfo.doctorName.trim() || !basicInfo.specialization) {
          setError("Please fill all required profile fields before moving forward.");
          return false;
        }
        return true;
      case 2:
        if (!contact.mobile.trim() || !contact.email.trim()) {
          setError("Mobile and email communication nodes are mandatory.");
          return false;
        }
        return true;
      case 3:
        if (!location.countryIso) { setError("Country selection from global array is required."); return false; }
        if (!location.provinceIso) { setError("State/Province scope is required."); return false; }
        if (!location.zone) { setError("City tracking field is required."); return false; }
        if (!location.streetAddress.trim()) { setError("Physical Street Address is required for radar tracking."); return false; }
        return true;
      default: 
        return true;
    }
  };

  const navigateStep = (direction: "next" | "prev") => {
    if (direction === "next" && !validateStep(step)) return;
    setStep(s => direction === "next" ? Math.min(s + 1, 10) : Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- TRANS-TABLE WRITE PROCESSOR (Supabase Transaction Logic) ---
  const handleComplete = async () => {
    if (!doctorId) return;
    setSaving(true);
    setError(null);

    try {
      // 1. Core Profile Details Syncing back to Doctors Table
      const { error: doctorUpdateErr } = await supabase
        .from("doctors")
        .update({
          full_name: basicInfo.doctorName,
          specialization: basicInfo.specialization,
          custom_specialization: basicInfo.customSpecialization,
          qualification: basicInfo.qualification,
          experience_years: basicInfo.experienceYears ? parseInt(basicInfo.experienceYears, 10) : null,
          registration_number: basicInfo.registrationNumber,
          phone: contact.mobile,
          email: contact.email,
        })
        .eq("id", doctorId);

      if (doctorUpdateErr) throw doctorUpdateErr;

      // 2. High Performance Insertion into Clinics Table (Explicit Mapping to Database Fields)
      const { data: clinicData, error: clinicInsertErr } = await supabase
        .from("clinics")
        .insert({
          doctor_id: doctorId,
          name: basicInfo.clinicName,
          about: clinicDetails.about,
          logo_url: clinicDetails.logoUrl,
          cover_image_url: clinicDetails.coverImageUrl,
          
          // MAPPED: Mapping UI state array names to DB table column names
          gallery_images: clinicDetails.images, 
          languages_spoken: clinicDetails.languages, 

          // NPM Powered Global Matrix fields
          country: location.country,
          province: location.province,
          zone_area: location.zone,
          street_address: location.streetAddress,
          zip_code: location.zipCode,
          latitude: location.latitude,
          longitude: location.longitude,
          currency_code: location.currency,

          // Booking Options Config Matrix
          consultation_fee: parseFloat(consultation.fee) || 0,
          consultation_type: consultation.consultationType,
          slot_duration: parseInt(consultation.slotDuration, 10) || 30,
          buffer_time: parseInt(consultation.bufferTime, 10) || 0,
          booking_mode: consultation.bookingMode,

          is_active: true,
        })
        .select("id")
        .single();

      if (clinicInsertErr) throw clinicInsertErr;

      // 3. Flattening and Batch committing Modern Multi-Slot Availability
      const dayMap: Record<string, number> = {
        "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6
      };

      const availabilityPayload = availability.schedule
        .filter((dayObj) => dayObj.isAvailable)
        .flatMap((dayObj) => 
          dayObj.slots.map((slot) => ({
            clinic_id: clinicData.id,
            doctor_id: doctorId,
            day_of_week: dayMap[dayObj.day] ?? 1,
            start_time: slot.startTime,
            end_time: slot.endTime,
          }))
        );

      if (availabilityPayload.length > 0) {
        const { error: availabilityErr } = await supabase
          .from("clinic_availability")
          .insert(availabilityPayload);

        if (availabilityErr) throw availabilityErr;
      }

      // 4. Update core verification flag inside profiles
      const { error: finalOnboardErr } = await supabase
        .from("doctors")
        .update({ is_onboarded: true })
        .eq("id", doctorId);

      if (finalOnboardErr) throw finalOnboardErr;

      setStep(10); 
    } catch (err: any) {
      console.error("Transaction Pipeline Aborted: ", err);
      setError(err?.message || "Critical failure during multi-table transactional pipeline synchronization.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500 mb-2" />
        <p className="text-sm font-semibold text-gray-600">Syncing Master Core Systems...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4">
      <div className="w-full max-w-3xl mx-auto space-y-6">

        {/* --- GLOBAL VISUAL STEP TRACKER INDEX --- */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">Onboarding Workspace</h1>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Configure your clinic nodes and regional telemetry.</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-primary-50 text-primary-600 rounded-full border border-primary-100">
              Step {step} of 9
            </span>
          </div>

          <div className="flex items-center justify-start gap-1 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex items-center flex-shrink-0">
                <div 
                  title={label}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                    step > i + 1 
                      ? "bg-primary-500 text-white" 
                      : step === i + 1 
                        ? "bg-primary-500 text-white ring-4 ring-primary-100" 
                        : "bg-gray-100 text-gray-400 border border-gray-200"
                  }`}
                >
                  {step > i + 1 ? <Check className="w-4 h-4 stroke-[3]" /> : i + 1}
                </div>
                {i < stepLabels.length - 1 && (
                  <div className={`w-6 h-0.5 mx-1 transition-all duration-300 ${step > i + 1 ? "bg-primary-500" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold rounded-xl shadow-sm">
            🚨 Error Status: {error}
          </div>
        )}

        {/* --- DYNAMIC RUNTIME INJECTIONS --- */}
        <div className="transition-all duration-200">
          {step === 1 && (
            <BasicInfoStep 
              data={basicInfo} 
              onChange={(updates) => setBasicInfo(prev => ({ ...prev, ...updates }))} 
              errors={errors} 
            />
          )}
          
          {step === 2 && (
            <ContactStep 
              data={contact} 
              onChange={(updates) => setContact(prev => ({ ...prev, ...updates }))} 
              errors={errors} 
            />
          )}

          {/* Step 3: Upgraded Location Control Matrix */}
          {step === 3 && <LocationStep locationData={location} setLocationData={setLocation} />}

          {/* Step 4: Clinic Details (Successfully Type Checked with Local UI Interface) */}
          {step === 4 && (
            <ClinicDetailsStep 
              data={clinicDetails} 
              onChange={(updates) => setClinicDetails(prev => ({ ...prev, ...updates }))} 
              uploadFile={uploadFile} 
              errors={errors}
            />
          )}

          {/* Step 5: Consultation */}
          {step === 5 && (
            <ConsultationStep 
              data={consultation} 
              onChange={(updates) => setConsultation(prev => ({ ...prev, ...updates }))} 
              errors={errors}
            />
          )}
          
          {step === 6 && (
            <AvailabilityStep 
              data={availability} 
              onChange={(updates) => setAvailability(prev => ({ ...prev, ...updates }))} 
              errors={errors} 
            />
          )}
          
          {step === 7 && <PublicProfileStep clinicName={basicInfo.clinicName} />}
          {step === 8 && <DocumentsStep documents={documents} setDocuments={setDocuments} doctorId={doctorId} />}
          {step === 9 && <ReviewStep basicInfo={basicInfo} contact={contact} location={location} />}

          {step === 10 && (
            <div className="bg-white rounded-3xl shadow-md p-10 text-center border border-gray-100 space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900">Setup Verified!</h2>
                <p className="text-gray-500 text-sm mt-1">Your practice environment has been successfully built onto the live database engine.</p>
              </div>
              <button 
                onClick={() => router.push("/doctor/dashboard")} 
                className="w-full py-3.5 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl transition shadow-lg shadow-gray-200"
              >
                Launch Control Dashboard
              </button>
            </div>
          )}
        </div>

        {/* --- DYNAMIC FLOW CONTROL SWITCHBOARD --- */}
        {step < 10 && (
          <div className="flex items-center justify-between border-t border-gray-200/70 pt-5">
            {step > 1 ? (
              <button 
                onClick={() => navigateStep("prev")} 
                disabled={saving}
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                Back
              </button>
            ) : <div />}

            {step < 9 ? (
              <button 
                onClick={() => navigateStep("next")} 
                className="px-7 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-md shadow-primary-100 transition flex items-center gap-1"
              >
                Continue
              </button>
            ) : (
              <button 
                onClick={handleComplete} 
                disabled={saving} 
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white text-sm font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-100"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                {saving ? "Deploying Core Infrastructure..." : "Complete Setup & Deploy"}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
