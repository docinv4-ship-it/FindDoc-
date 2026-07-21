import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Regex to validate Postgres UUID format
const IS_VALID_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Get Authenticated User Session (If logged in)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const queryPhone = searchParams.get("phone")?.trim();
    const verificationId = searchParams.get("verification_id")?.trim();
    const queryEmail = searchParams.get("email")?.trim() || user?.email?.trim();
    const queryUserId = searchParams.get("userId")?.trim() || user?.id?.trim();

    const rawPatientIds = new Set<string>();
    const rawPatientEmails = new Set<string>();

    // =============================================================
    // RESOLVE PATIENT IDENTITIES
    // =============================================================

    if (user) {
      if (user.id && IS_VALID_UUID.test(user.id)) rawPatientIds.add(user.id);
      if (user.email) rawPatientEmails.add(user.email);

      // Check linked patient profile in `patients` table safely
      try {
        const { data: patientRecord } = await supabase
          .from("patients")
          .select("id")
          .or(`user_id.eq.${user.id},email.eq.${user.email || ""}`)
          .maybeSingle();

        if (patientRecord?.id && IS_VALID_UUID.test(patientRecord.id)) {
          rawPatientIds.add(patientRecord.id);
        }
      } catch {
        // Non-blocking catch if patients table schema varies
      }
    } else if (queryPhone && verificationId) {
      // Guest Lookup Flow via OTP
      const { data: verification } = await supabase
        .from("otp_verifications")
        .select("id")
        .eq("id", verificationId)
        .eq("phone", queryPhone)
        .eq("purpose", "lookup")
        .eq("verified", true)
        .maybeSingle();

      if (!verification) {
        return NextResponse.json(
          { error: "Invalid or unverified lookup request" },
          { status: 403 }
        );
      }

      const { data: patient } = await supabase
        .from("patients")
        .select("id")
        .eq("phone", queryPhone)
        .maybeSingle();

      if (!patient) {
        return NextResponse.json({ appointments: [] }, { status: 200 });
      }

      if (IS_VALID_UUID.test(patient.id)) {
        rawPatientIds.add(patient.id);
      }
    } else if (queryUserId || queryEmail) {
      if (queryUserId && IS_VALID_UUID.test(queryUserId)) rawPatientIds.add(queryUserId);
      if (queryEmail) rawPatientEmails.add(queryEmail);
    }

    const patientIds = Array.from(rawPatientIds);
    const patientEmails = Array.from(rawPatientEmails);

    if (patientIds.length === 0 && patientEmails.length === 0) {
      return NextResponse.json({ appointments: [] }, { status: 200 });
    }

    // Dynamic Filter Construction
    const filterConditions: string[] = [];
    patientIds.forEach((id) => filterConditions.push(`patient_id.eq.${id}`));
    patientEmails.forEach((email) => filterConditions.push(`patient_email.eq.${email}`));

    // =============================================================
    // PRIMARY QUERY: Relational Fetch (Clinics + Doctors)
    // =============================================================
    let primaryQuery = supabase
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

    if (filterConditions.length > 0) {
      primaryQuery = primaryQuery.or(filterConditions.join(","));
    }

    const { data: appointments, error: primaryError } = await primaryQuery
      .order("appointment_date", { ascending: false });

    // If Primary Query works cleanly, return results immediately
    if (!primaryError && appointments) {
      return NextResponse.json({ appointments }, { status: 200 });
    }

    // =============================================================
    // SECONDARY FALLBACK: Resilient Flat Fetch (If FK Joins Fail)
    // =============================================================
    console.warn("Primary relational query failed, executing resilient fallback:", primaryError?.message);

    let fallbackQuery = supabase
      .from("appointments")
      .select("*");

    if (filterConditions.length > 0) {
      fallbackQuery = fallbackQuery.or(filterConditions.join(","));
    }

    const { data: flatAppointments, error: fallbackError } = await fallbackQuery
      .order("appointment_date", { ascending: false });

    if (fallbackError) {
      console.error("Critical DB Query Failure:", fallbackError);
      return NextResponse.json(
        { 
          error: "Database Fetch Error", 
          details: fallbackError.message || primaryError?.message || "Unknown error" 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ appointments: flatAppointments || [] }, { status: 200 });

  } catch (error: any) {
    console.error("Bookings lookup unexpected error:", error);
    return NextResponse.json(
      { error: "Unexpected Server Error", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
