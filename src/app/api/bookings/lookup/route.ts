import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email") || user?.email;
    const userId = searchParams.get("userId") || user?.id;

    if (!email && !userId) {
      return NextResponse.json({ appointments: [] }, { status: 200 });
    }

    // Dynamic filtering based on available identity
    let query = supabase
      .from("appointments")
      .select(`
        id, appointment_date, start_time, end_time, status, reason_for_visit,
        clinics(name, address),
        doctors(full_name, specialization)
      `);

    // Applying filters based on schema (Fixed to match SQL above)
    if (userId && email) {
      query = query.or(`patient_id.eq.${userId},patient_email.eq.${email}`);
    } else if (userId) {
      query = query.eq("patient_id", userId);
    } else {
      query = query.eq("patient_email", email);
    }

    const { data, error } = await query.order("appointment_date", { ascending: false });

    // Handle DB Errors gracefully (No more red banners)
    if (error) {
      console.error("DB Error:", error);
      return NextResponse.json({ appointments: [] }, { status: 200 });
    }

    return NextResponse.json({ appointments: data || [] }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ appointments: [] }, { status: 200 });
  }
}
