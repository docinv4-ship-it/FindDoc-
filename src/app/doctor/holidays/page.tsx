"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Calendar, Plus, Trash2, X } from "lucide-react";
import type { Database } from "@/types/database";

type Holiday = Database["public"]["Tables"]["doctor_holidays"]["Row"];
type Clinic = Database["public"]["Tables"]["clinics"]["Row"];

export default function DoctorHolidaysPage() {
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ clinic_id: "", title: "", start_date: "", end_date: "", notes: "" });
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/doctor/login"); return; }
      const { data: doctor } = await supabase.from("doctors").select("id, is_onboarded").eq("user_id", user.id).single();
      if (!doctor) { router.push("/doctor/signup"); return; }
      if (!doctor.is_onboarded) { router.push("/doctor/onboarding"); return; }
      setDoctorId(doctor.id);

      const { data: clinicsData } = await supabase.from("clinics").select("*").eq("doctor_id", doctor.id);
      if (clinicsData) { setClinics(clinicsData); setForm((prev) => ({ ...prev, clinic_id: clinicsData[0]?.id || "" })); }

      const { data: holidaysData } = await supabase.from("doctor_holidays").select("*").in("clinic_id", clinicsData?.map((c: Clinic) => c.id) || []).order("start_date", { ascending: true });
      if (holidaysData) setHolidays(holidaysData);
      setLoading(false);
    };
    fetchData();
  }, [supabase, router]);

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clinic_id || !form.title || !form.start_date || !form.end_date) return;
    setSaving(true);
    const { data, error } = await supabase.from("doctor_holidays").insert({ clinic_id: form.clinic_id, title: form.title, start_date: form.start_date, end_date: form.end_date, notes: form.notes || null }).select();
    if (!error && data) {
      setHolidays((prev) => [...prev, data[0]]);
      setShowModal(false);
      setForm({ clinic_id: clinics[0]?.id || "", title: "", start_date: "", end_date: "", notes: "" });
    }
    setSaving(false);
  };

  const handleDeleteHoliday = async (holidayId: string) => {
    await supabase.from("doctor_holidays").delete().eq("id", holidayId);
    setHolidays((prev) => prev.filter((h) => h.id !== holidayId));
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Holidays & Leave</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your days off and availability</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 text-white font-medium rounded-lg" style={{ backgroundColor: "#36d1cf" }}>
          <Plus className="w-4 h-4" /> Add Holiday
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {holidays.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {holidays.map((holiday) => (
              <div key={holiday.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
                    <Calendar className="w-5 h-5" style={{ color: "#36d1cf" }} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{holiday.title}</p>
                    <p className="text-sm text-gray-500">{formatDate(holiday.start_date)} - {formatDate(holiday.end_date)}</p>
                  </div>
                </div>
                <button onClick={() => handleDeleteHoliday(holiday.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No holidays scheduled</p>
            <p className="text-sm text-gray-400 mt-1">Add holidays to block booking during those dates</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Add Holiday</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddHoliday} className="p-4 space-y-4">
              {clinics.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clinic</label>
                  <select value={form.clinic_id} onChange={(e) => setForm({ ...form, clinic_id: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg">
                    {clinics.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Vacation, Conference" className="w-full px-3 py-2 border border-gray-200 rounded-lg" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} min={form.start_date} className="w-full px-3 py-2 border border-gray-200 rounded-lg" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              </div>
              <button type="submit" disabled={saving} className="w-full py-2 text-white font-medium rounded-lg disabled:opacity-50" style={{ backgroundColor: "#36d1cf" }}>
                {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Add Holiday"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
