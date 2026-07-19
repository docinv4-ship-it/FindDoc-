"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Check, ChevronLeft, ChevronRight, MapPin } from "lucide-react";

// --- IMPORTING ALL STEPS ---
import BasicInfoStep from "@/components/onboarding/BasicInfoStep";
import ContactStep from "@/components/onboarding/ContactStep"; 
import LocationStep, { LocationState } from "@/components/onboarding/LocationStep";
import ClinicDetailsStep from "@/components/onboarding/ClinicDetailsStep";
import ConsultationStep from "@/components/onboarding/ConsultationStep";
import AvailabilityStep from "@/components/onboarding/AvailabilityStep";
import PublicProfileStep from "@/components/onboarding/PublicProfileStep"; 
import DocumentsStep from "@/components/onboarding/DocumentsStep"; 
import ReviewStep from "@/components/onboarding/ReviewStep";

const stepLabels = [
  "Basic Info", "Contact", "Location", "Clinic Details", 
  "Consultation", "Availability", "Public Profile", "Documents", "Review"
];

export interface DocumentsState {
  medicalLicense: string;
  idProof: string;
  clinicRegistration?: string;
}

export default function DoctorOnboardingPage() {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  // -------------------------------------------------------------
  // 🟢 1. FULLY INITIALIZED STATE (Future-Proof: Added missing fields)
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

  const [consultation, setConsultation] = useState({
    currency: "PKR", consultationFee: 0, slotSizeMinutes: "30",
  });

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

  // 🔥 FIXED: Added bio and tags to prevent "undefined" crash in Step 7
  const [publicProfile, setPublicProfile] = useState({ 
    profileSlug: "", 
    bio: "",
    services: [], 
    tags: [] 
  });

  const [documents, setDocuments] = useState<DocumentsState>({
    medicalLicense: "",
    idProof: "",
    clinicRegistration: "",
  });

  // -------------------------------------------------------------
  // 🟢 2. AUTO-SAVE & RECOVERY SYSTEM
  // -------------------------------------------------------------
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/doctor/login");
      
      // Load saved progress from LocalStorage
      const saved = localStorage.getItem("onboarding_v1");
      if (saved) {
        const p = JSON.parse(saved);
        setBasicInfo(p.basicInfo); setContact(p.contact); setLocation(p.location);
        setClinicDetails(p.clinicDetails); setConsultation(p.consultation);
        setAvailability(p.availability); setPublicProfile(p.publicProfile);
        setDocuments(p.documents); setStep(p.step || 1);
      }
      setLoading(false);
    };
    init();
  }, []);

  // Sync to storage on every state change
  useEffect(() => {
    if (!loading) {
      localStorage.setItem("onboarding_v1", JSON.stringify({
        step, basicInfo, contact, location, clinicDetails, consultation, availability, publicProfile, documents
      }));
    }
  }, [step, basicInfo, contact, location, clinicDetails, consultation, availability, publicProfile, documents]);

  // -------------------------------------------------------------
  // 🟢 3. STEP LOGIC
  // -------------------------------------------------------------
  const validateStep = (s: number): boolean => {
    setErrors({});
    let isValid = true;
    if (s === 1 && !basicInfo.clinicName) { setErrors({ clinicName: "Required" }); isValid = false; }
    return isValid;
  };

  const navigateStep = (direction: "next" | "prev") => {
    if (direction === "next") {
      if (validateStep(step)) setStep(prev => prev + 1);
    } else {
      setStep(prev => Math.max(prev - 1, 1));
    }
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return <BasicInfoStep data={basicInfo as any} onChange={(u) => setBasicInfo(p => ({ ...p, ...u }))} errors={errors} />;
      case 2: return <ContactStep data={contact as any} onChange={(u) => setContact(p => ({ ...p, ...u }))} errors={errors} />;
      case 3: return <LocationStep locationData={location} setLocationData={setLocation} />;
      case 4: return <ClinicDetailsStep data={clinicDetails as any} onChange={(u) => setClinicDetails(p => ({ ...p, ...u }))} errors={errors} />;
      case 5: return <ConsultationStep data={consultation as any} onChange={(u) => setConsultation(p => ({ ...p, ...u }))} errors={errors} />;
      case 6: return <AvailabilityStep data={availability as any} onChange={(u) => setAvailability(p => ({ ...p, ...u } as any))} errors={errors} />;
      case 7: return <PublicProfileStep data={publicProfile as any} onChange={(u) => setPublicProfile(p => ({ ...p, ...u }))} errors={errors} />;
      case 8: return <DocumentsStep data={documents} onChange={(u) => setDocuments(p => ({ ...p, ...u }))} errors={errors} />;
      case 9: return <ReviewStep globalState={{ group1: { basicInfo, location, contact }, group2: { clinicDetails, consultation }, group3: { availability, publicProfile, documents } }} onNavigateToStep={setStep} />;
      default: return <div>Pending</div>;
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Onboarding Matrix</h1>
            <p className="text-sm text-gray-500">Step {step} of 9: {stepLabels[step - 1]}</p>
          </div>
          <MapPin className="text-primary-500 bg-primary-50 p-2 rounded-lg" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {renderCurrentStep()}
        </div>

        <div className="flex justify-between pt-4">
          <button onClick={() => navigateStep("prev")} disabled={step === 1 || saving} className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold">Back</button>
          {step < 9 ? (
            <button onClick={() => navigateStep("next")} className="px-8 py-3 bg-primary-600 text-white rounded-xl font-bold">Continue</button>
          ) : (
            <button disabled={saving} className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold">Finalize</button>
          )}
        </div>
      </div>
    </div>
  );
}
