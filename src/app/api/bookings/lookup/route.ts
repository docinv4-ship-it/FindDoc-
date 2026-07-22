import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    
    // Fallback: searchParam -> auth session -> hardcoded test email
    const email = searchParams.get("email") || user?.email || "shopme924@gmail.com";
    const userId = searchParams.get("userId") || user?.id;

    // 🎯 QUERY: Query database directly
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

    // ❌ AGAR SQL JOIN MEIN ERROR AAYA TOH SCREEN PAR SHOW KARO
    if (apptError) {
      return NextResponse.json({ 
        error: `SQL QUERY ERROR: ${apptError.message} | Details: ${apptError.details || apptError.hint || "None"}` 
      }, { status: 400 });
    }

    // ❌ AGAR DATA 0 AAYA TOH REASON DHOONDO
    if (!appointments || appointments.length === 0) {
      return NextResponse.json({ 
        error: `ZERO MATCHES: Database search ran for Email (${email}) but returned 0 rows.` 
      }, { status: 400 });
    }

    return NextResponse.json({ appointments }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json({ 
      error: `SERVER EXCEPTION: ${e?.message || "Unknown error"}` 
    }, { status: 500 });
  }
}
