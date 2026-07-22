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

    // 🎯 STAGE 1: Check Auth Credentials
    if (!email && !userId) {
      return NextResponse.json({ 
        error: "STAGE 1 FAIL: Session or Email/UserId parameter missing." 
      }, { status: 400 });
    }

    // 🎯 STAGE 2: Patients Table Check
    const { data: patientRecords, error: patientError } = await supabase
      .from("patients")
      .select("id")
      .or(`user_id.eq.${userId},email.eq.${email}`);

    if (patientError) {
      return NextResponse.json({ 
        error: `STAGE 2 SQL FAIL: ${patientError.message}` 
      }, { status: 400 });
    }

    if (!patientRecords || patientRecords.length === 0) {
      return NextResponse.json({ 
        error: `STAGE 2 DATA FAIL: Patient profile not found for Email (${email}) / UserId (${userId})` 
      }, { status: 400 });
    }

    const patientIds = patientRecords.map((p: { id: string }) => p.id);

    // 🎯 STAGE 3: Appointments Query & Foreign Key Join Check
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
      return NextResponse.json({ 
        error: `STAGE 3 SQL FAIL: ${apptError.message} | Details: ${apptError.details || apptError.hint || "None"}` 
      }, { status: 400 });
    }

    return NextResponse.json({ appointments: appointments || [] }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json({ 
      error: `CRITICAL CATCH: ${e?.message || "Unknown Server Error"}` 
    }, { status: 500 });
  }
}
