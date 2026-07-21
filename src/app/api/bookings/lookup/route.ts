import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Check for Active Supabase Auth Session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const queryPhone = searchParams.get("phone");
    const verificationId = searchParams.get("verification_id");
    const queryEmail = searchParams.get("email");
    const queryUserId = searchParams.get("userId");

    const patientIds: string[] = [];
    const patientEmails: string[] = [];

    // =============================================================
    // MODE A: Authenticated Session (Logged-in Patient)
    // =============================================================
    if (user) {
      patientIds.push(user.id);
      if (user.email) patientEmails.push(user.email);

      // Check if patient profile exists in `patients` table
      const { data: patientRecord } = await supabase
        .from("patients")
        .select("id")
        .or(`user_id.eq.${user.id},email.eq.${user.email || ""}`)
        .maybeSingle();

      if (patientRecord?.id) {
        patientIds.push(patientRecord.id);
      }
    } 
    // =============================================================
    // MODE B: Guest Lookup (OTP Phone + Verification ID)
    // =============================================================
    else if (queryPhone && verificationId) {
      const { data: verification, error: verifyError } = await supabase
        .from("otp_verifications")
        .select("id")
        .eq("id", verificationId)
        .eq("phone", queryPhone)
        .eq("purpose", "lookup")
        .eq("verified", true)
        .single();

      if (verifyError || !verification) {
        return NextResponse.json(
          { error: "Invalid or unverified lookup request" },
          { status: 403 }
        );
      }

      // Fetch linked patient ID for this phone
      const { data: patient } = await supabase
        .from("patients")
        .select("id")
        .eq("phone", queryPhone)
        .maybeSingle();

      if (!patient) {
        return NextResponse.json({ appointments: [] }, { status: 200 });
      }

      patientIds.push(patient.id);
    } 
    // =============================================================
    // MODE C: Direct Query Fallback (Email or UserID params)
    // =============================================================
    else if (queryUserId || queryEmail) {
      if (queryUserId) patientIds.push(queryUserId);
      if (queryEmail) patientEmails.push(queryEmail);
    } 
    // =============================================================
    // MODE D: Unauthenticated & Missing Parameters
    // =============================================================
    else {
      return NextResponse.json(
        { error: "Authentication or OTP verification parameters required" },
        { status: 400 }
      );
    }

    // Build Appointments Query
    let query = supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        start_time,
        end_time,
        status,
        reason_for_visit,
        clinics (id, name, address, city),
        doctors (id, full_name, specialization)
      `);

    // Dynamic Filter Construction
    const filterConditions: string[] = [];
    
    if (patientIds.length > 0) {
      patientIds.forEach((id) => filterConditions.push(`patient_id.eq.${id}`));
    }
    if (patientEmails.length > 0) {
      patientEmails.forEach((email) => filterConditions.push(`patient_email.eq.${email}`));
    }

    if (filterConditions.length > 0) {
      query = query.or(filterConditions.join(","));
    }

    const { data: appointments, error: aptError } = await query
      .order("appointment_date", { ascending: false })
      .order("start_time", { ascending: true });

    if (aptError) {
      console.error("Error fetching appointments:", aptError);
      return NextResponse.json(
        { error: "Failed to fetch appointments" },
        { status: 500 }
      );
    }

    return NextResponse.json({ appointments: appointments || [] }, { status: 200 });

  } catch (error) {
    console.error("Bookings lookup error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
