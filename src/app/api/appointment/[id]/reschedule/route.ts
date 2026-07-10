import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { phone, otp_code, new_appointment_date, new_start_time, new_end_time } = body;

    if (!phone || !otp_code || !new_appointment_date || !new_start_time || !new_end_time) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();

    const { data: verification, error: verifyError } = await supabase.from("otp_verifications").select("*").eq("phone", phone).eq("otp_code", otp_code).eq("purpose", "reschedule").eq("verified", true).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1).single();

    if (verifyError || !verification) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    const { data: patient } = await supabase.from("patients").select("id").eq("phone", phone).single();
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const { data: appointment, error: aptError } = await supabase.from("appointments").select("*, clinics (id, doctor_id, booking_mode)").eq("id", id).eq("patient_id", patient.id).single();
    if (aptError || !appointment) return NextResponse.json({ error: "Appointment not found or access denied" }, { status: 404 });

    if (!["pending", "confirmed"].includes(appointment.status)) {
      return NextResponse.json({ error: "Only pending or confirmed appointments can be rescheduled" }, { status: 400 });
    }

    const { data: existingSlot } = await supabase.from("appointments").select("id").eq("clinic_id", appointment.clinic_id).eq("appointment_date", new_appointment_date).eq("start_time", new_start_time).in("status", ["pending", "confirmed"]).maybeSingle();

    if (existingSlot) {
      return NextResponse.json({ error: "This slot is no longer available. Please choose another time." }, { status: 409 });
    }

    const newStatus = appointment.clinics?.booking_mode === "auto" ? "confirmed" : "pending";

    const oldData = { appointment_date: appointment.appointment_date, start_time: appointment.start_time, end_time: appointment.end_time };

    const { error: updateError } = await supabase.from("appointments").update({
      appointment_date: new_appointment_date,
      start_time: new_start_time,
      end_time: new_end_time,
      status: newStatus,
      rescheduled_from: oldData,
      rescheduled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq("id", id);

    if (updateError) {
      if (updateError.code === "23505") {
        return NextResponse.json({ error: "This slot was just booked by another patient. Please select a different time." }, { status: 409 });
      }
      console.error("Error rescheduling appointment:", updateError);
      return NextResponse.json({ error: "Failed to reschedule appointment" }, { status: 500 });
    }

    if (appointment.clinics?.doctor_id) {
      await supabase.from("notifications").insert({
        user_id: appointment.clinics.doctor_id,
        user_type: "doctor",
        type: newStatus === "confirmed" ? "appointment_confirmed" : "appointment_pending",
        title: "Appointment Rescheduled",
        body: `An appointment has been rescheduled to ${new_appointment_date} at ${new_start_time}.`,
        data: { appointment_id: id },
      });
    }

    return NextResponse.json({ success: true, appointment_id: id, new_status: newStatus });
  } catch (error) {
    console.error("Reschedule appointment error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
