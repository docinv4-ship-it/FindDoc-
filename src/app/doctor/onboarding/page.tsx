"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Loader2, Building2, MapPin, Phone, Clock, Check, Globe, User,
  Mail, Image as ImageIcon, FileText, Stethoscope, Calendar,
  Star, Shield, Upload, X, Plus, Tag, Languages, Sparkles,
} from "lucide-react";
import SpecializationDropdown from "@/components/SpecializationDropdown";
import { OTHER_SPECIALIZATION } from "@/lib/data/specializations";

const daysOfWeek = [
  { id: 0, name: "Monday" }, { id: 1, name: "Tuesday" }, { id: 2, name: "Wednesday" },
  { id: 3, name: "Thursday" }, { id: 4, name: "Friday" }, { id: 5, name: "Saturday" },
  { id: 6, name: "Sunday" },
];

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

  // Step 1: Basic Info
  const [basicInfo, setBasicInfo] = useState({
    clinicName: "", doctorName: "", specialization: "", customSpecialization: "",
    qualification: "", experienceYears: "", registrationNumber: "",
  });

  // Step 2: Contact
  const [contact, setContact] = useState({
    mobile: "", email: "", website: "", facebook: "", instagram: "", linkedin: "", whatsapp: "",
  });

  // Step 3: Location
  const [location, setLocation] = useState({
    country: "United States", state: "", city: "", address: "", postalCode: "",
    latitude: "", longitude: "",
  });

  // Step 4: Clinic Details
  const [clinicDetails, setClinicDetails] = useState({
    about: "", logoUrl: "", coverImageUrl: "", galleryImages: [] as string[],
    languagesSpoken: [] as string[],
  });
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Step 5: Consultation
  const [consultation, setConsultation] = useState({
    fee: "100", consultationType: "in_person" as "in_person" | "online" | "both",
    slotDuration: "30", bufferTime: "0", bookingMode: "auto" as "auto" | "manual",
  });

  // Step 6: Availability
  const [availability, setAvailability] = useState<Record<number, { enabled: boolean; start: string; end: string }>>({
    0: { enabled: true, start: "09:00", end: "17:00" }, 1: { enabled: true, start: "09:00", end: "17:00" },
    2: { enabled: true, start: "09:00", end: "17:00" }, 3: { enabled: true, start: "09:00", end: "17:00" },
    4: { enabled: true, start: "09:00", end: "17:00" }, 5: { enabled: false, start: "09:00", end: "13:00" },
    6: { enabled: false, start: "09:00", end: "13:00" },
  });
  const [breaks, setBreaks] = useState<{ day: number; start: string; end: string; title: string }[]>([]);

  // Step 7: Public Profile
  const [publicProfile, setPublicProfile] = useState({
    slug: "", bio: "", services: [] as string[], facilities: [] as string[],
  });
  const [newService, setNewService] = useState("");
  const [newFacility, setNewFacility] = useState("");
  const [newLanguage, setNewLanguage] = useState("");

  // Step 8: Documents
  const [documents, setDocuments] = useState<{ type: string; fileName: string; filePath: string; fileSize: number; mimeType: string }[]>([]);
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

      // Update doctor profile
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

      // Create clinic
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

      // Insert availability
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

      // Insert breaks
      if (breaks.length > 0) {
        const breakRows = breaks.map(b => ({
          clinic_id: clinic.id, break_type: "custom", title: b.title || "Break",
          day_of_week: b.day, start_time: b.start, end_time: b.end,
          is_recurring: true, is_active: true,
        }));
        const { error: breakErr } = await supabase.from("doctor_breaks").insert(breakRows);
        if (breakErr) console.error("Break insert error:", breakErr);
      }

      // Insert verification documents
      for (const doc of documents) {
        await supabase.from("verification_documents").insert({
          doctor_id: doctorId, document_type: doc.type as "license" | "certificate" | "clinic_proof" | "id_card" | "profile_photo" | "other",
          file_path: doc.filePath, file_name: doc.fileName, file_size: doc.fileSize,
          mime_type: doc.mimeType, status: "pending",
        });
      }

      // Create verification request if documents exist
      if (documents.length > 0) {
        await supabase.from("verification_requests").insert({
          doctor_id: doctorId, status: "pending",
        }).eq("doctor_id", doctorId);
      }

      // Create trial subscription
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

      setStep(10); // Success step
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
        {/* Progress bar */}
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

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Basic Information</h2>
            <p className="text-gray-600 mb-6">Tell us about your clinic and professional credentials</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={basicInfo.clinicName} onChange={(e) => setBasicInfo({ ...basicInfo, clinicName: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="HealthCare Medical Center" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={basicInfo.doctorName} onChange={(e) => setBasicInfo({ ...basicInfo, doctorName: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Dr. John Smith" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                <SpecializationDropdown value={basicInfo.specialization} customValue={basicInfo.customSpecialization} onChange={(val) => setBasicInfo({ ...basicInfo, specialization: val })} onCustomChange={(val) => setBasicInfo({ ...basicInfo, customSpecialization: val })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" value={basicInfo.qualification} onChange={(e) => setBasicInfo({ ...basicInfo, qualification: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="MBBS, MD" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
                  <input type="number" min="0" value={basicInfo.experienceYears} onChange={(e) => setBasicInfo({ ...basicInfo, experienceYears: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="10" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration / License Number</label>
                <input type="text" value={basicInfo.registrationNumber} onChange={(e) => setBasicInfo({ ...basicInfo, registrationNumber: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="MD-12345" required />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Contact */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Contact Information</h2>
            <p className="text-gray-600 mb-6">How patients can reach you</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="tel" value={contact.mobile} onChange={(e) => setContact({ ...contact, mobile: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="+1 555 123 4567" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="clinic@example.com" required />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website (Optional)</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="url" value={contact.website} onChange={(e) => setContact({ ...contact, website: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="https://yourclinic.com" />
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Social Links (Optional)</p>
                <div className="grid grid-cols-2 gap-4">
                  <input type="url" value={contact.facebook} onChange={(e) => setContact({ ...contact, facebook: e.target.value })} className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Facebook URL" />
                  <input type="url" value={contact.instagram} onChange={(e) => setContact({ ...contact, instagram: e.target.value })} className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Instagram URL" />
                  <input type="url" value={contact.linkedin} onChange={(e) => setContact({ ...contact, linkedin: e.target.value })} className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="LinkedIn URL" />
                  <input type="tel" value={contact.whatsapp} onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })} className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="WhatsApp Number" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Location */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Clinic Location</h2>
            <p className="text-gray-600 mb-6">Where is your clinic located?</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input type="text" value={location.country} onChange={(e) => setLocation({ ...location, country: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Province / State</label>
                  <input type="text" value={location.state} onChange={(e) => setLocation({ ...location, state: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="California" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input type="text" value={location.city} onChange={(e) => setLocation({ ...location, city: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Los Angeles" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code (Optional)</label>
                  <input type="text" value={location.postalCode} onChange={(e) => setLocation({ ...location, postalCode: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="90001" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea value={location.address} onChange={(e) => setLocation({ ...location, address: e.target.value })} rows={2} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="123 Main Street, Suite 100, Los Angeles, CA" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitude (Optional)</label>
                  <input type="text" value={location.latitude} onChange={(e) => setLocation({ ...location, latitude: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="34.0522" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitude (Optional)</label>
                  <input type="text" value={location.longitude} onChange={(e) => setLocation({ ...location, longitude: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="-118.2437" />
                </div>
              </div>
              <p className="text-xs text-gray-500">Tip: You can find your latitude/longitude from Google Maps by right-clicking your location.</p>
            </div>
          </div>
        )}

        {/* Step 4: Clinic Details */}
        {step === 4 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Clinic Details</h2>
            <p className="text-gray-600 mb-6">Add visual and descriptive information about your clinic</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">About Clinic</label>
                <textarea value={clinicDetails.about} onChange={(e) => setClinicDetails({ ...clinicDetails, about: e.target.value })} rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Tell patients what makes your clinic special..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Logo</label>
                  <div className="flex items-center gap-3">
                    {clinicDetails.logoUrl ? (
                      <div className="relative">
                        <img src={clinicDetails.logoUrl} alt="Logo" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                        <button type="button" onClick={() => setClinicDetails(prev => ({ ...prev, logoUrl: "" }))} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => logoInputRef.current?.click()} className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-primary-400 transition-colors">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </button>
                    )}
                    <button type="button" onClick={() => logoInputRef.current?.click()} className="text-sm text-primary-600 hover:text-primary-700">Upload Logo</button>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image</label>
                  <div className="flex items-center gap-3">
                    {clinicDetails.coverImageUrl ? (
                      <div className="relative">
                        <img src={clinicDetails.coverImageUrl} alt="Cover" className="w-20 h-16 rounded-lg object-cover border border-gray-200" />
                        <button type="button" onClick={() => setClinicDetails(prev => ({ ...prev, coverImageUrl: "" }))} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => coverInputRef.current?.click()} className="w-20 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-primary-400 transition-colors">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </button>
                    )}
                    <button type="button" onClick={() => coverInputRef.current?.click()} className="text-sm text-primary-600 hover:text-primary-700">Upload Cover</button>
                    <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gallery Photos</label>
                <div className="flex flex-wrap gap-3 mb-2">
                  {clinicDetails.galleryImages.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img src={img} alt={`Gallery ${idx + 1}`} className="w-20 h-20 rounded-lg object-cover border border-gray-200" />
                      <button type="button" onClick={() => removeGalleryImage(idx)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => galleryInputRef.current?.click()} className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-primary-400 transition-colors">
                    <Plus className="w-6 h-6 text-gray-400" />
                  </button>
                </div>
                <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Languages Spoken</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {clinicDetails.languagesSpoken.map((lang, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm">
                      <Languages className="w-3 h-3" />
                      {lang}
                      <button type="button" onClick={() => setClinicDetails(prev => ({ ...prev, languagesSpoken: prev.languagesSpoken.filter((_, i) => i !== idx) }))} className="text-primary-400 hover:text-primary-600"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newLanguage} onChange={(e) => setNewLanguage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLanguage(); } }} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. English, Spanish, French" />
                  <button type="button" onClick={addLanguage} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Consultation */}
        {step === 5 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Consultation Settings</h2>
            <p className="text-gray-600 mb-6">Configure your appointment and consultation preferences</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee ($)</label>
                  <p className="text-xs text-gray-500 mb-1">Display only - no online payment</p>
                  <input type="number" min="0" step="0.01" value={consultation.fee} onChange={(e) => setConsultation({ ...consultation, fee: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="100" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Type</label>
                  <select value={consultation.consultationType} onChange={(e) => setConsultation({ ...consultation, consultationType: e.target.value as "in_person" | "online" | "both" })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="in_person">In-Person Only</option>
                    <option value="online">Online Only</option>
                    <option value="both">Both In-Person & Online</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slot Duration (min)</label>
                  <input type="number" min="5" step="5" value={consultation.slotDuration} onChange={(e) => setConsultation({ ...consultation, slotDuration: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="30" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buffer Time (min)</label>
                  <input type="number" min="0" step="5" value={consultation.bufferTime} onChange={(e) => setConsultation({ ...consultation, bufferTime: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Booking Mode</label>
                  <select value={consultation.bookingMode} onChange={(e) => setConsultation({ ...consultation, bookingMode: e.target.value as "auto" | "manual" })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="auto">Auto Confirm</option>
                    <option value="manual">Manual Approval</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Availability */}
        {step === 6 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Working Hours & Availability</h2>
            <p className="text-gray-600 mb-6">Set your weekly schedule and break times</p>
            <div className="space-y-3">
              {daysOfWeek.map((day) => (
                <div key={day.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input type="checkbox" checked={availability[day.id].enabled} onChange={(e) => setAvailability({ ...availability, [day.id]: { ...availability[day.id], enabled: e.target.checked } })} className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500" />
                  <span className="w-24 font-medium text-gray-700">{day.name}</span>
                  {availability[day.id].enabled && (
                    <>
                      <div className="relative flex-1">
                        <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="time" value={availability[day.id].start} onChange={(e) => setAvailability({ ...availability, [day.id]: { ...availability[day.id], start: e.target.value } })} className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                      </div>
                      <span className="text-gray-400">to</span>
                      <div className="relative flex-1">
                        <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="time" value={availability[day.id].end} onChange={(e) => setAvailability({ ...availability, [day.id]: { ...availability[day.id], end: e.target.value } })} className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Break Times (Optional)</p>
              {breaks.length > 0 && (
                <div className="space-y-2 mb-3">
                  {breaks.map((b, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
                      <span className="flex-1">{daysOfWeek.find(d => d.id === b.day)?.name}</span>
                      <span>{b.start} - {b.end}</span>
                      <span className="text-gray-500">{b.title}</span>
                      <button type="button" onClick={() => setBreaks(breaks.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => setBreaks([...breaks, { day: 0, start: "12:00", end: "13:00", title: "Lunch" }])} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"><Plus className="w-4 h-4" /> Add Break</button>
            </div>
          </div>
        )}

        {/* Step 7: Public Profile */}
        {step === 7 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Public Profile & SEO</h2>
            <p className="text-gray-600 mb-6">Configure your public-facing clinic page</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Slug (URL)</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">/clinic/</span>
                  <input type="text" value={publicProfile.slug} onChange={(e) => setPublicProfile({ ...publicProfile, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") })} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="healthcare-medical-center" required />
                </div>
                <p className="text-xs text-gray-500 mt-1">This will be your public URL: /clinic/{publicProfile.slug || "your-slug"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Short Bio</label>
                <textarea value={publicProfile.bio} onChange={(e) => setPublicProfile({ ...publicProfile, bio: e.target.value })} rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="A brief introduction about yourself and your practice..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Services Offered</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {publicProfile.services.map((s, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                      <Tag className="w-3 h-3" />{s}
                      <button type="button" onClick={() => setPublicProfile(prev => ({ ...prev, services: prev.services.filter((_, i) => i !== idx) }))} className="text-blue-400 hover:text-blue-600"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newService} onChange={(e) => setNewService(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addService(); } }} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. General Checkup, Vaccination" />
                  <button type="button" onClick={addService} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Facilities / Amenities</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {publicProfile.facilities.map((f, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                      <Sparkles className="w-3 h-3" />{f}
                      <button type="button" onClick={() => setPublicProfile(prev => ({ ...prev, facilities: prev.facilities.filter((_, i) => i !== idx) }))} className="text-green-400 hover:text-green-600"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newFacility} onChange={(e) => setNewFacility(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFacility(); } }} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. Parking, WiFi, Wheelchair Access" />
                  <button type="button" onClick={addFacility} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 8: Documents */}
        {step === 8 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Verification Documents</h2>
            <p className="text-gray-600 mb-6">Upload your private documents for verification (Optional, but recommended)</p>
            <div className="space-y-3">
              {documents.length > 0 && (
                <div className="space-y-2 mb-4">
                  {documents.map((doc, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">{doc.fileName}</p>
                        <p className="text-xs text-gray-500">{(doc.fileSize / 1024).toFixed(1)} KB</p>
                      </div>
                      <select value={doc.type} onChange={(e) => setDocuments(docs => docs.map((d, i) => i === idx ? { ...d, type: e.target.value } : d))} className="text-sm px-2 py-1 border border-gray-200 rounded-lg">
                        <option value="license">Medical License</option>
                        <option value="id_card">National ID / Passport</option>
                        <option value="clinic_proof">Clinic Proof</option>
                        <option value="certificate">Certificate</option>
                        <option value="other">Other</option>
                      </select>
                      <button type="button" onClick={() => setDocuments(docs => docs.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => docInputRef.current?.click()} className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-primary-400 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Click to upload documents</span>
                <span className="text-xs text-gray-400 mt-1">Medical License, National ID, Clinic Proof, Certificates (PDF, JPG, PNG)</span>
              </button>
              <input ref={docInputRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleDocUpload} />
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>Your documents are stored securely and privately. They will only be visible to admin reviewers for verification purposes.</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 9: Review */}
        {step === 9 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Review & Complete</h2>
            <p className="text-gray-600 mb-6">Please review your information before completing</p>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1"><Stethoscope className="w-4 h-4" /> Basic Info</h3>
                <dl className="text-sm space-y-1">
                  <div className="flex justify-between"><dt className="text-gray-500">Clinic:</dt><dd className="font-medium">{basicInfo.clinicName}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Doctor:</dt><dd className="font-medium">{basicInfo.doctorName}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Specialization:</dt><dd className="font-medium">{basicInfo.specialization === OTHER_SPECIALIZATION ? basicInfo.customSpecialization : basicInfo.specialization}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Experience:</dt><dd className="font-medium">{basicInfo.experienceYears} years</dd></div>
                </dl>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1"><MapPin className="w-4 h-4" /> Location</h3>
                <dl className="text-sm space-y-1">
                  <div className="flex justify-between"><dt className="text-gray-500">City:</dt><dd className="font-medium">{location.city}, {location.country}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Address:</dt><dd className="font-medium text-right">{location.address}</dd></div>
                </dl>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1"><Calendar className="w-4 h-4" /> Consultation</h3>
                <dl className="text-sm space-y-1">
                  <div className="flex justify-between"><dt className="text-gray-500">Fee:</dt><dd className="font-medium">${consultation.fee}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Type:</dt><dd className="font-medium">{consultation.consultationType === "in_person" ? "In-Person" : consultation.consultationType === "online" ? "Online" : "Both"}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Slot:</dt><dd className="font-medium">{consultation.slotDuration} min</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Working Days:</dt><dd className="font-medium">{Object.values(availability).filter(a => a.enabled).length} days/week</dd></div>
                </dl>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1"><Globe className="w-4 h-4" /> Public Profile</h3>
                <dl className="text-sm space-y-1">
                  <div className="flex justify-between"><dt className="text-gray-500">URL:</dt><dd className="font-medium">/clinic/{publicProfile.slug}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Services:</dt><dd className="font-medium">{publicProfile.services.length} services</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Facilities:</dt><dd className="font-medium">{publicProfile.facilities.length} facilities</dd></div>
                </dl>
              </div>
              {documents.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1"><Shield className="w-4 h-4" /> Documents</h3>
                  <p className="text-sm text-gray-600">{documents.length} document(s) uploaded for verification</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 10: Success */}
        {step === 10 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Setup Complete!</h2>
            <p className="text-gray-600 mb-2">Your clinic is ready. You can now start accepting appointments.</p>
            <p className="text-sm text-gray-500 mb-6">A 14-day free trial has been activated for your account.</p>
            <button onClick={() => router.push("/doctor/dashboard")} className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors">Go to Dashboard</button>
          </div>
        )}

        {/* Navigation buttons */}
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
