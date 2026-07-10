import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { doctor_id, patient_id, clinic_id } = body;

  if (!doctor_id || !patient_id) {
    return NextResponse.json({ error: "Doctor ID and Patient ID required" }, { status: 400 });
  }

  // Check if conversation exists
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("doctor_id", doctor_id)
    .eq("patient_id", patient_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ conversation: existing });
  }

  // Create new conversation
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      doctor_id,
      patient_id,
      clinic_id: clinic_id || null,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversation: data });
}
