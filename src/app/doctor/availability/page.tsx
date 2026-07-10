"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Clock, Check, Save, Building2 } from "lucide-react";

const daysOfWeek = [{ id: 0, name: "Monday" }, { id: 1, name: "Tuesday" }, { id: 2, name: "Wednesday" }, { id: 3, name: "Thursday" }, { id: 4, name: "Friday" }, { id: 5, name: "Saturday" }, { id: 6, name: "Sunday" }];

export default function DoctorAvailabilityPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinics, setClinics] = useState<{ id: string; name: string }[]>([]);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  const [availability, setAvailability] = useState<Record<number, { enabled: boolean; start: string; end: string }>>({
    0: { enabled: false, start: "09:00", end: "17:00" }, 1: { enabled: false, start: "09:00", end: "17:00" },
    2: { enabled: false, start: "09:00", end: "17:00" }, 3: { enabled: false, start: "09:00", end: "17:00" },
    4: { enabled: false, start: "09:00", end: "17:00" }, 5: { enabled: false, start: "09:00", end: "13:00" },
    6: { enabled: false, start: "09:00", end: "13:00" },
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/doctor/login"); return; }
      const { data: doctorData } = await supabase.from("doctors").select("id, is_onboarded").eq("user_id", user.id).single();
      if (!doctorData || !doctorData.is_onboarded) { router.push("/doctor/onboarding"); return; }
      const { data: clinicsData } = await supabase.from("clinics").select("id, name").eq("doctor_id", doctorData.id).eq("is_active", true);
      if (!clinicsData || clinicsData.length === 0) { router.push("/doctor/onboarding"); return; }
      setClinics(clinicsData);
      setClinicId(clinicsData[0].id);
      setLoading(false);
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, router]);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!clinicId) return;
      const resetAvailability = {
        0: { enabled: false, start: "09:00", end: "17:00" }, 1: { enabled: false, start: "09:00", end: "17:00" },
        2: { enabled: false, start: "09:00", end: "17:00" }, 3: { enabled: false, start: "09:00", end: "17:00" },
        4: { enabled: false, start: "09:00", end: "17:00" }, 5: { enabled: false, start: "09:00", end: "13:00" },
        6: { enabled: false, start: "09:00", end: "13:00" },
      };
      const { data: existingAvailability } = await supabase.from("availability").select("*").eq("clinic_id", clinicId).eq("is_active", true);
      if (existingAvailability && existingAvailability.length > 0) {
        const newAvailability = { ...resetAvailability };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        existingAvailability.forEach((a: any) => {
          const day = a.day_of_week as number;
          if (day >= 0 && day <= 6) {
            newAvailability[day as 0 | 1 | 2 | 3 | 4 | 5 | 6] = { enabled: true, start: a.start_time, end: a.end_time };
          }
        });
        setAvailability(newAvailability);
      } else {
        setAvailability(resetAvailability);
      }
    };
    fetchAvailability();
  }, [clinicId, supabase]);

  const handleSave = async () => {
    if (!clinicId) return;
    setSaving(true); setSaved(false);
    try {
      await supabase.from("availability").delete().eq("clinic_id", clinicId);
      const rows = Object.entries(availability).filter(([, config]) => config.enabled).map(([day, config]) => ({ clinic_id: clinicId, day_of_week: parseInt(day), start_time: config.start, end_time: config.end, is_active: true }));
      if (rows.length > 0) { const { error } = await supabase.from("availability").insert(rows); if (error) throw error; }
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error("Error saving availability:", err); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Availability Schedule</h1><p className="text-gray-600">Set your working hours for appointments</p></div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-medium rounded-lg transition-colors">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <><Check className="w-5 h-5" /> Saved</> : <><Save className="w-5 h-5" /> Save</>}
        </button>
      </div>

      {clinics.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Building2 className="w-4 h-4" />
            Select Clinic
          </label>
          <select
            value={clinicId || ""}
            onChange={(e) => setClinicId(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        {daysOfWeek.map((day) => (
          <div key={day.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input type="checkbox" checked={availability[day.id].enabled} onChange={(e) => setAvailability({ ...availability, [day.id]: { ...availability[day.id], enabled: e.target.checked } })} className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500" />
            <span className="w-28 font-medium text-gray-700">{day.name}</span>
            {availability[day.id].enabled && (
              <>
                <div className="relative flex-1"><Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="time" value={availability[day.id].start} onChange={(e) => setAvailability({ ...availability, [day.id]: { ...availability[day.id], start: e.target.value } })} className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
                <span className="text-gray-400">to</span>
                <div className="relative flex-1"><Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="time" value={availability[day.id].end} onChange={(e) => setAvailability({ ...availability, [day.id]: { ...availability[day.id], end: e.target.value } })} className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
