
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

// -------------------------------------------------------------
// 🟢 STRICT INTERFACES FOR 100% TYPE SAFETY (Fixes all Build Errors)
// -------------------------------------------------------------
interface BasicInfoState {
  clinicName: string; doctorName: string; specialization: string; 
  customSpecialization: string; qualification: string; experienceYears: string; registrationNumber: string;
}

interface ContactState {
  mobile: string; email: string; website: string; facebook: string; instagram: string; linkedin: string; whatsapp: string;
}

interface ClinicDetailsState {
  about: string; logoUrl: string; coverImageUrl: string; images: string[]; languages: string[];
}

interface ConsultationState {
  currency: string;
  consultationFee: number;
  slotSizeMinutes: "15" | "30" | "45" | "60"; // 🔥 FIXED: Strict Union Type
}

interface AvailabilityState {
  schedule: {
    day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
    isAvailable: boolean;
    slots: { id: string; startTime: string; endTime: string; }[];
  }[];
}

interface PublicProfileState {
  profileSlug: string; bio: string; services: string[]; tags: string[];
}

export interface DocumentsState {
  medicalLicense: string; idProof: string; clinicRegistration?: string;
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
  // 🟢 INITIALIZED STATES WITH EXPLICIT TYPES
  // -------------------------------------------------------------
  const [basicInfo, setBasicInfo] = useState<BasicInfoState>({
    clinicName: "", doctorName: "", specialization: "", 
    customSpecialization: "", qualification: "", experienceYears: "", registrationNumber: "",
  });

  const [contact, setContact] = useState<ContactState>({ mobile: "", email: "", website: "", facebook: "", instagram: "", linkedin: "", whatsapp: "" });

  const [location, setLocation] = useState<LocationState>({
    country: "Pakistan", countryIso: "PK", province: "Khyber Pakhtunkhwa", provinceIso: "PK-KP",
    zone: "Kohat", streetAddress: "", zipCode: "", latitude: 33.5889, longitude: 71.4429, currency: "PKR",
  });

  const [clinicDetails, setClinicDetails] = useState<ClinicDetailsState>({
    about: "", logoUrl: "", coverImageUrl: "", images: [], languages: [],
  });

  const [consultation, setConsultation] = useState<ConsultationState>({
    currency: "PKR", consultationFee: 0, slotSizeMinutes: "30",
  });

  const [availability, setAvailability] = useState<AvailabilityState>({
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

  const [publicProfile, setPublicProfile] = useState<PublicProfileState>({ 
    profileSlug: "", bio: "", services: [], tags: [] 
  });

  const [documents, setDocuments] = useState<DocumentsState>({
    medicalLicense: "", idProof: "", clinicRegistration: "",
  });

  // -------------------------------------------------------------
  // 🟢 AUTO-SAVE & RECOVERY SYSTEM
  // -------------------------------------------------------------
  useEffect(() => {
    const init = async () => {
      const saved = localStorage.getItem("onboarding_v1");
      if (saved) {
        try {
          const p = JSON.parse(saved);
          if (p.step) setStep(p.step);
          if (p.basicInfo) setBasicInfo(p.basicInfo);
          if (p.contact) setContact(p.contact);
          if (p.location) setLocation(p.location);
          if (p.clinicDetails) setClinicDetails(p.clinicDetails);
          if (p.consultation) setConsultation(p.consultation);
          if (p.availability) setAvailability(p.availability);
          if (p.publicProfile) setPublicProfile(p.publicProfile);
          if (p.documents) setDocuments(p.documents);
        } catch (e) { console.error("Storage corrupt", e); }
      }
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem("onboarding_v1", JSON.stringify({
        step, basicInfo, contact, location, clinicDetails, consultation, availability, publicProfile, documents
      }));
    }
  }, [step, basicInfo, contact, location, clinicDetails, consultation, availability, publicProfile, documents]);

  // -------------------------------------------------------------
  // 🟢 STEP NAVIGATOR
  // -------------------------------------------------------------
  const navigateStep = (direction: "next" | "prev") => {
    if (direction === "next") {
      setStep(prev => prev + 1);
    } else {
      setStep(prev => Math.max(prev - 1, 1));
    }
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return <BasicInfoStep data={basicInfo} onChange={(u: any) => setBasicInfo(p => ({ ...p, ...u }))} errors={errors} />;
      case 2: return <ContactStep data={contact} onChange={(u: any) => setContact(p => ({ ...p, ...u }))} errors={errors} />;
      case 3: return <LocationStep locationData={location} setLocationData={setLocation} />;
      case 4: return <ClinicDetailsStep data={clinicDetails} onChange={(u: any) => setClinicDetails(p => ({ ...p, ...u }))} errors={errors} />;
      case 5: return <ConsultationStep data={consultation} onChange={(u: any) => setConsultation(p => ({ ...p, ...u }))} errors={errors} />;
      case 6: return <AvailabilityStep data={availability} onChange={(u: any) => setAvailability(p => ({ ...p, ...u }))} errors={errors} />;
      case 7: return <PublicProfileStep data={publicProfile} onChange={(u: any) => setPublicProfile(p => ({ ...p, ...u }))} errors={errors} />;
      case 8: return <DocumentsStep data={documents} onChange={(u: any) => setDocuments(p => ({ ...p, ...u }))} errors={errors} />;
      case 9: return <ReviewStep globalState={{ group1: { basicInfo, location, contact }, group2: { clinicDetails, consultation }, group3: { availability, publicProfile, documents } }} onNavigateToStep={setStep} />;
      default: return <div>Step Error</div>;
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary-600" /></div>;

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
          <button onClick={() => navigateStep("prev")} disabled={step === 1} className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold">Back</button>
          {step < 9 ? (
            <button onClick={() => navigateStep("next")} className="px-8 py-3 bg-primary-600 text-white rounded-xl font-bold">Continue</button>
          ) : (
            <button className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold">Finalize</button>
          )}
        </div>
      </div>
    </div>
  );
}
