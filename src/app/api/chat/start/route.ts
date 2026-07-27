import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    const body = await request.json();
    const { doctor_id, clinic_id, patient_name, patient_email, patient_user_id, appointment_id } = body;

    if (!doctor_id || !clinic_id || !patient_name?.trim()) {
      return NextResponse.json({ error: "Required fields missing." }, { status: 400 });
    }

    const effectiveEmail = authUser?.email || patient_email?.trim() || null;
    const effectiveUserId = authUser?.id || patient_user_id || null;

    let patientId: string | null = null;
    if (effectiveUserId) {
      const { data: p } = await supabase.from("patients").select("id").eq("id", effectiveUserId).maybeSingle();
      if (p) patientId = p.id;
    }

    if (!patientId && effectiveEmail) {
      const { data: exist } = await supabase.from("patients").select("id").eq("email", effectiveEmail).maybeSingle();
      if (exist) patientId = exist.id;
      else {
        const { data: newP, error: errP } = await supabase.from("patients").insert({
          full_name: patient_name.trim(), email: effectiveEmail, phone: "N/A", is_guest: !authUser
        }).select("id").single();
        if (errP) return NextResponse.json({ error: errP.message }, { status: 500 });
        patientId = newP.id;
      }
    }

    if (!patientId) return NextResponse.json({ error: "Auth required." }, { status: 401 });

    const { data: existingConvo } = await supabase.from("conversations")
      .select("id, status").eq("clinic_id", clinic_id).eq("doctor_id", doctor_id).eq("patient_id", patientId).maybeSingle();

    if (existingConvo) {
      // If we are coming from a new confirmed appointment, we might optionally want to send an auto-message here.
      return NextResponse.json({ conversation_id: existingConvo.id, patient_id: patientId, status: existingConvo.status, existing: true });
    }

    // CREATE NEW SYSTEM THREAD
    const { data: convo, error: convoErr } = await supabase.from("conversations").insert({
      clinic_id, doctor_id, patient_id: patientId, patient_name: patient_name.trim(), patient_email: effectiveEmail,
      status: "active", last_message_at: new Date().toISOString(), last_message_preview: "Appointment confirmed session started."
    }).select("id").single();

    if (convoErr || !convo) return NextResponse.json({ error: "Failed to create session." }, { status: 500 });

    return NextResponse.json({ conversation_id: convo.id, patient_id: patientId, existing: false });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
