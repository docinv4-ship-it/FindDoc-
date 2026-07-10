import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, cancellation_reason } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: doctorData, error: doctorError } = await supabase.from("doctors").select("id").eq("user_id", user.id).single();
    if (doctorError || !doctorData) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

    const { data: appointment, error: aptError } = await supabase.from("appointments").select("id, status, clinic_id").eq("id", id).single();
    if (aptError || !appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    const { data: clinic, error: clinicError } = await supabase.from("clinics").select("doctor_id").eq("id", appointment.clinic_id).single();
    if (clinicError || !clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    if (clinic.doctor_id !== doctorData.id) return NextResponse.json({ error: "You don't have permission to modify this appointment" }, { status: 403 });

    const validActions = ["confirm", "reject", "complete", "cancel", "no_show"];
    if (!validActions.includes(action)) return NextResponse.json({ error: "Invalid action. Use: confirm, reject, complete, cancel, or no_show" }, { status: 400 });

    const currentStatus = appointment.status;
    let newStatus: string;
    let updateData: Record<string, unknown> = {};

    switch (action) {
      case "confirm":
        if (currentStatus !== "pending") return NextResponse.json({ error: "Only pending appointments can be confirmed" }, { status: 400 });
        newStatus = "confirmed";
        break;
      case "reject":
        if (currentStatus !== "pending") return NextResponse.json({ error: "Only pending appointments can be rejected" }, { status: 400 });
        newStatus = "cancelled";
        updateData = { cancellation_reason: cancellation_reason || "Rejected by doctor", cancelled_by: "doctor", cancelled_at: new Date().toISOString() };
        break;
      case "complete":
        if (currentStatus !== "confirmed") return NextResponse.json({ error: "Only confirmed appointments can be marked as completed" }, { status: 400 });
        newStatus = "completed";
        updateData = { completed_at: new Date().toISOString() };
        break;
      case "no_show":
        if (!["pending", "confirmed"].includes(currentStatus)) return NextResponse.json({ error: "Only pending or confirmed appointments can be marked as no-show" }, { status: 400 });
        newStatus = "no_show";
        updateData = { no_show_marked_at: new Date().toISOString(), no_show_marked_by: "doctor" };
        break;
      case "cancel":
        if (!["pending", "confirmed"].includes(currentStatus)) return NextResponse.json({ error: "Only pending or confirmed appointments can be cancelled" }, { status: 400 });
        if (!cancellation_reason?.trim()) return NextResponse.json({ error: "Cancellation reason is required" }, { status: 400 });
        newStatus = "cancelled";
        updateData = { cancellation_reason: cancellation_reason.trim(), cancelled_by: "doctor", cancelled_at: new Date().toISOString() };
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { error: updateError } = await supabase.from("appointments").update({ status: newStatus, ...updateData, updated_at: new Date().toISOString() }).eq("id", id);
    if (updateError) { console.error("Error updating appointment:", updateError); return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 }); }

    // Log to audit
    if (action === "cancel" || action === "no_show") {
      await supabase.from("audit_logs").insert({
        action: `appointment_${action}`, entity_type: "appointment", entity_id: id,
        before_data: { status: currentStatus }, after_data: { status: newStatus, ...updateData },
      });
    }

    const msg = action === "no_show" ? "Appointment marked as no-show" : `Appointment ${action}${action === "cancel" ? "l" : ""}ed successfully`;
    return NextResponse.json({ success: true, appointment_id: id, new_status: newStatus, message: msg });
  } catch (error) {
    console.error("Appointment action error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: appointment, error } = await supabase.from("appointments").select("*, patients (*), doctors (*), clinics (*)").eq("id", id).single();
    if (error || !appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    return NextResponse.json({ appointment });
  } catch {
    return NextResponse.json({ error: "Failed to fetch appointment" }, { status: 500 });
  }
}
