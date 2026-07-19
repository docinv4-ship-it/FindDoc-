"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, ChevronLeft, MapPin } from "lucide-react";

// --- IMPORTING STEPS (Step 9 Review Removed) ---
import BasicInfoStep from "@/components/onboarding/BasicInfoStep";
import ContactStep from "@/components/onboarding/ContactStep"; 
import LocationStep, { LocationState } from "@/components/onboarding/LocationStep";
import ClinicDetailsStep from "@/components/onboarding/ClinicDetailsStep";
import ConsultationStep from "@/components/onboarding/ConsultationStep";
import AvailabilityStep from "@/components/onboarding/AvailabilityStep";
import PublicProfileStep from "@/components/onboarding/PublicProfileStep"; 
import DocumentsStep from "@/components/onboarding/DocumentsStep"; 

const stepLabels = [
  "Basic Info", "Contact", "Location", "Clinic Details", 
  "Consultation", "Availability", "Public Profile", "Documents"
];

interface BasicInfoState {
  clinicName: string; 
  doctorName: string; 
  specialization: string; 
  customSpecialization: string; 
  qualification: string; 
  experienceYears: string; 
  registrationNumber: string;
}

interface ContactState {
  mobile: string; 
  email: string; 
  website: string; 
  facebook: string; 
  instagram: string; 
  linkedin: string; 
  whatsapp: string;
}

interface ClinicDetailsState {
  about: string; 
  logoUrl: string; 
  coverImageUrl: string; 
  images: string[]; 
  languages: string[];
}

interface ConsultationState {
  currency: string;
  consultationFee: number;
  slotSizeMinutes: "15" | "30" | "45" | "60"; 
}

interface AvailabilityState {
  schedule: {
    day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
    isAvailable: boolean;
    slots: { id: string; startTime: string; endTime: string; }[];
  }[];
}

