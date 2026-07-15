import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { doctor_id, clinic_id, patient_name, patient_phone, patient_email } = body;
    if (!doctor_id || !clinic_id || !patient_name || !patient_phone) {
      return NextResponse.json({ error: "Doctor ID, clinic ID, patient name, and phone are required" }, { status: 400 });
    }

    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    if (!phoneRegex.test(patient_phone.replace(/\s/g, ""))) {
      return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();

    const { data: clinic } = await supabase.from("clinics").select("id, doctor_id").eq("id", clinic_id).eq("doctor_id", doctor_id).single();
    if (!clinic) return NextResponse.json({ error: "Invalid doctor or clinic" }, { status: 404 });

    let patientId: string;
    const { data: existingPatient } = await supabase.from("patients").select("id").eq("phone", patient_phone).maybeSingle();

    if (existingPatient) {
      patientId = existingPatient.id;
    } else {
      const { data: newPatient, error: patientError } = await supabase
        .from("patients")
        .insert({ 
          full_name: patient_name, 
          phone: patient_phone, 
          email: patient_email || null, 
          is_guest: true 
        })
        .select("id")
        .single();
      
      if (patientError) { 
        console.error("Error creating patient:", patientError); 
        // SMART FIX: Returning the exact Postgres/Supabase database error message
        return NextResponse.json({ 
          error: `DB Error (Patient Create Failed): ${patientError.message} (Code: ${patientError.code || 'unknown'})` 
        }, { status: 500 }); 
      }
      patientId = newPatient.id;
    }

    const { data: existingConvo } = await supabase.from("conversations").select("id").eq("clinic_id", clinic_id).eq("patient_id", patientId).maybeSingle();
    if (existingConvo) return NextResponse.json({ conversation_id: existingConvo.id, patient_id: patientId, existing: true });

    const { data: conversation, error: convoError } = await supabase.from("conversations").insert({ clinic_id, doctor_id, patient_id: patientId }).select("id").single();
    if (convoError) { 
      console.error("Error creating conversation:", convoError); 
      // SMART FIX: Returning the exact Postgres/Supabase conversation error message
      return NextResponse.json({ 
        error: `DB Error (Convo Create Failed): ${convoError.message} (Code: ${convoError.code || 'unknown'})` 
      }, { status: 500 }); 
    }

    const welcomeMessage = `Hello ${patient_name}! Welcome to our clinic. How can we help you today?`;
    await supabase.from("messages").insert({ conversation_id: conversation.id, sender_id: doctor_id, sender_type: "doctor", content: welcomeMessage, is_read: false });

    return NextResponse.json({ conversation_id: conversation.id, patient_id: patientId, welcome_message: welcomeMessage });
  } catch (error: any) {
    console.error("Chat start error:", error);
    return NextResponse.json({ error: `Unexpected Server Error: ${error.message || error}` }, { status: 500 });
  }
}
