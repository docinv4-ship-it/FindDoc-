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

    // 🎯 Step 1: Pehle 'patients' table se patient ki real IDs nikalo (by user_id OR email)
    let patientQuery = supabase.from("patients").select("id");

    if (userId && email) {
      patientQuery = patientQuery.or(`user_id.eq.${userId},email.eq.${email}`);
    } else if (userId) {
      patientQuery = patientQuery.eq("user_id", userId);
    } else {
      patientQuery = patientQuery.eq("email", email);
    }

    const { data: patientRecords, error: patientError } = await patientQuery;

    if (patientError || !patientRecords || patientRecords.length === 0) {
      return NextResponse.json({ appointments: [] }, { status: 200 });
    }

    // Extract all matching patient IDs
    const patientIds = patientRecords.map((p: { id: string }) => p.id);

    // 🎯 Step 2: Ab 'appointments' table se patient_id ki base par appointments fetch karo
    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select(`
        id, 
        appointment_date, 
        start_time, 
        end_time, 
        status, 
        reason_for_visit,
        clinics(id, name, address, city),
        doctors(id, full_name, specialization)
      `)
      .in("patient_id", patientIds)
      .order("appointment_date", { ascending: false });

    if (apptError) {
      console.error("Error fetching appointments:", apptError);
      return NextResponse.json({ appointments: [] }, { status: 200 });
    }

    return NextResponse.json({ appointments: appointments || [] }, { status: 200 });

  } catch (e) {
    console.error("Booking Lookup Critical Error:", e);
    return NextResponse.json({ appointments: [] }, { status: 200 });
  }
}
