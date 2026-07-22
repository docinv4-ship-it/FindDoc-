import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email") || user?.email;
    const userId = searchParams.get("userId") || user?.id;

    // 🔍 TEST 1: Check Auth & Params
    if (!email && !userId) {
      return NextResponse.json({ 
        debugStage: "1. Missing Credentials", 
        authError, user, email, userId 
      }, { status: 400 });
    }

    // 🔍 TEST 2: Query Patients
    const { data: patientRecords, error: patientError } = await supabase
      .from("patients")
      .select("id")
      .or(`user_id.eq.${userId},email.eq.${email}`);

    if (patientError || !patientRecords || patientRecords.length === 0) {
      return NextResponse.json({ 
        debugStage: "2. Patient Lookup Failed", 
        patientError, patientRecords, searchedUserId: userId, searchedEmail: email 
      }, { status: 400 });
    }

    const patientIds = patientRecords.map((p: { id: string }) => p.id);

    // 🔍 TEST 3: Query Appointments with Join
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
        debugStage: "3. Appointments Query Error (Relationship/RLS Issue)", 
        apptError, patientIds 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      debugStage: "SUCCESS", 
      appointmentsCount: appointments?.length, 
      appointments 
    }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json({ 
      debugStage: "CRITICAL CATCH", 
      errorMessage: e?.message 
    }, { status: 500 });
  }
}
