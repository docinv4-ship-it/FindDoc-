import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSlotAvailable } from "@/lib/slots/generator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 🛡️ BULLETPROOF: Accept either 'date' or 'appointment_date' from frontend
    const date = body.date || body.appointment_date;
    const { clinic_id, doctor_id, start_time, end_time, patient_name, patient_phone, patient_email, reason_for_visit } = body;

    // 1. Strict Validation
    if (!clinic_id || !doctor_id || !date || !start_time || !end_time || !patient_name || !patient_phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    if (!phoneRegex.test(patient_phone.replace(/\s/g, ""))) {
      return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 });
    }

    if (patient_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(patient_email)) {
        return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
      }
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return NextResponse.json({ error: "Invalid time format" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();

    // 2. Fetch Clinic Data
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id, doctor_id, booking_mode")
      .eq("id", clinic_id)
      .eq("doctor_id", doctor_id)
      .single();

    if (clinicError || !clinic) {
      return NextResponse.json({ error: "Invalid clinic or doctor details" }, { status: 404 });
    }

    // 3. Slot Availability Check
    const slotAvailable = await isSlotAvailable(clinic_id, date, start_time, end_time);
    if (!slotAvailable) {
      return NextResponse.json({ error: "This slot is no longer available. Please choose another." }, { status: 409 });
    }

    // 4. Patient Handling (Get existing or Create new)
    let patientId: string;
    const { data: existingPatient } = await supabase
      .from("patients")
      .select("id")
      .eq("phone", patient_phone)
      .maybeSingle();

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
        return NextResponse.json({ error: "Failed to create patient record" }, { status: 500 });
      }
      patientId = newPatient.id;
    }

    // 5. Prevent Duplicate Bookings
    const { data: duplicateBooking } = await supabase
      .from("appointments")
      .select("id")
      .eq("patient_id", patientId)
      .eq("clinic_id", clinic_id)
      .eq("appointment_date", date)
      .in("status", ["pending", "confirmed"])
      .maybeSingle();

    if (duplicateBooking) {
      return NextResponse.json({ error: "You already have an appointment at this clinic on this date." }, { status: 409 });
    }

    // 6. Create Appointment
    const status = clinic.booking_mode === "auto" ? "confirmed" : "pending";
    const { data: appointment, error: appointError } = await supabase
      .from("appointments")
      .insert({ 
        clinic_id, 
        doctor_id, 
        patient_id: patientId, 
        appointment_date: date, 
        start_time, 
        end_time, 
        status, 
        reason_for_visit: reason_for_visit || null 
      })
      .select()
      .single();

    if (appointError) {
      if (appointError.code === "23505") {
        return NextResponse.json({ error: "This slot was just booked by another patient. Please select a different time." }, { status: 409 });
      }
      console.error("Error creating appointment:", appointError);
      return NextResponse.json({ error: "Failed to finalize appointment" }, { status: 500 });
    }

    // 7. Fire & Forget Notifications (Non-blocking)
    Promise.all([
      // Doctor Notification
      supabase.from("notifications").insert({
        user_id: doctor_id,
        user_type: "doctor",
        type: status === "confirmed" ? "appointment_confirmed" : "appointment_pending",
        title: status === "confirmed" ? "New Appointment Confirmed" : "New Appointment Request",
        body: `${patient_name} booked for ${date} at ${start_time}`,
        data: { appointment_id: appointment.id, clinic_id, patient_id: patientId },
      }),
      // Reminders Logic
      (async () => {
        const appointmentDateTime = new Date(`${date}T${start_time}`);
        const now = new Date();
        const reminder24h = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000);
        const reminder2h = new Date(appointmentDateTime.getTime() - 2 * 60 * 60 * 1000);

        if (reminder24h > now) {
          await supabase.from("notification_queue").insert([
            {
              user_id: doctor_id, user_type: "doctor", channels: ["in_app"], scheduled_for: reminder24h.toISOString(),
              payload: { type: "appointment_reminder_24h", title: "Reminder: Appointment Tomorrow", body: `Appointment with ${patient_name} tomorrow at ${start_time}`, data: { appointment_id: appointment.id } }
            },
            ...(patient_email ? [{
              user_id: patientId, user_type: "patient", channels: ["in_app"], scheduled_for: reminder24h.toISOString(),
              payload: { type: "appointment_reminder_24h", title: "Reminder: Appointment Tomorrow", body: `Your appointment is tomorrow at ${start_time}`, data: { appointment_id: appointment.id } }
            }] : [])
          ]);
        }
        
        if (reminder2h > now) {
          await supabase.from("notification_queue").insert([
            {
              user_id: doctor_id, user_type: "doctor", channels: ["in_app"], scheduled_for: reminder2h.toISOString(),
              payload: { type: "appointment_reminder_2h", title: "Reminder: Appointment in 2 Hours", body: `Appointment with ${patient_name} at ${start_time}`, data: { appointment_id: appointment.id } }
            },
            ...(patient_email ? [{
              user_id: patientId, user_type: "patient", channels: ["in_app"], scheduled_for: reminder2h.toISOString(),
              payload: { type: "appointment_reminder_2h", title: "Reminder: Appointment in 2 Hours", body: `Your appointment is in 2 hours at ${start_time}`, data: { appointment_id: appointment.id } }
            }] : [])
          ]);
        }
      })()
    ]).catch(err => console.error("Notification scheduling error:", err)); // Don't crash if notifications fail

    return NextResponse.json({ appointment });

  } catch (error) {
    console.error("Booking API Critical Error:", error);
    return NextResponse.json({ error: "An unexpected error occurred while booking" }, { status: 500 });
  }
}
