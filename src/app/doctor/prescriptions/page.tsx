"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, FileText, Plus, Trash2, X, Upload, Download, Search, Eye } from "lucide-react";

interface Prescription {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  file_url: string;
  notes: string | null;
  created_at: string;
  patients: { full_name: string } | null;
}

export default function DoctorPrescriptionsPage() {
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<{ id: string; full_name: string }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ patient_id: "", notes: "" });
  const [file, setFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
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

      // Fetch unique patients from appointments
      const { data: appointments } = await supabase.from("appointments").select("patient_id, patients (id, full_name)").eq("doctor_id", doctor.id);
      if (appointments) {
        const patientMap = new Map<string, { id: string; full_name: string }>();
        appointments.forEach((apt: any) => {
          if (apt.patients && !patientMap.has(apt.patient_id)) {
            patientMap.set(apt.patient_id, apt.patients);
          }
        });
        setPatients(Array.from(patientMap.values()));
      }

      // Fetch prescriptions (via patient relationship)
      const patientIds = appointments?.map((a: any) => a.patient_id) || [];
      if (patientIds.length > 0) {
        const { data: prescriptionsData } = await supabase
          .from("medical_records")
          .select("id, patient_id, file_url, notes, created_at, record_type, patients (full_name)")
          .in("patient_id", patientIds)
          .eq("record_type", "prescription")
          .order("created_at", { ascending: false });
        if (prescriptionsData) setPrescriptions(prescriptionsData);
      }

      setLoading(false);
    };
    fetchData();
  }, [supabase, router]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !form.patient_id) return;
    setSaving(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `prescriptions/${form.patient_id}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(fileName, file);
    if (uploadError) {
      alert("Upload failed");
      setSaving(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(fileName);

    const { data, error } = await supabase.from("medical_records").insert({
      patient_id: form.patient_id,
      file_url: publicUrl,
      notes: form.notes || null,
      record_type: "prescription",
    }).select();

    if (!error && data) {
      setPrescriptions((prev) => [{ ...data[0], patients: patients.find((p) => p.id === form.patient_id) || null }, ...prev]);
      setShowModal(false);
      setForm({ patient_id: "", notes: "" });
      setFile(null);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, fileUrl: string) => {
    if (!confirm("Delete this prescription?")) return;
    const path = fileUrl.split("/documents/")[1];
    if (path) await supabase.storage.from("documents").remove([path]);
    await supabase.from("medical_records").delete().eq("id", id);
    setPrescriptions((prev) => prev.filter((p) => p.id !== id));
  };

  const filtered = prescriptions.filter((p) => !searchTerm || p.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
          <p className="text-gray-600 mt-1">Manage digital prescriptions for patients</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 text-white font-medium rounded-lg" style={{ backgroundColor: "#36d1cf" }}>
          <Plus className="w-4 h-4" /> New Prescription
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by patient name..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filtered.map((rx) => (
              <div key={rx.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
                    <FileText className="w-5 h-5" style={{ color: "#36d1cf" }} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{rx.patients?.full_name || "Patient"}</p>
                    <p className="text-sm text-gray-500">{new Date(rx.created_at).toLocaleDateString()}</p>
                    {rx.notes && <p className="text-xs text-gray-400 mt-1">{rx.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={rx.file_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <Eye className="w-4 h-4 text-gray-600" />
                  </a>
                  <a href={rx.file_url} download className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <Download className="w-4 h-4 text-gray-600" />
                  </a>
                  <button onClick={() => handleDelete(rx.id, rx.file_url)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No prescriptions yet</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">New Prescription</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpload} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
                <select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg" required>
                  <option value="">Select patient...</option>
                  {patients.map((p) => (<option key={p.id} value={p.id}>{p.full_name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prescription File (PDF/Image)</label>
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 border border-gray-200 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Add notes..." rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none" />
              </div>
              <button type="submit" disabled={saving || !file || !form.patient_id} className="w-full py-2 text-white font-medium rounded-lg disabled:opacity-50" style={{ backgroundColor: "#36d1cf" }}>
                {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Upload Prescription"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
