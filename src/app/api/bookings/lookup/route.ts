import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const verificationId = searchParams.get("verification_id");
    if (!phone || !verificationId) return NextResponse.json({ error: "Phone and verification_id are required" }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();

    const { data: verification, error: verifyError } = await supabase.from("otp_verifications").select("*").eq("id", verificationId).eq("phone", phone).eq("purpose", "lookup").eq("verified", true).single();
    if (verifyError || !verification) return NextResponse.json({ error: "Invalid or unverified request" }, { status: 403 });

    const { data: patient, error: patientError } = await supabase.from("patients").select("id").eq("phone", phone).maybeSingle();
    if (patientError || !patient) return NextResponse.json({ appointments: [] }, { status: 200 });

    const { data: appointments, error: aptError } = await supabase.from("appointments").select(`id, appointment_date, start_time, end_time, status, reason_for_visit, clinics (id, name, address, city), doctors (id, full_name, specialization)`).eq("patient_id", patient.id).order("appointment_date", { ascending: false }).order("start_time", { ascending: true });
    if (aptError) { console.error("Error fetching appointments:", aptError); return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 }); }

    return NextResponse.json({ appointments: appointments || [] });
  } catch (error) {
    console.error("Bookings lookup error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
