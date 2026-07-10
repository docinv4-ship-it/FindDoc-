"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Search, User, Check, X, Mail, Phone } from "lucide-react";
import type { Database } from "@/types/database";

type Doctor = Database["public"]["Tables"]["doctors"]["Row"];

export default function AdminDoctorsPage() {
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from("doctors").select("*").order("created_at", { ascending: false });
      if (!error && data) setDoctors(data);
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  const filteredDoctors = doctors.filter((doc) =>
    !searchQuery || doc.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || doc.email?.toLowerCase().includes(searchQuery.toLowerCase()) || doc.specialization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleOnboarded = async (doctorId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("doctors").update({ is_onboarded: !currentStatus, updated_at: new Date().toISOString() }).eq("id", doctorId);
    if (!error) {
      setDoctors((prev) => prev.map((d) => d.id === doctorId ? { ...d, is_onboarded: !currentStatus } : d));
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Doctors</h1>
        <p className="text-gray-600 mt-1">Manage registered doctors</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, email, or specialization..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredDoctors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specialization</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Onboarded</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDoctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          {doc.profile_image_url ? (
                            <img src={doc.profile_image_url} alt="" className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <User className="w-5 h-5 text-primary-600" />
                          )}
                        </div>
                        <span className="font-medium text-gray-900">{doc.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Mail className="w-4 h-4" />{doc.email}
                        </div>
                        {doc.phone && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Phone className="w-4 h-4" />{doc.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{doc.specialization}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${doc.is_onboarded ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                        {doc.is_onboarded ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {doc.is_onboarded ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={() => handleToggleOnboarded(doc.id, doc.is_onboarded)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${doc.is_onboarded ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
                        {doc.is_onboarded ? "Revoke" : "Approve"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No doctors found</p>
          </div>
        )}
      </div>
    </div>
  );
}