interface PublicProfileState {
  profileSlug: string; 
  bio: string; 
  services: string[]; 
  tags: string[];
}

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
  const supabase = createClient(); // Uses your working client config

  // --- STATES ---
  const [basicInfo, setBasicInfo] = useState<BasicInfoState>({
    clinicName: "", doctorName: "", specialization: "", 
    customSpecialization: "", qualification: "", experienceYears: "", registrationNumber: "",
  });
  const [contact, setContact] = useState<ContactState>({ mobile: "", email: "", website: "", facebook: "", instagram: "", linkedin: "", whatsapp: "" });
  const [location, setLocation] = useState<LocationState>({
    country: "Pakistan", countryIso: "PK", province: "Khyber Pakhtunkhwa", provinceIso: "PK-KP",
    zone: "Kohat", streetAddress: "", zipCode: "", latitude: 33.5889, longitude: 71.4429, currency: "PKR",
  });
  const [clinicDetails, setClinicDetails] = useState<ClinicDetailsState>({ about: "", logoUrl: "", coverImageUrl: "", images: [], languages: [] });
  const [consultation, setConsultation] = useState<ConsultationState>({ currency: "PKR", consultationFee: 0, slotSizeMinutes: "30" });
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
  const [publicProfile, setPublicProfile] = useState<PublicProfileState>({ profileSlug: "", bio: "", services: [], tags: [] });
  const [documents, setDocuments] = useState<DocumentsState>({ medicalLicense: "", idProof: "", clinicRegistration: "" });

  // --- AUTO-SAVE & RECOVERY ---
  useEffect(() => {
    const init = async () => {
      const saved = localStorage.getItem("onboarding_v1");
      if (saved) {
        try {
          const p = JSON.parse(saved);
          if (p.step && p.step <= 8) setStep(p.step);
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
  }, [step, basicInfo, contact, location, clinicDetails, consultation, availability, publicProfile, documents, loading]);

  const navigateStep = (direction: "next" | "prev") => {
    if (direction === "next") {
      setStep(prev => Math.min(prev + 1, 8));
    } else {
      setStep(prev => Math.max(prev - 1, 1));
    }
  };

  // -------------------------------------------------------------
  // 🟢 DIRECT CLIENT-SIDE DB INSERTION (100% SCHEMA MATCHED)
  // -------------------------------------------------------------
  const handleFinalizeSubmission = async () => {
    setSaving(true);
    setGlobalError(null);

    try {
      // 1. Get authenticated user session
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Your session has expired. Please log in again.");
      }

      // 2. Exact Mapping matching the strict schema rules
      const { error: dbError } = await supabase
        .from("doctors")
        .upsert({
          // Keys Required (is_nullable: NO)
          id: user.id,            
          user_id: user.id,       
          full_name: basicInfo.doctorName || "Doctor Name", // 🟢 FIXED: Required Column Map
          email: contact.email || user.email || "doctor@clinic.com", // 🟢 FIXED: Required Column Map
          specialization: basicInfo.specialization || "General Medicine", // 🟢 FIXED: Required Column Map
          
          // Optional Columns Map matching database types
          doctor_name: basicInfo.doctorName || "",
          clinic_name: basicInfo.clinicName || "",
          qualification: basicInfo.qualification || "",
          experience_years: parseInt(basicInfo.experienceYears) || 0, // 🟢 FIXED: String parse to Integer
          registration_number: basicInfo.registrationNumber || "",
          custom_specialization: basicInfo.customSpecialization || "",
          
          // Contact & Socials Info
          mobile: contact.mobile || "",
          phone: contact.mobile || "",
          facebook_url: contact.facebook || null,
          instagram_url: contact.instagram || null,
          linkedin_url: contact.linkedin || null,
          whatsapp_number: contact.whatsapp || null,
          website_url: contact.website || null,

          // Media Arrays and Strings
          profile_image_url: clinicDetails.logoUrl || null,
          cover_image_url: clinicDetails.coverImageUrl || null,
          bio: publicProfile.bio || "",
          languages_spoken: clinicDetails.languages || [],
          services_offered: publicProfile.services || [],
          
          // Complex Configurations JSONB
          location_data: { ...location, city: location.zone }, 
          consultation_fee: consultation.consultationFee || 0,
          slot_size_minutes: consultation.slotSizeMinutes || "30",
          availability_schedule: availability.schedule || [],
          clinic_details: clinicDetails || {},
          public_profile: publicProfile || {},
          documents: documents || {},
          
          // Status Flags & Trackers
          is_onboarded: true, // Onboarding completes here
          is_verified: false,
          updated_at: new Date().toISOString(),
        });

      if (dbError) throw dbError;

      // 3. Clear Cache & Redirect
      localStorage.removeItem("onboarding_v1");
      router.push("/doctor/dashboard");

    } catch (err: any) {
      console.error("Direct Insertion Failed:", err);
      setGlobalError(err.message || "Failed to save data directly to database.");
    } finally {
      setSaving(false);
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
      default: return <div>Step Error</div>;
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {globalError && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold">
            ⚠️ Error: {globalError}
          </div>
        )}

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Onboarding Matrix</h1>
            <p className="text-sm text-gray-500">Step {step} of 8: {stepLabels[step - 1]}</p>
          </div>
          <MapPin className="text-primary-500 bg-primary-50 p-2 rounded-lg" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {renderCurrentStep()}
        </div>

        <div className="flex justify-between pt-4">
          <button 
            onClick={() => navigateStep("prev")} 
            disabled={step === 1 || saving} 
            className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold disabled:opacity-50"
          >
            Back
          </button>

          {step < 8 ? (
            <button 
              onClick={() => navigateStep("next")} 
              className="px-8 py-3 bg-primary-600 text-white rounded-xl font-bold"
            >
              Continue
            </button>
          ) : (
            <button 
              onClick={handleFinalizeSubmission}
              disabled={saving}
              className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 disabled:bg-emerald-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Saving to Database...
                </>
              ) : (
                "Finalize & Submit"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
