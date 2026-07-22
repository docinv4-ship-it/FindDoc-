import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    
    const email = searchParams.get("email") || user?.email || "shopme924@gmail.com";
    const userId = searchParams.get("userId") || user?.id;

    // 🎯 EXACT FIX: doctors!doctor_id explicit relationship hint
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

    // Fallback in case constraint name is required instead of column name
    if (apptError) {
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
        return NextResponse.json({ 
          error: `SQL QUERY ERROR: ${apptError.message}` 
        }, { status: 400 });
      }

      return NextResponse.json({ appointments: fallbackAppts }, { status: 200 });
    }

    return NextResponse.json({ appointments: appointments || [] }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json({ 
      error: `SERVER EXCEPTION: ${e?.message || "Unknown error"}` 
    }, { status: 500 });
  }
}
