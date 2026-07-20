import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface StartChatPayload {
  doctor_id: string;
  clinic_id: string;
  patient_name: string;
  patient_email?: string;
  patient_user_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate Request via Supabase Auth Session (Security Layer)
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const body: StartChatPayload = await request.json();
    const { doctor_id, clinic_id, patient_name, patient_email, patient_user_id } = body;

    // 2. Strict Payload Sanity Check (No Mandatory Phone Number)
    if (!doctor_id || !clinic_id || !patient_name?.trim()) {
      return NextResponse.json(
        { error: "Doctor ID, Clinic ID, and Patient Name are required." },
        { status: 400 }
      );
    }

    const effectiveEmail = authUser?.email || patient_email?.trim() || null;
    const effectiveUserId = authUser?.id || patient_user_id || null;

    // 3. Verify Doctor & Clinic Ownership Alignment
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id, doctor_id")
      .eq("id", clinic_id)
      .eq("doctor_id", doctor_id)
      .maybeSingle();

    if (clinicError || !clinic) {
      return NextResponse.json(
        { error: "Invalid doctor or clinic location specified." },
        { status: 404 }
      );
    }

    // 4. Resolve Patient Identity (Atomic Lookup / Safe Fallback)
    let patientId: string | null = effectiveUserId;

    if (effectiveEmail) {
      const { data: existingPatient } = await supabase
        .from("patients")
        .select("id")
        .eq("email", effectiveEmail)
        .maybeSingle();

      if (existingPatient) {
        patientId = existingPatient.id;
      } else {
        const { data: newPatient, error: createPatientError } = await supabase
          .from("patients")
          .insert({
            ...(effectiveUserId ? { id: effectiveUserId } : {}),
            full_name: patient_name.trim(),
            email: effectiveEmail,
            is_guest: !authUser,
          })
          .select("id")
          .single();

        if (createPatientError) {
          console.error("[Chat API] Patient creation failed:", createPatientError);
          return NextResponse.json(
            { error: "Unable to resolve patient account. Please try again." },
            { status: 500 }
          );
        }
        patientId = newPatient.id;
      }
    }

    if (!patientId) {
      return NextResponse.json(
        { error: "Authentication required to start consultation chat." },
        { status: 401 }
      );
    }

    // 5. Existing Active Conversation Retrieval
    const { data: existingConvo } = await supabase
      .from("conversations")
      .select("id")
      .eq("clinic_id", clinic_id)
      .eq("doctor_id", doctor_id)
      .eq("patient_id", patientId)
      .maybeSingle();

    if (existingConvo) {
      return NextResponse.json({
        conversation_id: existingConvo.id,
        patient_id: patientId,
        existing: true,
      });
    }

    // 6. Create New Conversation Session
    const { data: conversation, error: convoError } = await supabase
      .from("conversations")
      .insert({
        clinic_id,
        doctor_id,
        patient_id: patientId,
        patient_name: patient_name.trim(),
        patient_email: effectiveEmail,
        status: "active",
      })
      .select("id")
      .single();

    if (convoError || !conversation) {
      console.error("[Chat API] Conversation initialization error:", convoError);
      return NextResponse.json(
        { error: "Failed to establish chat session with clinic." },
        { status: 500 }
      );
    }

    // 7. Dispatch Initial Welcome Message
    const welcomeMessage = `Hello ${patient_name.trim()}! Welcome to our clinic. How can we help you today?`;

    const { error: messageError } = await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender_id: doctor_id,
      sender_type: "doctor",
      content: welcomeMessage,
      is_read: false,
    });

    if (messageError) {
      console.warn("[Chat API] Non-critical warning (Welcome message failed):", messageError);
    }

    return NextResponse.json({
      conversation_id: conversation.id,
      patient_id: patientId,
      welcome_message: welcomeMessage,
    });

  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : "Unknown fatal error";
    console.error("[Chat API Fatal Exception]:", err);
    return NextResponse.json(
      { error: "Internal server error occurred." },
      { status: 500 }
    );
  }
}
