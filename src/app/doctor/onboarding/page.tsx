"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { OTHER_SPECIALIZATION } from "@/lib/data/specializations";
import LocationStep from "@/components/onboarding/LocationStep"; // Existing file imported here
import { 
  BasicInfo, Contact, ClinicDetails, Consultation, 
  LocationState, PublicProfile, VerificationDoc, BreakItem, AvailabilityDay
} from "@/types/onboarding";
import { 
  Step1BasicInfo, Step2Contact, Step4ClinicDetails, 
  Step5Consultation, Step6Availability, Step7PublicProfile, 
  Step8Documents, Step9Review, Step10Success 
} from "@/components/onboarding/StepComponents";

const stepLabels = ["Basic Info", "Contact", "Location", "Clinic Details", "Consultation", "Availability", "Public Profile", "Documents", "Review"];

export default function DoctorOnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    clinicName: "", doctorName: "", specialization: "", customSpecialization: "",
    qualification: "", experienceYears: "", registrationNumber: "",
  });

  const [contact, setContact] = useState<Contact>({
    mobile: "", email: "", website: "", facebook: "", instagram: "", linkedin: "", whatsapp: "",
  });

  const [location, setLocation] = useState<LocationState>({
    country: "United States", state: "", city: "", address: "", postalCode: "",
    latitude: "", longitude: "", timezone: "Asia/Karachi",
  });

  const [clinicDetails, setClinicDetails] = useState<ClinicDetails>({
    about: "", logoUrl: "", coverImageUrl: "", galleryImages: [] as string[],
    languagesSpoken: [] as string[],
  });
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [consultation, setConsultation] = useState<Consultation>({
    fee: "100", consultationType: "in_person",
    slotDuration: "30", bufferTime: "0", bookingMode: "auto",
  });

  const [availability, setAvailability] = useState<Record<number, AvailabilityDay>>({
    0: { enabled: true, start: "09:00", end: "17:00" }, 1: { enabled: true, start: "09:00", end: "17:00" },
    2: { enabled: true, start: "09:00", end: "17:00" }, 3: { enabled: true, start: "09:00", end: "17:00" },
    4: { enabled: true, start: "09:00", end: "17:00" }, 5: { enabled: false, start: "09:00", end: "13:00" },
    6: { enabled: false, start: "09:00", end: "13:00" },
  });
  const [breaks, setBreaks] = useState<BreakItem[]>([]);

  const [publicProfile, setPublicProfile] = useState<PublicProfile>({
    slug: "", bio: "", services: [] as string[], facilities: [] as string[],
  });
  const [newService, setNewService] = useState("");
  const [newFacility, setNewFacility] = useState("");
  const [newLanguage, setNewLanguage] = useState("");

  const [documents, setDocuments] = useState<VerificationDoc[]>([]);
  const docInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/doctor/login"); return; }
      const { data: doctorData } = await supabase.from("doctors").select("id, is_onboarded, full_name, email, phone, specialization, custom_specialization, qualification, experience_years, registration_number, bio, languages_spoken, services_offered, facebook_url, instagram_url, linkedin_url, whatsapp_number, website_url, license_number").eq("user_id", user.id).maybeSingle();
      if (!doctorData) { router.push("/doctor/signup"); return; }
      if (doctorData.is_onboarded) { router.push("/doctor/dashboard"); return; }
      setDoctorId(doctorData.id);
      setBasicInfo({
        clinicName: "",
        doctorName: doctorData.full_name || "",
        specialization: doctorData.specialization || "",
        customSpecialization: doctorData.custom_specialization || "",
        qualification: doctorData.qualification || "",
        experienceYears: doctorData.experience_years?.toString() || "",
        registrationNumber: doctorData.registration_number || doctorData.license_number || "",
      });
      setContact({
        mobile: doctorData.phone || "", email: doctorData.email || "",
        website: doctorData.website_url || "", facebook: doctorData.facebook_url || "",
        instagram: doctorData.instagram_url || "", linkedin: doctorData.linkedin_url || "",
        whatsapp: doctorData.whatsapp_number || "",
      });
      setPublicProfile(prev => ({
        ...prev,
        bio: doctorData.bio || "",
        services: doctorData.services_offered || [],
      }));
      setClinicDetails(prev => ({ ...prev, languagesSpoken: doctorData.languages_spoken || [] }));
      setLoading(false);
    };
    checkAuth();
  }, [supabase, router]);

  const generateSlug = (name: string) => {
    return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 60);
  };

  const uploadFile = async (file: File, folder: string) => {
    if (!doctorId) return null;
    const ext = file.name.split(".").pop();
    const fileName = `${doctorId}/${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const { data, error } = await supabase.storage.from("clinic-images").upload(fileName, file, { cacheControl: "3600", upsert: false });
    if (error) { console.error("Upload error:", error); return null; }
    const { data: { publicUrl } } = supabase.storage.from("clinic-images").getPublicUrl(data.path);
    return publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const url = await uploadFile(file, "logo");
    if (url) setClinicDetails(prev => ({ ...prev, logoUrl: url }));
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const url = await uploadFile(file, "cover");
    if (url) setClinicDetails(prev => ({ ...prev, coverImageUrl: url }));
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []); if (files.length === 0) return;
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadFile(file, "gallery");
      if (url) urls.push(url);
    }
    setClinicDetails(prev => ({ ...prev, galleryImages: [...prev.galleryImages, ...urls] }));
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []); if (!files.length || !doctorId) return;
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const fileName = `${doctorId}/documents/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const { data, error } = await supabase.storage.from("verification-docs").upload(fileName, file);
      if (error) { console.error("Doc upload error:", error); continue; }
      setDocuments(prev => [...prev, {
        type: "other", fileName: file.name, filePath: data.path,
        fileSize: file.size, mimeType: file.type,
      }]);
    }
  };

  const removeGalleryImage = (idx: number) => {
    setClinicDetails(prev => ({ ...prev, galleryImages: prev.galleryImages.filter((_, i) => i !== idx) }));
  };

  const addService = () => {
    if (newService.trim()) { setPublicProfile(prev => ({ ...prev, services: [...prev.services, newService.trim()] })); setNewService(""); }
  };
  const addFacility = () => {
    if (newFacility.trim()) { setPublicProfile(prev => ({ ...prev, facilities: [...prev.facilities, newFacility.trim()] })); setNewFacility(""); }
  };
  const addLanguage = () => {
    if (newLanguage.trim()) { setClinicDetails(prev => ({ ...prev, languagesSpoken: [...prev.languagesSpoken, newLanguage.trim()] })); setNewLanguage(""); }
  };

  const validateStep = (s: number): boolean => {
    setError(null);
    switch (s) {
      case 1:
        if (!basicInfo.clinicName.trim()) { setError("Clinic name is required"); return false; }
        if (!basicInfo.doctorName.trim()) { setError("Doctor name is required"); return false; }
        if (!basicInfo.specialization) { setError("Specialization is required"); return false; }
        if (basicInfo.specialization === OTHER_SPECIALIZATION && !basicInfo.customSpecialization.trim()) { setError("Please enter your custom specialization"); return false; }
        if (!basicInfo.qualification.trim()) { setError("Qualification is required"); return false; }
        if (!basicInfo.experienceYears.trim()) { setError("Experience years is required"); return false; }
        if (!basicInfo.registrationNumber.trim()) { setError("Registration/License number is required"); return false; }
        return true;
      case 2:
        if (!contact.mobile.trim()) { setError("Mobile number is required"); return false; }
        if (!contact.email.trim()) { setError("Email is required"); return false; }
        return true;
      case 3:
        if (!location.city.trim()) { setError("City is required"); return false; }
        if (!location.address.trim()) { setError("Full address is required"); return false; }
        return true;
      case 5:
        if (!consultation.fee || parseFloat(consultation.fee) < 0) { setError("Consultation fee is required"); return false; }
        if (!consultation.slotDuration || parseInt(consultation.slotDuration) < 5) { setError("Slot duration must be at least 5 minutes"); return false; }
        return true;
      case 6: {
        const hasAvailability = Object.values(availability).some(a => a.enabled);
        if (!hasAvailability) { setError("Please set at least one working day"); return false; }
        return true;
      }
      case 7:
        if (!publicProfile.slug.trim()) { setError("Clinic slug is required for your public profile"); return false; }
        return true;
      default: return true;
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      if (step === 1 && !publicProfile.slug) {
        setPublicProfile(prev => ({ ...prev, slug: generateSlug(basicInfo.clinicName) }));
      }
      setStep(s => Math.min(s + 1, 9));
    }
  };
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleComplete = async () => {
    if (!doctorId) return;
    setSaving(true);
    setError(null);
    try {
      const actualSpecialization = basicInfo.specialization === OTHER_SPECIALIZATION ? basicInfo.customSpecialization : basicInfo.specialization;

      const { error: doctorErr } = await supabase.from("doctors").update({
        full_name: basicInfo.doctorName,
        specialization: actualSpecialization,
        custom_specialization: basicInfo.specialization === OTHER_SPECIALIZATION ? basicInfo.customSpecialization : null,
        qualification: basicInfo.qualification,
        experience_years: parseInt(basicInfo.experienceYears) || 0,
        registration_number: basicInfo.registrationNumber,
        license_number: basicInfo.registrationNumber,
        bio: publicProfile.bio,
        languages_spoken: clinicDetails.languagesSpoken,
        services_offered: publicProfile.services,
        facebook_url: contact.facebook || null,
        instagram_url: contact.instagram || null,
        linkedin_url: contact.linkedin || null,
        whatsapp_number: contact.whatsapp || null,
        website_url: contact.website || null,
        phone: contact.mobile,
        is_onboarded: true,
      }).eq("id", doctorId);
      if (doctorErr) throw doctorErr;

      const { data: clinic, error: clinicErr } = await supabase.from("clinics").insert({
        doctor_id: doctorId,
        name: basicInfo.clinicName,
        address: location.address,
        city: location.city,
        state: location.state || null,
        country: location.country,
        postal_code: location.postalCode || null,
        phone: contact.mobile,
        email: contact.email,
        website: contact.website || null,
        slug: publicProfile.slug || generateSlug(basicInfo.clinicName),
        logo_url: clinicDetails.logoUrl || null,
        cover_image_url: clinicDetails.coverImageUrl || null,
        gallery_images: clinicDetails.galleryImages.length > 0 ? clinicDetails.galleryImages : null,
        about: clinicDetails.about || null,
        latitude: location.latitude ? parseFloat(location.latitude) : null,
        longitude: location.longitude ? parseFloat(location.longitude) : null,
        timezone: location.timezone || "Asia/Karachi", // Connected flawlessly here
        consultation_fee: parseFloat(consultation.fee) || 0,
        slot_duration_minutes: parseInt(consultation.slotDuration) || 30,
        buffer_time_minutes: parseInt(consultation.bufferTime) || 0,
        booking_mode: consultation.bookingMode,
        consultation_type: consultation.consultationType,
        facilities: publicProfile.facilities,
        languages_spoken: clinicDetails.languagesSpoken,
        is_active: true,
        account_status: "active",
      }).select("id").single();
      if (clinicErr) throw clinicErr;
      setClinicId(clinic.id);

      const availabilityRows = Object.entries(availability)
        .filter(([, config]) => config.enabled)
        .map(([day, config]) => ({
          clinic_id: clinic.id, day_of_week: parseInt(day),
          start_time: config.start, end_time: config.end, is_active: true,
        }));
      if (availabilityRows.length > 0) {
        const { error: availErr } = await supabase.from("availability").insert(availabilityRows);
        if (availErr) throw availErr;
      }

      if (breaks.length > 0) {
        const breakRows = breaks.map(b => ({
          clinic_id: clinic.id, break_type: "custom", title: b.title || "Break",
          day_of_week: b.day, start_time: b.start, end_time: b.end,
          is_recurring: true, is_active: true,
        }));
        const { error: breakErr } = await supabase.from("doctor_breaks").insert(breakRows);
        if (breakErr) console.error("Break insert error:", breakErr);
      }

      for (const doc of documents) {
        await supabase.from("verification_documents").insert({
          doctor_id: doctorId, document_type: doc.type as "license" | "certificate" | "clinic_proof" | "id_card" | "profile_photo" | "other",
          file_path: doc.filePath, file_name: doc.fileName, file_size: doc.fileSize,
          mime_type: doc.mimeType, status: "pending",
        });
      }

      if (documents.length > 0) {
        await supabase.from("verification_requests").insert({
          doctor_id: doctorId, status: "pending",
        }).eq("doctor_id", doctorId);
      }

      const { data: trialPlan } = await supabase.from("subscription_plans").select("id").eq("slug", "trial").maybeSingle();
      if (trialPlan) {
        const trialStart = new Date();
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14);
        await supabase.from("doctor_subscriptions").insert({
          doctor_id: doctorId, plan_id: trialPlan.id, status: "trial",
          trial_started_at: trialStart.toISOString(), trial_ends_at: trialEnd.toISOString(),
        });
      }

      setStep(10);
    } catch (err) {
      console.error("Onboarding error:", err);
      setError(err instanceof Error ? err.message : "Failed to complete onboarding. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-1 mb-8 flex-wrap">
          {stepLabels.map((label, i) => {
            const stepNum = i + 1;
            const isDone = step > stepNum;
            const isCurrent = step === stepNum;
            return (
              <div key={label} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${isDone ? "bg-primary-500 text-white" : isCurrent ? "bg-primary-500 text-white ring-4 ring-primary-100" : "bg-gray-200 text-gray-500"}`}>
                  {isDone ? <Check className="w-4 h-4" /> : stepNum}
                </div>
                {i < stepLabels.length - 1 && <div className={`w-6 h-0.5 mx-0.5 ${isDone ? "bg-primary-500" : "bg-gray-200"}`} />}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        {step === 1 && <Step1BasicInfo basicInfo={basicInfo} setBasicInfo={setBasicInfo} />}
        
        {step === 2 && <Step2Contact contact={contact} setContact={setContact} />}
        
        {step === 3 && (
          // Location component rendering
          <LocationStep location={location} setLocation={setLocation} />
        )}
        
        {step === 4 && (
          <Step4ClinicDetails 
            clinicDetails={clinicDetails} setClinicDetails={setClinicDetails}
            logoInputRef={logoInputRef} coverInputRef={coverInputRef} galleryInputRef={galleryInputRef}
            handleLogoUpload={handleLogoUpload} handleCoverUpload={handleCoverUpload} handleGalleryUpload={handleGalleryUpload}
            removeGalleryImage={removeGalleryImage} newLanguage={newLanguage} setNewLanguage={setNewLanguage} addLanguage={addLanguage}
          />
        )}
        
        {step === 5 && <Step5Consultation consultation={consultation} setConsultation={setConsultation} />}
        
        {step === 6 && <Step6Availability availability={availability} setAvailability={setAvailability} breaks={breaks} setBreaks={setBreaks} />}
        
        {step === 7 && (
          <Step7PublicProfile 
            publicProfile={publicProfile} setPublicProfile={setPublicProfile}
            newService={newService} setNewService={setNewService} addService={addService}
            newFacility={newFacility} setNewFacility={setNewFacility} addFacility={addFacility}
          />
        )}
        
        {step === 8 && <Step8Documents documents={documents} setDocuments={setDocuments} docInputRef={docInputRef} handleDocUpload={handleDocUpload} />}
        
        {step === 9 && (
          <Step9Review 
            basicInfo={basicInfo} location={location} consultation={consultation} 
            availability={availability} publicProfile={publicProfile} documents={documents} 
          />
        )}
        
        {step === 10 && <Step10Success router={router} />}

        {step < 10 && (
          <div className="flex items-center justify-between mt-6">
            {step > 1 ? (
              <button onClick={prevStep} className="px-4 py-2.5 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors">Back</button>
            ) : <div />}
            {step < 9 ? (
              <button onClick={nextStep} className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors">Continue</button>
            ) : (
              <button onClick={handleComplete} disabled={saving} className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                {saving ? "Saving..." : "Complete Setup"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
