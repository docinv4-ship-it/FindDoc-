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
      return NextResponse.json({ 
        error: "NO CREDENTIALS: User Email / ID missing." 
      }, { status: 400 });
    }

    // 🎯 Direct Fetch using patient_email OR patient_id with explicit FK hints
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
        clinics!clinic_id(id, name, address, city),
        doctors!doctor_id(id, full_name, specialization)
      `)
      .or(`patient_email.eq.${email},patient_id.eq.${userId}`)
      .order("appointment_date", { ascending: false });

    // ❌ Agar SQL/Relationship Error aaya toh SCREEN PAR SHOW KARO
    if (apptError) {
      return NextResponse.json({ 
        error: `SQL JOIN ERROR: ${apptError.message} | Hint: ${apptError.hint || "None"}` 
      }, { status: 400 });
    }

    // ❌ Agar Query chal gayi lekin data 0 aaya toh SCREEN PAR SHOW KARO
    if (!appointments || appointments.length === 0) {
      return NextResponse.json({ 
        error: `ZERO RECORDS: Database query ran successfully, but no appointment matched email (${email}) or userId (${userId}).` 
      }, { status: 400 });
    }

    return NextResponse.json({ appointments }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json({ 
      error: `SERVER EXCEPTION: ${e?.message || "Unknown error"}` 
    }, { status: 500 });
  }
}
