import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email") || user?.email;

    if (!email) {
      return NextResponse.json({ appointments: [] }, { status: 200 });
    }

    // 🎯 Direct Fetch: Simple and bulletproof lookup via email
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(`
        id, 
        appointment_date, 
        start_time, 
        end_time, 
        status, 
        reason_for_visit,
        clinics(id, name, address, city),
        doctors(id, full_name, specialization)
      `)
      .eq("patient_email", email)
      .order("appointment_date", { ascending: false });

    if (error) {
      console.error("Fetch error:", error);
      return NextResponse.json({ appointments: [] }, { status: 200 });
    }

    return NextResponse.json({ appointments: appointments || [] }, { status: 200 });

  } catch (e) {
    console.error("Critical API Error:", e);
    return NextResponse.json({ appointments: [] }, { status: 200 });
  }
}
