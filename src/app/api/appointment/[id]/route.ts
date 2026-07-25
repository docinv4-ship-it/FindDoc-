import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    // 1. Strict Security Check
    if (authError || !session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const appointmentId = params.id;
    if (!appointmentId) {
      return NextResponse.json({ error: "Appointment ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const { action, status, notes } = body;

    // 2. Fetch existing appointment details securely
    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("id, status, patient_id, clinic_id, doctor_id")
      .eq("id", appointmentId)
      .single();

    if (fetchError || !appointment) {
      return NextResponse.json({ error: "Appointment not found or invalid ID" }, { status: 404 });
    }

    // Determine the new status
    const newStatus = action === "confirm" ? "confirmed" : status;

    // 3. Update the Appointment Status
    const { error: updateError } = await supabase
      .from("appointments")
      .update({ 
        status: newStatus,
        ...(notes && { doctor_notes: notes }),
        updated_at: new Date().toISOString() 
      })
      .eq("id", appointmentId);

    if (updateError) {
      console.error("[APPOINTMENT_UPDATE_ERROR]", updateError);
      return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
    }

    // =========================================================================
    // 4. BIG FIX: CHAT (CONVERSATION) CREATION & PUSH NOTIFICATIONS
    // =========================================================================
    if (action === "confirm" || newStatus === "confirmed") {
      
      // A. Chat Unlock Logic: Check if conversation already exists to avoid duplicates
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("appointment_id", appointmentId)
        .single();

      if (!existingConv) {
        const { error: convError } = await supabase
          .from("conversations")
          .insert({
            appointment_id: appointmentId,
            patient_id: appointment.patient_id,
            doctor_id: appointment.doctor_id,
            status: "active",
            created_at: new Date().toISOString()
          });

        if (convError) {
          console.error("[CONVERSATION_CREATE_CRITICAL_ERROR]", convError);
          // System won't crash, but it logs for debugging
        }
      }

      // B. Push Notification Trigger Logic
      // Ye insert trigger karega aapke webhook ko ya real-time listener ko
      const { error: notifyError } = await supabase
        .from("notifications")
        .insert({
          user_id: appointment.patient_id,
          title: "Appointment Confirmed! 🎉",
          body: "Your doctor has confirmed the appointment. The chat is now unlocked.",
          type: "appointment_confirmed",
          reference_id: appointmentId,
          is_read: false,
          created_at: new Date().toISOString()
        });

      if (notifyError) console.error("[NOTIFICATION_CREATE_ERROR]", notifyError);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Appointment updated and systems synced." 
    }, { status: 200 });

  } catch (error: any) {
    console.error("[APPOINTMENT_PATCH_FATAL]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
