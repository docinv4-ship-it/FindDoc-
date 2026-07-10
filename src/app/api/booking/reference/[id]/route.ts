import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Generate unique booking reference ID
function generateBookingReference(appointmentId: string, createdAt: string): string {
  const timestamp = new Date(createdAt).getTime().toString(36).toUpperCase();
  const shortId = appointmentId.replace(/-/g, "").substring(0, 6).toUpperCase();
  return `DF-${timestamp}-${shortId}`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Appointment ID is required" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();

    const { data: appointment, error } = await supabase
      .from("appointments")
      .select("id, created_at")
      .eq("id", id)
      .single();

    if (error || !appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const referenceId = appointment.reference_id || generateBookingReference(appointment.id, appointment.created_at);

    // Update the appointment with the reference ID if not set
    if (!appointment.reference_id) {
      await supabase
        .from("appointments")
        .update({ reference_id: referenceId })
        .eq("id", appointment.id);
    }

    return NextResponse.json({ reference_id: referenceId });
  } catch {
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
