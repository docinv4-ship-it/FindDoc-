"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Save, Check, Upload, User, Building2, Plus } from "lucide-react";

export default function DoctorSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinics, setClinics] = useState<{ id: string; name: string }[]>([]);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  const [doctorForm, setDoctorForm] = useState({ full_name: "", phone: "", specialization: "", profile_image_url: "" });
  const [clinicForm, setClinicForm] = useState({ name: "", address: "", city: "", phone: "", booking_mode: "auto" as "auto" | "manual", consultation_fee: "100", slot_duration_minutes: "30", logo_url: "" });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/doctor/login"); return; }
      const { data: doctorData } = await supabase.from("doctors").select("*").eq("user_id", user.id).single();
      if (doctorData) {
        setDoctorId(doctorData.id);
        setDoctorForm({ full_name: doctorData.full_name, phone: doctorData.phone || "", specialization: doctorData.specialization, profile_image_url: doctorData.profile_image_url || "" });
        const { data: clinicsData } = await supabase.from("clinics").select("*").eq("doctor_id", doctorData.id).eq("is_active", true);
        if (clinicsData && clinicsData.length > 0) {
          setClinics(clinicsData);
          setClinicId(clinicsData[0].id);
          const firstClinic = clinicsData[0];
          setClinicForm({ name: firstClinic.name, address: firstClinic.address, city: firstClinic.city, phone: firstClinic.phone || "", booking_mode: firstClinic.booking_mode, consultation_fee: firstClinic.consultation_fee.toString(), slot_duration_minutes: firstClinic.slot_duration_minutes.toString(), logo_url: firstClinic.logo_url || "" });
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [supabase, router]);

  useEffect(() => {
    const fetchClinicData = async () => {
      if (!clinicId || clinics.length === 0) return;
      const clinic = clinics.find((c) => c.id === clinicId);
      if (clinic) {
        const { data: clinicData } = await supabase.from("clinics").select("*").eq("id", clinicId).single();
        if (clinicData) {
          setClinicForm({ name: clinicData.name, address: clinicData.address, city: clinicData.city, phone: clinicData.phone || "", booking_mode: clinicData.booking_mode, consultation_fee: clinicData.consultation_fee.toString(), slot_duration_minutes: clinicData.slot_duration_minutes.toString(), logo_url: clinicData.logo_url || "" });
        }
      }
    };
    fetchClinicData();
  }, [clinicId, clinics, supabase]);

  const uploadImage = async (file: File, bucket: string, path: string): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${path}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true });
    if (uploadError) { console.error("Upload error:", uploadError); return null; }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicUrl;
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !doctorId) return;
    setUploadingProfile(true);
    try {
      const url = await uploadImage(file, "profiles", `doctors/${doctorId}`);
      if (url) {
        setDoctorForm({ ...doctorForm, profile_image_url: url });
        await supabase.from("doctors").update({ profile_image_url: url, updated_at: new Date().toISOString() }).eq("id", doctorId);
      }
    } catch (err) { console.error("Error uploading profile image:", err); }
    finally { setUploadingProfile(false); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clinicId) return;
    setUploadingLogo(true);
    try {
      const url = await uploadImage(file, "clinics", `logos/${clinicId}`);
      if (url) {
        setClinicForm({ ...clinicForm, logo_url: url });
        await supabase.from("clinics").update({ logo_url: url, updated_at: new Date().toISOString() }).eq("id", clinicId);
      }
    } catch (err) { console.error("Error uploading logo:", err); }
    finally { setUploadingLogo(false); }
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId) return;
    setSaving(true);
    try { await supabase.from("doctors").update({ full_name: doctorForm.full_name, phone: doctorForm.phone || null, specialization: doctorForm.specialization, updated_at: new Date().toISOString() }).eq("id", doctorId); setSaved(true); setTimeout(() => setSaved(false), 3000); }
    catch (err) { console.error("Error saving doctor:", err); }
    finally { setSaving(false); }
  };

  const handleSaveClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;
    setSaving(true);
    try { await supabase.from("clinics").update({ name: clinicForm.name, address: clinicForm.address, city: clinicForm.city, phone: clinicForm.phone, booking_mode: clinicForm.booking_mode, consultation_fee: parseFloat(clinicForm.consultation_fee) || 0, slot_duration_minutes: parseInt(clinicForm.slot_duration_minutes) || 30, updated_at: new Date().toISOString() }).eq("id", clinicId); setSaved(true); setTimeout(() => setSaved(false), 3000); }
    catch (err) { console.error("Error saving clinic:", err); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Settings</h1><p className="text-gray-600">Manage your profile and clinic settings</p></div>
        {saved && <div className="flex items-center gap-2 text-primary-600"><Check className="w-5 h-5" /> Saved</div>}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
              {doctorForm.profile_image_url ? (<img src={doctorForm.profile_image_url} alt="Profile" className="w-full h-full object-cover" />) : (<User className="w-8 h-8 text-gray-400" />)}
            </div>
            <button onClick={() => profileInputRef.current?.click()} disabled={uploadingProfile} className="absolute bottom-0 right-0 p-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-sm transition-colors disabled:opacity-50">
              {uploadingProfile ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            </button>
            <input ref={profileInputRef} type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Profile Picture</p>
            <p className="text-xs text-gray-500">Click to upload a new photo</p>
          </div>
        </div>
        <form onSubmit={handleSaveDoctor} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" value={doctorForm.full_name} onChange={(e) => setDoctorForm({ ...doctorForm, full_name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" value={doctorForm.phone} onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
            <input type="text" value={doctorForm.specialization} onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-medium rounded-lg transition-colors">{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Save Profile</button>
        </form>
      </div>
      {clinicId && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Clinic</h2>
            {clinics.length > 1 && (
              <select
                value={clinicId || ""}
                onChange={(e) => setClinicId(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                {clinicForm.logo_url ? (<img src={clinicForm.logo_url} alt="Logo" className="w-full h-full object-cover" />) : (<Building2 className="w-8 h-8 text-gray-400" />)}
              </div>
              <button onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className="absolute bottom-0 right-0 p-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-sm transition-colors disabled:opacity-50">
                {uploadingLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              </button>
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Clinic Logo</p>
              <p className="text-xs text-gray-500">Click to upload a logo</p>
            </div>
          </div>
          <form onSubmit={handleSaveClinic} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Name</label>
              <input type="text" value={clinicForm.name} onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" value={clinicForm.address} onChange={(e) => setClinicForm({ ...clinicForm, address: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input type="text" value={clinicForm.city} onChange={(e) => setClinicForm({ ...clinicForm, city: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Phone</label>
              <input type="tel" value={clinicForm.phone} onChange={(e) => setClinicForm({ ...clinicForm, phone: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fee ($)</label>
                <input type="number" value={clinicForm.consultation_fee} onChange={(e) => setClinicForm({ ...clinicForm, consultation_fee: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slot (min)</label>
                <input type="number" value={clinicForm.slot_duration_minutes} onChange={(e) => setClinicForm({ ...clinicForm, slot_duration_minutes: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Booking Mode</label>
                <select value={clinicForm.booking_mode} onChange={(e) => setClinicForm({ ...clinicForm, booking_mode: e.target.value as "auto" | "manual" })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="auto">Auto Confirm</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-medium rounded-lg transition-colors">{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Save Clinic</button>
          </form>
        </div>
      )}
    </div>
  );
}
