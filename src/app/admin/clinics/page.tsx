"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Search, Building2, MapPin, DollarSign, Clock } from "lucide-react";
import type { Database } from "@/types/database";

type Clinic = Database["public"]["Tables"]["clinics"]["Row"];

interface ClinicWithDoctor extends Clinic {
  doctors: { id: string; full_name: string; email: string } | null;
}

export default function AdminClinicsPage() {
  const [loading, setLoading] = useState(true);
  const [clinics, setClinics] = useState<ClinicWithDoctor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from("clinics").select("*, doctors (id, full_name, email)").order("created_at", { ascending: false });
      if (!error && data) setClinics(data);
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  const filteredClinics = clinics.filter((clinic) =>
    !searchQuery || clinic.name?.toLowerCase().includes(searchQuery.toLowerCase()) || clinic.city?.toLowerCase().includes(searchQuery.toLowerCase()) || clinic.doctors?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clinics</h1>
        <p className="text-gray-600 mt-1">Manage registered clinics</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by clinic name, city, or doctor..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClinics.length > 0 ? (
          filteredClinics.map((clinic) => (
            <div key={clinic.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    {clinic.logo_url ? (
                      <img src={clinic.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Building2 className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{clinic.name}</h3>
                    <p className="text-sm text-primary-600">{clinic.doctors?.full_name || "Unknown"}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${clinic.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                  {clinic.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{clinic.address}, {clinic.city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span>${clinic.consultation_fee} consultation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{clinic.slot_duration_minutes} min slots</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                <span className="text-xs text-gray-500">Booking Mode:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${clinic.booking_mode === "auto" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {clinic.booking_mode === "auto" ? "Auto Confirm" : "Manual"}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No clinics found</p>
          </div>
        )}
      </div>
    </div>
  );
}
