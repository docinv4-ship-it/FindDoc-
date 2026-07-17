"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Check, ChevronLeft, ChevronRight, MapPin } from "lucide-react";

// --- IMPORTING ALL STEPS ---
import BasicInfoStep from "@/components/onboarding/BasicInfoStep";
// import ContactStep from "@/components/onboarding/ContactStep"; // Create this placeholder if missing
import LocationStep, { LocationState } from "@/components/onboarding/LocationStep";
import ClinicDetailsStep from "@/components/onboarding/ClinicDetailsStep";
import ConsultationStep from "@/components/onboarding/ConsultationStep";
import AvailabilityStep from "@/components/onboarding/AvailabilityStep";
// import PublicProfileStep from "@/components/onboarding/PublicProfileStep"; // Placeholder
// import DocumentsStep from "@/components/onboarding/DocumentsStep"; // Placeholder
import ReviewStep from "@/components/onboarding/ReviewStep";

// Setup Array for Progress Mapping
const stepLabels = [
  "Basic Info", "Contact", "Location", "Clinic Details", 
  "Consultation", "Availability", "Public Profile", "Documents", "Review"
];

export default function DoctorOnboardingPage() {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const router = useRouter();
  const supabase = createClient();

  // -------------------------------------------------------------
  // 🟢 1. PERFECTLY ALIGNED STATES (Matches Child Props EXACTLY)
  // -------------------------------------------------------------

  const [basicInfo, setBasicInfo] = useState({
    clinicName: "", doctorName: "", specialization: "", 
    customSpecialization: "", qualification: "", experienceYears: "", registrationNumber: "",
  });

  const [contact, setContact] = useState({ mobile: "", email: "", website: "", facebook: "", instagram: "", linkedin: "", whatsapp: "" });

  const [location, setLocation] = useState<LocationState>({
    country: "Pakistan", countryIso: "PK", province: "Khyber Pakhtunkhwa", provinceIso: "PK-KP",
    zone: "Kohat", streetAddress: "", zipCode: "", latitude: 33.5889, longitude: 71.4429, currency: "PKR",
  });

  const [clinicDetails, setClinicDetails] = useState({
    about: "", logoUrl: "", coverImageUrl: "", images: [], languages: [],
  });

  // FIXED: Variable names matching ConsultationStep EXACTLY
  const [consultation, setConsultation] = useState({
    currency: "PKR", consultationFee: 0, slotSizeMinutes: "30",
  });

  // FIXED: Matches AvailabilityStep Data Structure EXACTLY
  const [availability, setAvailability] = useState({
    schedule: [
      { day: "Monday", isAvailable: true, slots: [{ id: "m-1", startTime: "09:00", endTime: "17:00" }] },
      { day: "Tuesday", isAvailable: true, slots: [{ id: "t-1", startTime: "09:00", endTime: "17:00" }] },
      { day: "Wednesday", isAvailable: true, slots: [{ id: "w-1", startTime: "09:00", endTime: "17:00" }] },
      { day: "Thursday", isAvailable: true, slots: [{ id: "th-1", startTime: "09:00", endTime: "17:00" }] },
      { day: "Friday", isAvailable: true, slots: [{ id: "f-1", startTime: "09:00", endTime: "13:00" }] },
      { day: "Saturday", isAvailable: false, slots: [] },
      { day: "Sunday", isAvailable: false, slots: [] },
    ]
  });

  const [publicProfile, setPublicProfile] = useState({ profileSlug: "", services: [] });
  const [documents, setDocuments] = useState([]);

  // -------------------------------------------------------------
  // 🟢 2. INITIAL HANDSHAKE & AUTH
  // -------------------------------------------------------------
  useEffect(() => {
    const initSystem = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return router.push("/doctor/login");

        const { data: doctorData } = await supabase
          .from("doctors").select("id, is_onboarded").eq("user_id", user.id).maybeSingle();

        if (!doctorData) return router.push("/doctor/signup");
        if (doctorData.is_onboarded) return router.push("/doctor/dashboard");

        setDoctorId(doctorData.id);
      } catch (err) {
        console.error("System Crash: ", err);
      } finally {
        setLoading(false);
      }
    };
    initSystem();
  }, [supabase, router]);

  // -------------------------------------------------------------
  // 🟢 3. STEP VALIDATION BARRIER
  // -------------------------------------------------------------
  const validateStep = (s: number): boolean => {
    setGlobalError(null);
    setErrors({});
    let isValid = true;
    let newErrors: Record<string, string> = {};

    if (s === 1) {
      if (!basicInfo.clinicName) newErrors.clinicName = "Clinic name is required";
      if (!basicInfo.doctorName) newErrors.doctorName = "Doctor name is required";
      if (!basicInfo.specialization) newErrors.specialization = "Specialization is required";
    }
    
    // Add logic for other steps here as you build them
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      isValid = false;
      setGlobalError("Please fix the highlighted errors before continuing.");
    }
    return isValid;
  };

  const navigateStep = (direction: "next" | "prev") => {
    if (direction === "next") {
      if (validateStep(step)) setStep(prev => prev + 1);
    } else {
      setStep(prev => Math.max(prev - 1, 1));
    }
  };

  // -------------------------------------------------------------
  // 🟢 4. SMART RENDER ENGINE (Injects Correct Data via Switch)
  // -------------------------------------------------------------
  const renderCurrentStep = () => {
    switch (step) {
      case 1:
        return <BasicInfoStep data={basicInfo as any} onChange={(updates) => setBasicInfo(prev => ({ ...prev, ...updates }))} errors={errors} />;
      case 3:
        return <LocationStep locationData={location} setLocationData={setLocation} />;
      case 4:
        return <ClinicDetailsStep data={clinicDetails as any} onChange={(updates) => setClinicDetails(prev => ({ ...prev, ...updates }))} errors={errors} />;
      case 5:
        return <ConsultationStep data={consultation as any} onChange={(updates) => setConsultation(prev => ({ ...prev, ...updates }))} errors={errors} />;
      case 6:
        return <AvailabilityStep data={availability} onChange={(updates) => setAvailability(prev => ({ ...prev, ...updates }))} errors={errors} />;
      case 9:
        // FIX: Creating the expected "globalState" wrapper just-in-time for ReviewStep
        const packagedState = {
          group1: { basicInfo, location, contact },
          group2: { clinicDetails, consultation },
          group3: { availability, publicProfile, documents }
        };
        return <ReviewStep globalState={packagedState} onNavigateToStep={setStep} />;
      default:
        return <div className="p-10 text-center text-gray-500 font-medium bg-white rounded-xl border">Development Mode: Step {step} UI is pending.</div>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary-600 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Booting Platform Engine...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Module */}
        <div className="flex items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Onboarding Matrix</h1>
            <p className="text-sm text-gray-500 font-medium">Step {step} of 9: {stepLabels[step - 1]}</p>
          </div>
          <MapPin className="w-8 h-8 text-primary-500 bg-primary-50 p-1.5 rounded-lg" />
        </div>

        {/* Global Error Banner */}
        {globalError && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-semibold shadow-sm animate-in fade-in slide-in-from-top-2">
            🚨 {globalError}
          </div>
        )}

        {/* DYNAMIC COMPONENT RENDERER */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
          {renderCurrentStep()}
        </div>

        {/* Navigation Control Board */}
        <div className="flex items-center justify-between pt-4">
          <button 
            onClick={() => navigateStep("prev")}
            disabled={step === 1 || saving}
            className="px-6 py-3 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 font-bold rounded-xl flex items-center gap-2 transition disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" /> Back
          </button>

          {step < 9 ? (
            <button 
              onClick={() => navigateStep("next")}
              className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-200 transition flex items-center gap-2"
            >
              Continue <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button 
              onClick={() => { /* FINAL SUBMIT LOGIC TO SUPABASE HERE */ }}
              disabled={saving}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              {saving ? "Deploying..." : "Finalize & Launch"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
