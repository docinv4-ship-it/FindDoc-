"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Coffee, Moon, X } from "lucide-react";
import type { Database } from "@/types/database";

type Break = Database["public"]["Tables"]["doctor_breaks"]["Row"];

const breakTypes = [{ value: "lunch", label: "Lunch Break", icon: Coffee }, { value: "prayer", label: "Prayer Break", icon: Moon }];

export default function DoctorBreaksPage() {
  const [loading, setLoading] = useState(true);
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  const [formData, setFormData] = useState<{ break_type: "lunch" | "prayer" | "custom"; start_time: string; end_time: string; day_of_week: number }>({ break_type: "lunch", start_time: "12:00", end_time: "13:00", day_of_week: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/doctor/login"); return; }
      const { data: doctorData } = await supabase.from("doctors").select("id").eq("user_id", user.id).single();
      if (!doctorData) { router.push("/doctor/signup"); return; }
      const { data: clinicData } = await supabase.from("clinics").select("id").eq("doctor_id", doctorData.id).single();
      if (clinicData) {
        setClinicId(clinicData.id);
        const { data: existingBreaks } = await supabase.from("doctor_breaks").select("*").eq("clinic_id", clinicData.id).eq("is_active", true).order("start_time", { ascending: true });
        if (existingBreaks) setBreaks(existingBreaks);
      }
      setLoading(false);
    };
    fetchData();
  }, [supabase, router]);

  const handleAddBreak = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;
    setSaving(true);
    try {
      const { data: newBreak } = await supabase.from("doctor_breaks").insert({ clinic_id: clinicId, break_type: formData.break_type, start_time: formData.start_time, end_time: formData.end_time, day_of_week: formData.day_of_week, is_recurring: true, is_active: true }).select().single();
      if (newBreak) setBreaks([...breaks, newBreak]);
      setShowModal(false);
      setFormData({ break_type: "lunch", start_time: "12:00", end_time: "13:00", day_of_week: 0 });
    } catch (err) { console.error("Error adding break:", err); }
    finally { setSaving(false); }
  };

  const handleDeleteBreak = async (breakId: string) => {
    if (!confirm("Are you sure you want to delete this break?")) return;
    try { await supabase.from("doctor_breaks").delete().eq("id", breakId); setBreaks(breaks.filter((b) => b.id !== breakId)); }
    catch (err) { console.error("Error deleting break:", err); }
  };

  const getBreakTypeInfo = (type: string) => breakTypes.find((t) => t.value === type) || { label: "Break", icon: Coffee };
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Break Schedule</h1><p className="text-gray-600">Manage your breaks and time-offs</p></div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"><Plus className="w-5 h-5" /> Add Break</button>
      </div>
      {breaks.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {breaks.map((b) => {
            const typeInfo = getBreakTypeInfo(b.break_type);
            const IconComponent = typeInfo.icon;
            return (
              <div key={b.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><IconComponent className="w-5 h-5 text-gray-600" /></div>
                  <div><p className="font-medium text-gray-900">{typeInfo.label}</p><p className="text-sm text-gray-500">{dayNames[b.day_of_week]} • {b.start_time} - {b.end_time}</p></div>
                </div>
                <button onClick={() => handleDeleteBreak(b.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-5 h-5" /></button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center"><Coffee className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No breaks configured</p><p className="text-sm text-gray-400 mt-1">Add breaks to block appointment slots</p></div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold text-gray-900">Add Break</h2><button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleAddBreak} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Break Type</label>
                <select value={formData.break_type} onChange={(e) => setFormData({ ...formData, break_type: e.target.value as "lunch" | "prayer" | "custom" })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">{breakTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                <select value={formData.day_of_week} onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">{dayNames.map((name, i) => <option key={i} value={i}>{name}</option>)}</select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" required />
                </div>
              </div>
              <button type="submit" disabled={saving} className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Add Break"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
