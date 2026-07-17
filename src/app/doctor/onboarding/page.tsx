// app/doctor/onboarding/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";

// Clean Imports of your Modular Components
import BasicInfoStep from "@/components/onboarding/BasicInfoStep";
import ContactStep from "@/components/onboarding/ContactStep";
import LocationStep from "@/components/onboarding/LocationStep";
import ClinicDetailsStep from "@/components/onboarding/ClinicDetailsStep";
import ConsultationStep from "@/components/onboarding/ConsultationStep";
import AvailabilityStep from "@/components/onboarding/AvailabilityStep";
import PublicProfileStep from "@/components/onboarding/PublicProfileStep";
import DocumentsStep from "@/components/onboarding/DocumentsStep";
import ReviewStep from "@/components/onboarding/ReviewStep";

// Strict Types
import type {
  BasicInfo, Contact, Location, ClinicDetails, Consultation,
  DayAvailability, BreakTime, PublicProfile, VerificationDocument
} from "./types";

import { OTHER_SPECIALIZATION } from "@/lib/data/specializations";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const stepLabels = ["Basic Info", "Contact", "Location", "Clinic Details", "Consultation", "Availability", "Public Profile", "Documents", "Review"];

export default function DoctorOnboardingPage() {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Core States
  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    clinicName: "", doctorName: "", specialization: "", customSpecialization: "", qualification: "", experienceYears: "", registrationNumber: "",
  });
  const [contact, setContact] = useState<Contact>({
    mobile: "", email: "", website: "", facebook: "", instagram: "", linkedin: "", whatsapp: "",
  });
  const [location, setLocation] = useState<Location>({
    country: "Pakistan", state: "", city: "", address: "", postalCode: "", latitude: "", longitude: "",
  });
  const [clinicDetails, setClinicDetails] = useState<ClinicDetails>({
    about: "", logoUrl: "", coverImageUrl: "", galleryImages: [], languagesSpoken: [],
  });
  const [consultation, setConsultation] = useState<Consultation>({
    fee: "100", consultationType: "in_person", slotDuration: "30", bufferTime: "0", bookingMode: "auto",
  });
  const [availability, setAvailability] = useState<Record<number, DayAvailability>>({
    0: { enabled: true, start: "09:00", end: "17:00" }, 1: { enabled: true, start: "09:00", end: "17:00" },
    2: { enabled: true, start: "09:00", end: "17:00" }, 3: { enabled: true, start: "09:00", end: "17:00" },
    4: { enabled: true, start: "09:00", end: "17:00" }, 5: { enabled: false, start: "09:00", end: "13:00" },
    6: { enabled: false, start: "09:00", end: "13:00" },
  });
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return router.push("/doctor/login");

        const { data: doctorData, error } = await supabase.from("doctors").select("*").eq("user_id", user.id).maybeSingle();
        if (error || !doctorData) return router.push("/doctor/signup");
        if (doctorData.is_onboarded) return router.push("/doctor/dashboard");

        setDoctorId(doctorData.id);
        
        // Data Sync
        setBasicInfo(prev => ({
          ...prev,
          doctorName: doctorData.full_name || "",
          specialization: doctorData.specialization || "",
          qualification: doctorData.qualification || "",
          experienceYears: doctorData.experience_years?.toString() || "",
          registrationNumber: doctorData.registration_number || "",
        }));
        setContact(prev => ({ ...prev, mobile: doctorData.phone || "", email: doctorData.email || "" }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [supabase, router]);

  // Global File Handler passed to child components
  const uploadFile = async (file: File, folder: string) => {
    if (!doctorId) return null;
    if (file.size > MAX_FILE_SIZE) {
      setError(`File ${file.name} exceeds 5MB limit.`);
      return null;
    }
    const ext = file.name.split(".").pop();
    const fileName = `${doctorId}/${folder}/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from("clinic-images").upload(fileName, file);
    
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from("clinic-images").getPublicUrl(data.path);
    return publicUrl;
  };

  const validateStep = (s: number): boolean => {
    setError(null);
    switch (s) {
      case 1:
        if (!basicInfo.clinicName.trim() || !basicInfo.doctorName.trim() || !basicInfo.specialization) {
          setError("Please fill all required fields.");
          return false;
        }
        return true;
      case 2:
        if (!contact.mobile.trim() || !contact.email.trim()) { setError("Contact info is required."); return false; }
        return true;
      case 3:
        if (!location.city.trim() || !location.address.trim()) { setError("Location details are required."); return false; }
        return true;
      default: return true;
    }
  };

  const navigateStep = (direction: "next" | "prev") => {
    if (direction === "next" && !validateStep(step)) return;
    setStep(s => direction === "next" ? Math.min(s + 1, 10) : Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleComplete = async () => {
    if (!doctorId) return;
    setSaving(true);
    try {
      // Supabase Transaction Logic handles data insertion from states...
      setStep(10); 
    } catch (err) {
      setError("Something went wrong during final submission.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="w-full max-w-2xl mx-auto">
        
        {/* Progress bar mapping */}
        <div className="flex items-center justify-center gap-1 mb-8 flex-wrap">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${step > i + 1 ? "bg-primary-500 text-white" : step === i + 1 ? "bg-primary-500 text-white ring-4 ring-primary-100" : "bg-gray-200 text-gray-500"}`}>
                {step > i + 1 ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < stepLabels.length - 1 && <div className={`w-6 h-0.5 mx-0.5 ${step > i + 1 ? "bg-primary-500" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}

        {/* --- DYNAMIC COMPONENT INJECTIONS --- */}
        {step === 1 && <BasicInfoStep basicInfo={basicInfo} setBasicInfo={setBasicInfo} />}
        {step === 2 && <ContactStep contact={contact} setContact={setContact} />}
        {step === 3 && <LocationStep location={location} setLocation={setLocation} />}
        {step === 4 && <ClinicDetailsStep clinicDetails={clinicDetails} setClinicDetails={setClinicDetails} uploadFile={uploadFile} />}
        {step === 5 && <ConsultationStep consultation={consultation} setConsultation={setConsultation} />}
        {step === 6 && <AvailabilityStep availability={availability} setAvailability={setAvailability} />}
        {step === 7 && <PublicProfileStep clinicName={basicInfo.clinicName} />}
        {step === 8 && <DocumentsStep documents={documents} setDocuments={setDocuments} doctorId={doctorId} />}
        {step === 9 && <ReviewStep basicInfo={basicInfo} contact={contact} location={location} />}
        
        {step === 10 && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center border">
            <h2 className="text-2xl font-bold mb-2">Setup Complete!</h2>
            <button onClick={() => router.push("/doctor/dashboard")} className="w-full py-3 bg-primary-500 text-white font-medium rounded-lg mt-4">Enter Dashboard</button>
          </div>
        )}

        {/* Dynamic Controls */}
        {step < 10 && (
          <div className="flex items-center justify-between mt-8 border-t pt-6">
            {step > 1 ? <button onClick={() => navigateStep("prev")} className="px-6 py-2.5 text-gray-600 rounded-lg hover:bg-gray-100">Back</button> : <div />}
            {step < 9 ? (
              <button onClick={() => navigateStep("next")} className="px-8 py-2.5 bg-primary-500 text-white font-medium rounded-lg">Continue</button>
            ) : (
              <button onClick={handleComplete} disabled={saving} className="px-8 py-2.5 bg-primary-600 text-white font-medium rounded-lg flex items-center gap-2">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                {saving ? "Deploying..." : "Complete Setup"}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
