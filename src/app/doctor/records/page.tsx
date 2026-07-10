"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, FileText, Plus, Trash2, X, Search, Eye, Download } from "lucide-react";

interface MedicalRecord {
  id: string;
  patient_id: string;
  file_url: string;
  notes: string | null;
  record_type: string;
  created_at: string;
  patients: { full_name: string } | null;
}

export default function DoctorRecordsPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [patients, setPatients] = useState<{ id: string; full_name: string }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ patient_id: "", record_type: "report", notes: "" });
  const [file, setFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
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

      const { data: appointments } = await supabase.from("appointments").select("patient_id, patients (id, full_name)").eq("doctor_id", doctor.id);
      if (appointments) {
        const patientMap = new Map<string, { id: string; full_name: string }>();
        appointments.forEach((apt: any) => {
          if (apt.patients && !patientMap.has(apt.patient_id)) patientMap.set(apt.patient_id, apt.patients);
        });
        setPatients(Array.from(patientMap.values()));
      }

      const patientIds = appointments?.map((a: any) => a.patient_id) || [];
      if (patientIds.length > 0) {
        const { data: recordsData } = await supabase.from("medical_records").select("*, patients (full_name)").in("patient_id", patientIds).order("created_at", { ascending: false });
        if (recordsData) setRecords(recordsData);
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
    const fileName = `records/${form.patient_id}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(fileName, file);
    if (uploadError) { alert("Upload failed"); setSaving(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(fileName);
    const { data, error } = await supabase.from("medical_records").insert({
      patient_id: form.patient_id,
      file_url: publicUrl,
      notes: form.notes || null,
      record_type: form.record_type,
    }).select();

    if (!error && data) {
      setRecords((prev) => [{ ...data[0], patients: patients.find((p) => p.id === form.patient_id) || null }, ...prev]);
      setShowModal(false);
      setForm({ patient_id: "", record_type: "report", notes: "" });
      setFile(null);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, fileUrl: string) => {
    if (!confirm("Delete this record?")) return;
    const path = fileUrl.split("/documents/")[1];
    if (path) await supabase.storage.from("documents").remove([path]);
    await supabase.from("medical_records").delete().eq("id", id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const filtered = records.filter((r) => !searchTerm || r.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const getTypeColor = (type: string) => {
    switch (type) {
      case "prescription": return "bg-blue-100 text-blue-800";
      case "report": return "bg-green-100 text-green-800";
      case "lab": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medical Records</h1>
          <p className="text-gray-600 mt-1">Manage patient medical records and documents</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 text-white font-medium rounded-lg" style={{ backgroundColor: "#36d1cf" }}>
          <Plus className="w-4 h-4" /> Upload Record
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
            {filtered.map((record) => (
              <div key={record.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
                    <FileText className="w-5 h-5" style={{ color: "#36d1cf" }} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{record.patients?.full_name || "Patient"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(record.record_type)}`}>{record.record_type}</span>
                      <span className="text-xs text-gray-400">{new Date(record.created_at).toLocaleDateString()}</span>
                    </div>
                    {record.notes && <p className="text-xs text-gray-500 mt-1">{record.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={record.file_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-gray-100"><Eye className="w-4 h-4 text-gray-600" /></a>
                  <a href={record.file_url} download className="p-2 rounded-lg hover:bg-gray-100"><Download className="w-4 h-4 text-gray-600" /></a>
                  <button onClick={() => handleDelete(record.id, record.file_url)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No medical records yet</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Upload Medical Record</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Record Type</label>
                <select value={form.record_type} onChange={(e) => setForm({ ...form, record_type: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg">
                  <option value="report">Medical Report</option>
                  <option value="lab">Lab Result</option>
                  <option value="prescription">Prescription</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 border border-gray-200 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none" />
              </div>
              <button type="submit" disabled={saving || !file || !form.patient_id} className="w-full py-2 text-white font-medium rounded-lg disabled:opacity-50" style={{ backgroundColor: "#36d1cf" }}>
                {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Upload Record"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
