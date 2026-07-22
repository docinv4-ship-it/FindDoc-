import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    
    // 1. Target Email / UserId resolution
    const email = searchParams.get("email") || user?.email;
    const userId = searchParams.get("userId") || user?.id;

    // Agar na email mil sake na userId, toh empty return karein
    if (!email && !userId) {
      return NextResponse.json({ appointments: [] }, { status: 200 });
    }

    // 2. Primary Query (Constraint: doctor_id)
    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select(`
        id, 
        appointment_date, 
        start_time, 
        end_time, 
        status, 
        reason_for_visit,
        patient_email,
        clinics!appointments_clinic_id_fkey(id, name, address, city),
        doctors!doctor_id(id, full_name, specialization)
      `)
      .or(`patient_email.eq.${email},patient_id.eq.${userId}`)
      .order("appointment_date", { ascending: false });

    // 3. Fail-safe Fallback (Constraint Name: appointments_doctor_id_fkey)
    if (apptError) {
      console.warn("Primary join failed, attempting fallback constraint name...", apptError.message);
      
      const { data: fallbackAppts, error: fallbackError } = await supabase
        .from("appointments")
        .select(`
          id, 
          appointment_date, 
          start_time, 
          end_time, 
          status, 
          reason_for_visit,
          patient_email,
          clinics!appointments_clinic_id_fkey(id, name, address, city),
          doctors!appointments_doctor_id_fkey(id, full_name, specialization)
        `)
        .or(`patient_email.eq.${email},patient_id.eq.${userId}`)
        .order("appointment_date", { ascending: false });

      if (fallbackError) {
        console.error("Fallback join also failed:", fallbackError.message);
        return NextResponse.json({ appointments: [] }, { status: 200 });
      }

      return NextResponse.json({ appointments: fallbackAppts || [] }, { status: 200 });
    }

    return NextResponse.json({ appointments: appointments || [] }, { status: 200 });

  } catch (e) {
    console.error("Critical Lookup API Error:", e);
    return NextResponse.json({ appointments: [] }, { status: 200 });
  }
}
