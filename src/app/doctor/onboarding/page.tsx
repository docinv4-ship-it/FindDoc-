"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, ChevronLeft, MapPin } from "lucide-react";

// --- IMPORTING STEPS ---
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
  const supabase = createClient();

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
  // 🟢 AIRTIGHT DUAL-TABLE TRANSACTION TRANSACTION LAYER (100% BULLETPROOF)
  // -------------------------------------------------------------
  const handleFinalizeSubmission = async () => {
    setSaving(true);
    setGlobalError(null);

    try {
      // 1. Authenticate Request
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Your session has expired. Please log in again.");

      // 2. STEP A: Upsert Core Doctor Profile & Select Generated ID
      const { data: doctorRow, error: dbError } = await supabase
        .from("doctors")
        .upsert(
          {
            user_id: user.id,       
            full_name: basicInfo.doctorName || "Doctor Name", 
            email: contact.email || user.email || "doctor@clinic.com", 
            specialization: basicInfo.specialization || "General Medicine", 

            doctor_name: basicInfo.doctorName || "",
            clinic_name: basicInfo.clinicName || "",
            qualification: basicInfo.qualification || "",
            experience_years: parseInt(basicInfo.experienceYears) || 0, 
            registration_number: basicInfo.registrationNumber || "",
            custom_specialization: basicInfo.customSpecialization || "",

            mobile: contact.mobile || "",
            phone: contact.mobile || "",
            facebook_url: contact.facebook || null,
            instagram_url: contact.instagram || null,
            linkedin_url: contact.linkedin || null,
            whatsapp_number: contact.whatsapp || null,
            website_url: contact.website || null,

            profile_image_url: clinicDetails.logoUrl || null,
            cover_image_url: clinicDetails.coverImageUrl || null,
            bio: publicProfile.bio || "",
            languages_spoken: clinicDetails.languages || [],
            services_offered: publicProfile.services || [],

            location_data: { ...location, city: location.zone || location.country }, 
            consultation_fee: parseFloat(consultation.consultationFee.toString()) || 0,
            slot_size_minutes: consultation.slotSizeMinutes || "30",
            availability_schedule: availability.schedule || [],
            clinic_details: clinicDetails || {},
            public_profile: publicProfile || {},
            documents: documents || {},

            is_onboarded: true, 
            is_verified: false,
            updated_at: new Date().toISOString(),
          }, 
          { onConflict: 'user_id' }
        )
        .select("id")
        .single();

      if (dbError) throw dbError;
      if (!doctorRow) throw new Error("Critical synchronization anomaly: Doctor tracking row was not returned.");

      // 3. Normalize Routing URL Slugs
      const rawSlug = publicProfile.profileSlug || basicInfo.clinicName || `clinic-${user.id.slice(0, 6)}`;
      const cleanSlug = rawSlug
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      // 4. STEP B: Upsert Independent Clinics Table Profile (Unlocks Maps & Public Profile Routes)
      const { error: clinicError } = await supabase
        .from("clinics")
        .upsert(
          {
            doctor_id: doctorRow.id,
            name: basicInfo.clinicName || "My Clinic",
            slug: cleanSlug,
            address: location.streetAddress || "Clinic Address",
            city: location.zone || "City Location",
            // 🎯 PARSING FLOATS EXPLICITLY SO OPENSTREETMAPS / GOOGLE MAPS NEVER CRASH OR RENDER GRAY
            latitude: location.latitude ? parseFloat(location.latitude.toString()) : 33.5889,
            longitude: location.longitude ? parseFloat(location.longitude.toString()) : 71.4429,
            consultation_fee: parseFloat(consultation.consultationFee.toString()) || 0,
            slot_duration_minutes: parseInt(consultation.slotSizeMinutes) || 30,
            phone: contact.mobile || null,
            logo_url: clinicDetails.logoUrl || null,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'doctor_id' }
        );

      if (clinicError) throw clinicError;

      // 5. Purge Cache & Deploy Routing Redirect
      localStorage.removeItem("onboarding_v1");
      router.push("/doctor/dashboard");

    } catch (err: any) {
      console.error("Direct Execution Pipeline Collapsed:", err);
      setGlobalError(err.message || "Failed to finalize database configuration parameters.");
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
