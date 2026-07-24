import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Edge caching disable karna zaroori hai cron jobs ke liye
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // 1. Enterprise Security Check: Sirf Vercel isko run kar sakta hai
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized CRON Request' }, { status: 401 });
    }

    // 2. Supabase Admin Client Initialize (Bypass RLS)
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! // Dhyan rakhein, yeh service role key hai, anon key nahi!
    );

    try {
        // 3. Database se sirf "Confirmed" appointments nikalna
        const { data: appointments, error: fetchError } = await supabase
            .from('appointments')
            .select(`
                id,
                appointment_date,
                start_time,
                doctor_id,
                patient_id,
                doctors (full_name),
                patients (full_name)
            `)
            .eq('status', 'confirmed');

        if (fetchError) throw fetchError;
        if (!appointments || appointments.length === 0) {
            return NextResponse.json({ success: true, message: 'No upcoming appointments found.' });
        }

        const notificationsToInsert: any[] = [];
        const now = new Date();

        for (const appt of appointments) {
            // Time logic safe tareeqay se handle karna
            const appointmentDateTime = new Date(`${appt.appointment_date}T${appt.start_time}`);
            
            // Time ka difference nikalna (hours mein)
            const diffInHours = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

            // Relational tables se array/object check kar ke naam nikalna
            const docName = Array.isArray(appt.doctors) ? appt.doctors[0]?.full_name : (appt.doctors as any)?.full_name || 'Doctor';
            const patName = Array.isArray(appt.patients) ? appt.patients[0]?.full_name : (appt.patients as any)?.full_name || 'Patient';
            
            const timeString = appointmentDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

            // -------------------------------------------------------------
            // SCENARIO A: 24-HOUR REMINDER (If time is between 23 to 24.5 hours)
            // -------------------------------------------------------------
            if (diffInHours > 23 && diffInHours <= 24.5) {
                const has24h = await checkDuplicate(supabase, appt.id, 'reminder_24h');
                
                if (!has24h) {
                    // Patient ko Reminder
                    notificationsToInsert.push({
                        user_id: appt.patient_id,
                        user_type: 'patient',
                        type: 'reminder_24h',
                        title: 'Upcoming Visit Tomorrow 🕒',
                        body: `Reminder: You have an appointment tomorrow at ${timeString} with Dr. ${docName}.`,
                        data: { appointment_id: appt.id },
                        is_read: false
                    });
                    // Doctor ko Reminder
                    notificationsToInsert.push({
                        user_id: appt.doctor_id,
                        user_type: 'doctor',
                        type: 'reminder_24h',
                        title: 'Upcoming Appointment Tomorrow 🕒',
                        body: `Reminder: You have a scheduled visit tomorrow at ${timeString} with ${patName}.`,
                        data: { appointment_id: appt.id },
                        is_read: false
                    });
                }
            }

            // -------------------------------------------------------------
            // SCENARIO B: 4-HOUR REMINDER (If time is between 3 to 4.5 hours)
            // -------------------------------------------------------------
            else if (diffInHours > 3 && diffInHours <= 4.5) {
                const has4h = await checkDuplicate(supabase, appt.id, 'reminder_4h');
                
                if (!has4h) {
                    // Sirf Patient ko alert karega (Doctors ko spam se bachane ke liye)
                    notificationsToInsert.push({
                        user_id: appt.patient_id,
                        user_type: 'patient',
                        type: 'reminder_4h',
                        title: 'Visit in 4 Hours! ⏳',
                        body: `Your appointment with Dr. ${docName} is in 4 hours. Please reach the clinic on time.`,
                        data: { appointment_id: appt.id },
                        is_read: false
                    });
                }
            }
        }

        // 4. Final Insert in Database (Agar koi naya notification bana hai toh)
        if (notificationsToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('notifications')
                .insert(notificationsToInsert);
            
            if (insertError) throw insertError;
        }

        return NextResponse.json({ 
            success: true, 
            message: `Cron executed successfully. Sent ${notificationsToInsert.length} reminders.` 
        }, { status: 200 });

    } catch (error: any) {
        console.error('CRON Automation Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// 🛡️ Helper Function: Duplicate Spam Check (Elon Musk Level Optimization)
async function checkDuplicate(supabase: any, appointmentId: string, reminderType: string) {
    const { data } = await supabase
        .from('notifications')
        .select('id')
        .eq('type', reminderType)
        .contains('data', { appointment_id: appointmentId })
        .single();
    
    return !!data; // True agar already bheji ja chuki hai
}
