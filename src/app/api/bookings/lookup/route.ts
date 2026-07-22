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

    // 🎯 Step 1: Patients table se matching patient records nikalo
    const { data: patientRecords, error: patientError } = await supabase
      .from("patients")
      .select("id")
      .or(`user_id.eq.${userId},email.eq.${email}`);

    if (patientError || !patientRecords || patientRecords.length === 0) {
      return NextResponse.json({ appointments: [] }, { status: 200 });
    }

    const patientIds = patientRecords.map((p: { id: string }) => p.id);

    // 🎯 Step 2: Fetch appointments with EXPLICIT foreign key (clinics!clinic_id)
    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select(`
        id, 
        appointment_date, 
        start_time, 
        end_time, 
        status, 
        reason_for_visit,
        clinics!clinic_id(id, name, address, city),
        doctors!doctor_id(id, full_name, specialization)
      `)
      .in("patient_id", patientIds)
      .order("appointment_date", { ascending: false });

    if (apptError) {
      console.error("Appointments Query Error:", apptError);
      return NextResponse.json({ appointments: [] }, { status: 200 });
    }

    return NextResponse.json({ appointments: appointments || [] }, { status: 200 });

  } catch (e) {
    console.error("Critical API Error:", e);
    return NextResponse.json({ appointments: [] }, { status: 200 });
  }
}
