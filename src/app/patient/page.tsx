"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Calendar, Loader2 } from "lucide-react";

export default function PatientDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    const getData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);

      // Fetch upcoming appointments real data
      const { data: appData } = await supabase
        .from("appointments")
        .select(`id, date, start_time, status, clinics (name), doctors (full_name)`)
        .eq("patient_id", session.user.id)
        .order("date", { ascending: true })
        .limit(3);

      if (appData) setAppointments(appData);
      setLoading(false);
    };
    getData();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
      </div>
    );
  }

  // Extract first appointment for the Hero Card
  const nextApp = appointments.length > 0 ? appointments[0] : null;
  let doctorName = "Doctor";
  let clinicName = "Clinic";
  
  if (nextApp) {
    const doctor = Array.isArray(nextApp.doctors) ? nextApp.doctors[0] : nextApp.doctors;
    const clinic = Array.isArray(nextApp.clinics) ? nextApp.clinics[0] : nextApp.clinics;
    doctorName = doctor?.full_name || "Doctor";
    clinicName = clinic?.name || "Clinic";
  }

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 pb-24 font-sans selection:bg-cyan-100">
      
      {/* Hero Greeting (Real User Data) */}
      <div className="px-5 pt-6 pb-4">
        <div className="text-[13px] text-slate-500 font-medium">Good morning 👋</div>
        <div className="text-[22px] font-bold mt-0.5 tracking-tight">
          {user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Patient"}
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-5 mb-5">
        <div className="bg-white border border-slate-200 h-[52px] rounded-2xl flex items-center px-4 shadow-sm focus-within:border-cyan-500 focus-within:ring-[3px] focus-within:ring-cyan-500/10 transition-all">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input 
            type="text" 
            placeholder="Search doctors, specialties, clinics..." 
            className="w-full bg-transparent outline-none ml-3 text-[14px] text-slate-900 placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="px-5 flex flex-col gap-5">
        
        {/* Upcoming Appointment Highlight (Real Data Connected) */}
        {nextApp ? (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[20px] p-5 border-none shadow-md">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-[15px] tracking-tight text-white">Upcoming Consultation</span>
              <span className="bg-white/10 text-cyan-300 text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize">
                {nextApp.status}
              </span>
            </div>
            
            <div className="flex items-center gap-3.5 mt-2">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-[22px]">
                👨‍⚕️
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-white">{doctorName}</h4>
                <p className="text-[13px] text-slate-400 mt-0.5">{clinicName}</p>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-white/10 flex justify-between items-center">
              <div className="text-[12px] text-slate-300 flex items-center gap-1.5 font-medium">
                <Calendar className="w-[14px] h-[14px]" />
                {nextApp.date} • {nextApp.start_time}
              </div>
              <Link href="/patient/appointments" className="bg-white text-slate-900 px-4 py-2 rounded-xl text-[13px] font-semibold hover:bg-slate-100 transition-colors">
                View Details
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[20px] p-6 border border-slate-200 shadow-sm text-center">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-[14px] font-medium text-slate-500">No upcoming bookings</p>
            <Link href="/patient/search" className="mt-3 inline-block bg-cyan-500 text-white px-5 py-2 rounded-xl text-[13px] font-semibold shadow-sm hover:bg-cyan-600 transition-colors">
              Find a Doctor
            </Link>
          </div>
        )}

        {/* Quick Categories */}
        <div className="bg-white rounded-[20px] p-5 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-[16px] tracking-tight">Categories</span>
            <Link href="/patient/search" className="text-[13px] text-cyan-500 font-semibold hover:underline">See All</Link>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: '🫀', label: 'Cardio' },
              { icon: '🦷', label: 'Dental' },
              { icon: '👁️', label: 'Vision' },
              { icon: '🧠', label: 'Neuro' },
              { icon: '🦴', label: 'Ortho' },
              { icon: '👶', label: 'Pedia' },
              { icon: '🩺', label: 'General' },
              { icon: '⚡', label: 'More' },
            ].map((cat, i) => (
              <Link key={i} href="/patient/search" className="flex flex-col items-center group">
                <div className="w-[54px] h-[54px] rounded-[14px] bg-slate-50 border border-slate-200 flex items-center justify-center text-[22px] transition-all group-hover:bg-cyan-50 group-hover:border-cyan-200 group-hover:-translate-y-0.5">
                  {cat.icon}
                </div>
                <span className="mt-2 text-[12px] font-medium text-slate-800">{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Top Rated Doctors (Horizontal Scroll) */}
        <div>
          <div className="flex justify-between items-center mb-3 px-1">
            <span className="font-bold text-[16px] tracking-tight">Top Rated Doctors</span>
            <Link href="/patient/search" className="text-[13px] text-cyan-500 font-semibold hover:underline">View All</Link>
          </div>

          {/* Hiding scrollbar via Tailwind utility classes */}
          <div className="flex gap-3.5 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {[
              { icon: '👨‍⚕️', name: 'Dr. Ali Raza', spec: 'Cardiologist', rating: '4.9 (120)' },
              { icon: '👩‍⚕️', name: 'Dr. Sarah', spec: 'Dentist', rating: '4.8 (95)' },
              { icon: '👨‍⚕️', name: 'Dr. Hamza', spec: 'Ophthalmologist', rating: '5.0 (210)' },
            ].map((doc, i) => (
              <div key={i} className="min-w-[160px] bg-white border border-slate-200 rounded-[20px] p-4 text-center shadow-sm">
                <div className="w-[60px] h-[60px] rounded-full bg-cyan-50 mx-auto mb-3 flex items-center justify-center text-[26px]">
                  {doc.icon}
                </div>
                <h4 className="text-[14px] font-semibold text-slate-900">{doc.name}</h4>
                <p className="text-[12px] text-slate-500 mt-0.5 mb-2">{doc.spec}</p>
                <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold px-2 py-0.5 rounded-md mb-3">
                  ★ {doc.rating}
                </div>
                <Link href="/patient/search" className="block w-full bg-cyan-500 hover:bg-cyan-600 text-white py-2 rounded-[10px] text-[12px] font-semibold transition-colors">
                  Book Visit
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Nearby Clinics */}
        <div className="bg-white rounded-[20px] p-5 border border-slate-200 shadow-sm">
          <div className="mb-4">
            <span className="font-bold text-[16px] tracking-tight">Nearby Medical Centers</span>
          </div>
          <div className="flex flex-col">
            {[
              { name: 'City Medical Center', details: '📍 2.3 km • Open 24/7', rating: '4.8' },
              { name: 'Life Care Hospital', details: '📍 3.8 km • Emergency Available', rating: '4.9' },
            ].map((clinic, i) => (
              <div key={i} className={`flex justify-between items-center py-3 ${i === 0 ? 'border-b border-slate-100' : ''}`}>
                <div>
                  <div className="text-[14px] font-semibold text-slate-900">{clinic.name}</div>
                  <div className="text-[12px] text-slate-500 mt-1">{clinic.details}</div>
                </div>
                <div className="text-[12px] font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded-md">★ {clinic.rating}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Health Tips */}
        <div className="bg-white rounded-[20px] p-5 border border-slate-200 shadow-sm mb-6">
          <div className="mb-4">
            <span className="font-bold text-[16px] tracking-tight">Daily Health Tips</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {[
              { icon: '💧', text: 'Hydration target: Drink at least 2.5L water today for active focus.' },
              { icon: '🚶', text: 'Walk 30 minutes to reduce cardiovascular risks by 19%.' },
            ].map((tip, i) => (
              <div key={i} className="flex gap-3 items-start p-3 bg-slate-50 rounded-[14px] border border-slate-100">
                <span className="text-[18px]">{tip.icon}</span>
                <div className="text-[13px] text-slate-700 leading-snug">{tip.text}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
