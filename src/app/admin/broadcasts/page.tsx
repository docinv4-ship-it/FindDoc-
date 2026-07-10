"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Megaphone, Plus, Trash2, X, Send } from "lucide-react";
import type { Database } from "@/types/database";

type BroadcastMessage = Database["public"]["Tables"]["broadcast_messages"]["Row"];

interface BroadcastWithClinic extends BroadcastMessage {
  doctors: { full_name: string } | null;
  clinics: { name: string } | null;
}

export default function AdminBroadcastsPage() {
  const [loading, setLoading] = useState(true);
  const [broadcasts, setBroadcasts] = useState<BroadcastWithClinic[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ message: "" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from("broadcast_messages").select("*, doctors (full_name), clinics (name)").order("sent_at", { ascending: false });
      if (data) setBroadcasts(data);
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.message) return;
    setSaving(true);
    const { data: firstDoctor } = await supabase.from("doctors").select("id").limit(1).single();
    const { data: firstClinic } = await supabase.from("clinics").select("id").limit(1).single();
    if (!firstDoctor || !firstClinic) {
      alert("No doctors or clinics found");
      setSaving(false);
      return;
    }
    const { data, error } = await supabase.from("broadcast_messages").insert({
      message: form.message,
      doctor_id: firstDoctor.id,
      clinic_id: firstClinic.id,
      recipient_count: 0,
    }).select();
    if (!error && data) {
      setBroadcasts((prev) => [{ ...data[0], doctors: null, clinics: null }, ...prev]);
      setShowModal(false);
      setForm({ message: "" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this broadcast?")) return;
    await supabase.from("broadcast_messages").delete().eq("id", id);
    setBroadcasts((prev) => prev.filter((b) => b.id !== id));
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Broadcast Messages</h1>
          <p className="text-gray-600 mt-1">View platform-wide announcements from doctors</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 text-white font-medium rounded-lg" style={{ backgroundColor: "#36d1cf" }}>
          <Plus className="w-4 h-4" /> New Broadcast
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {broadcasts.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {broadcasts.map((broadcast) => (
              <div key={broadcast.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
                      <Megaphone className="w-5 h-5" style={{ color: "#36d1cf" }} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mt-1">{broadcast.message}</p>
                      <div className="flex items-center gap-3 mt-2">
                        {broadcast.doctors && <span className="text-xs text-gray-500">By: {broadcast.doctors.full_name}</span>}
                        {broadcast.clinics && <span className="text-xs text-gray-500">| {broadcast.clinics.name}</span>}
                        <span className="text-xs text-gray-400">{formatDate(broadcast.sent_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleDelete(broadcast.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No broadcasts yet</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">New Broadcast</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Your announcement message..." rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none" required />
              </div>
              <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 py-2.5 text-white font-medium rounded-lg disabled:opacity-50" style={{ backgroundColor: "#36d1cf" }}>
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />} Send Broadcast
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
