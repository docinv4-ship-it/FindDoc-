import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email") || user?.email;
    const userId = searchParams.get("userId") || user?.id;

    if (!email && !userId) {
      return NextResponse.json({ appointments: [] }, { status: 200 });
    }

    // 🎯 EXACT FIX: Explicit foreign key constraint name (appointments_clinic_id_fkey)
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
        doctors(id, full_name, specialization)
      `)
      .or(`patient_email.eq.${email},patient_id.eq.${userId}`)
      .order("appointment_date", { ascending: false });

    if (apptError) {
      console.error("Appointments Lookup Error:", apptError);
      return NextResponse.json({ appointments: [] }, { status: 200 });
    }

    return NextResponse.json({ appointments: appointments || [] }, { status: 200 });

  } catch (e) {
    console.error("Critical API Error:", e);
    return NextResponse.json({ appointments: [] }, { status: 200 });
  }
}
