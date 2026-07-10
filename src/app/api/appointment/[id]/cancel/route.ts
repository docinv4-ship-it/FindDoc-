import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { phone, otp_code, cancellation_reason } = body;

    if (!phone || !otp_code) {
      return NextResponse.json({ error: "Phone and OTP code are required" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();

    const { data: verification, error: verifyError } = await supabase.from("otp_verifications").select("*").eq("phone", phone).eq("otp_code", otp_code).eq("purpose", "cancel").eq("verified", true).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1).single();

    if (verifyError || !verification) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    const { data: patient } = await supabase.from("patients").select("id").eq("phone", phone).single();
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const { data: appointment, error: aptError } = await supabase.from("appointments").select("*, clinics (doctor_id)").eq("id", id).eq("patient_id", patient.id).single();
    if (aptError || !appointment) return NextResponse.json({ error: "Appointment not found or access denied" }, { status: 404 });

    if (!["pending", "confirmed"].includes(appointment.status)) {
      return NextResponse.json({ error: "Only pending or confirmed appointments can be cancelled" }, { status: 400 });
    }

    // Cancellation window: prevent cancellation within 2 hours of appointment
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilAppointment < 2 && hoursUntilAppointment > 0) {
      return NextResponse.json({ error: "Appointments cannot be cancelled within 2 hours of the scheduled time. Please contact the clinic directly." }, { status: 400 });
    }

    const { error: updateError } = await supabase.from("appointments").update({
      status: "cancelled",
      cancellation_reason: cancellation_reason || "Cancelled by patient",
      cancelled_by: "patient",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq("id", id);

    if (updateError) {
      console.error("Error cancelling appointment:", updateError);
      return NextResponse.json({ error: "Failed to cancel appointment" }, { status: 500 });
    }

    if (appointment.clinics?.doctor_id) {
      await supabase.from("notifications").insert({
        user_id: appointment.clinics.doctor_id,
        user_type: "doctor",
        type: "appointment_cancelled",
        title: "Appointment Cancelled",
        body: `An appointment on ${appointment.appointment_date} at ${appointment.start_time} has been cancelled by the patient.`,
        data: { appointment_id: id },
      });
    }

    return NextResponse.json({ success: true, appointment_id: id });
  } catch (error) {
    console.error("Cancel appointment error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
