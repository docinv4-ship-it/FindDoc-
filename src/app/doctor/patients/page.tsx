"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Users, User, Phone, Calendar, MessageCircle, Search } from "lucide-react";
import type { Database } from "@/types/database";

type Patient = Database["public"]["Tables"]["patients"]["Row"];

interface PatientWithStats extends Patient {
  appointment_count: number;
  last_appointment: string | null;
}

export default function DoctorPatientsPage() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<PatientWithStats[]>([]);
  const [search, setSearch] = useState("");
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

      const { data: appointments } = await supabase.from("appointments").select("patient_id, appointment_date, patients (*)").eq("doctor_id", doctor.id).order("appointment_date", { ascending: false });

      if (appointments) {
        const patientMap = new Map<string, PatientWithStats>();
        appointments.forEach((apt: any) => {
          if (!apt.patients) return;
          const existing = patientMap.get(apt.patient_id);
          if (existing) {
            existing.appointment_count++;
          } else {
            patientMap.set(apt.patient_id, { ...apt.patients, appointment_count: 1, last_appointment: apt.appointment_date });
          }
        });
        setPatients(Array.from(patientMap.values()));
      }
      setLoading(false);
    };
    fetchData();
  }, [supabase, router]);

  const filteredPatients = patients.filter((p) => !search || p.full_name?.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search));

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
        <p className="text-sm text-gray-500 mt-1">View your patient history and details</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2" style={{ "--tw-ring-color": "#36d1cf" } as React.CSSProperties} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredPatients.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredPatients.map((patient) => (
              <div key={patient.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
                    <User className="w-6 h-6" style={{ color: "#36d1cf" }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{patient.full_name}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      {patient.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{patient.phone}</div>}
                      <div className="flex items-center gap-1"><Calendar className="w-3 h-3" />{patient.appointment_count} appointment{patient.appointment_count !== 1 ? "s" : ""}</div>
                    </div>
                  </div>
                  <button onClick={() => router.push(`/doctor/inbox?patient=${patient.id}`)} className="p-2 rounded-lg transition-colors" style={{ backgroundColor: "#e6faf9", color: "#36d1cf" }}>
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No patients found</p>
          </div>
        )}
      </div>
    </div>
  );
}
