import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSlotAvailable } from "@/lib/slots/generator";

export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();

    // 🔒 1. STRICT AUTHENTICATION GUARD (Zero Guest Access Allowed)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required. You must be logged in to book an appointment." },
        { status: 401 }
      );
    }

    const body = await request.json();

    // 🛡️ Accept either 'date' or 'appointment_date' from frontend payload
    const date = body.date || body.appointment_date;
    const {
      clinic_id,
      doctor_id,
      start_time,
      end_time,
      patient_name,
      patient_phone,
      patient_email,
      reason_for_visit,
    } = body;

    // 2. Strict Input Validations
    if (!clinic_id || !doctor_id || !date || !start_time || !end_time || !patient_name || !patient_phone) {
      return NextResponse.json({ error: "Missing required booking fields" }, { status: 400 });
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
      return NextResponse.json({ error: "Invalid date format (expected YYYY-MM-DD)" }, { status: 400 });
    }

    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return NextResponse.json({ error: "Invalid time format (expected HH:MM)" }, { status: 400 });
    }

    // 3. Fetch Clinic Data & Verify Doctor Ownership
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id, doctor_id, booking_mode")
      .eq("id", clinic_id)
      .eq("doctor_id", doctor_id)
      .single();

    if (clinicError || !clinic) {
      return NextResponse.json({ error: "Invalid clinic or doctor details" }, { status: 404 });
    }

    // 4. Slot Availability Check
    const slotAvailable = await isSlotAvailable(clinic_id, date, start_time, end_time);
    if (!slotAvailable) {
      return NextResponse.json(
        { error: "This slot is no longer available. Please select another time." },
        { status: 409 }
      );
    }

    // 5. Authenticated Patient Record Management
    let patientId: string;

    // Match patient record associated with authenticated user.id or phone number
    const { data: existingPatient } = await supabase
      .from("patients")
      .select("id, user_id")
      .or(`user_id.eq.${user.id},phone.eq.${patient_phone}`)
      .maybeSingle();

    if (existingPatient) {
      patientId = existingPatient.id;
      // Ensure user_id link is established if record was previously created without it
      if (!existingPatient.user_id) {
        await supabase
          .from("patients")
          .update({ user_id: user.id, is_guest: false })
          .eq("id", patientId);
      }
    } else {
      // Create new authenticated patient record linked strictly to auth user
      const { data: newPatient, error: patientError } = await supabase
        .from("patients")
        .insert({
          user_id: user.id,
          full_name: patient_name,
          phone: patient_phone,
          email: patient_email || user.email || null,
          is_guest: false,
        })
        .select("id")
        .single();

      if (patientError) {
        console.error("Error creating patient record:", patientError);
        return NextResponse.json(
          { error: `Failed to create patient record: ${patientError.message}` },
          { status: 500 }
        );
      }
      patientId = newPatient.id;
    }

    // 6. Prevent Duplicate Active Bookings
    const { data: duplicateBooking } = await supabase
      .from("appointments")
      .select("id")
      .eq("patient_id", patientId)
      .eq("clinic_id", clinic_id)
      .eq("appointment_date", date)
      .in("status", ["pending", "confirmed"])
      .maybeSingle();

    if (duplicateBooking) {
      return NextResponse.json(
        { error: "You already have an active appointment at this clinic on this date." },
        { status: 409 }
      );
    }

    // 7. Create Appointment Record
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
        reason_for_visit: reason_for_visit || null,
      })
      .select()
      .single();

    if (appointError) {
      if (appointError.code === "23505") {
        return NextResponse.json(
          { error: "This slot was just booked by another patient. Please select a different time." },
          { status: 409 }
        );
      }
      console.error("Critical DB Error on Appointment Creation:", appointError);
      return NextResponse.json(
        { error: `DB Error: ${appointError.message} (Code: ${appointError.code || "N/A"})` },
        { status: 500 }
      );
    }

    // 8. Fire & Forget Background Notifications (Non-blocking)
    Promise.all([
      // Doctor In-App Notification
      supabase.from("notifications").insert({
        user_id: doctor_id,
        user_type: "doctor",
        type: status === "confirmed" ? "appointment_confirmed" : "appointment_pending",
        title: status === "confirmed" ? "New Appointment Confirmed" : "New Appointment Request",
        body: `${patient_name} booked for ${date} at ${start_time}`,
        data: { appointment_id: appointment.id, clinic_id, patient_id: patientId },
      }),
      // Automated Reminder Queue Scheduling
      (async () => {
        const appointmentDateTime = new Date(`${date}T${start_time}`);
        const now = new Date();
        const reminder24h = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000);
        const reminder2h = new Date(appointmentDateTime.getTime() - 2 * 60 * 60 * 1000);

        const activeEmail = patient_email || user.email;

        if (reminder24h > now) {
          await supabase.from("notification_queue").insert([
            {
              user_id: doctor_id,
              user_type: "doctor",
              channels: ["in_app"],
              scheduled_for: reminder24h.toISOString(),
              payload: {
                type: "appointment_reminder_24h",
                title: "Reminder: Appointment Tomorrow",
                body: `Appointment with ${patient_name} tomorrow at ${start_time}`,
                data: { appointment_id: appointment.id },
              },
            },
            ...(activeEmail
              ? [
                  {
                    user_id: patientId,
                    user_type: "patient",
                    channels: ["in_app"],
                    scheduled_for: reminder24h.toISOString(),
                    payload: {
                      type: "appointment_reminder_24h",
                      title: "Reminder: Appointment Tomorrow",
                      body: `Your appointment is tomorrow at ${start_time}`,
                      data: { appointment_id: appointment.id },
                    },
                  },
                ]
              : []),
          ]);
        }

        if (reminder2h > now) {
          await supabase.from("notification_queue").insert([
            {
              user_id: doctor_id,
              user_type: "doctor",
              channels: ["in_app"],
              scheduled_for: reminder2h.toISOString(),
              payload: {
                type: "appointment_reminder_2h",
                title: "Reminder: Appointment in 2 Hours",
                body: `Appointment with ${patient_name} at ${start_time}`,
                data: { appointment_id: appointment.id },
              },
            },
            ...(activeEmail
              ? [
                  {
                    user_id: patientId,
                    user_type: "patient",
                    channels: ["in_app"],
                    scheduled_for: reminder2h.toISOString(),
                    payload: {
                      type: "appointment_reminder_2h",
                      title: "Reminder: Appointment in 2 Hours",
                      body: `Your appointment is in 2 hours at ${start_time}`,
                      data: { appointment_id: appointment.id },
                    },
                  },
                ]
              : []),
          ]);
        }
      })(),
    ]).catch((err) => console.error("Notification scheduling error:", err));

    return NextResponse.json({ appointment }, { status: 200 });

  } catch (error) {
    console.error("Booking API Critical Unexpected Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while booking" },
      { status: 500 }
    );
  }
}
