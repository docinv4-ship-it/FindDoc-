import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // 1. Logged-in user check karein
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Session expired or unauthorized" }, { status: 401 });
    }

    // 2. Data ko database table me upsert (insert/update) karein
    // Note: Apni exact Supabase table ka naam 'doctors' ki jagah replace kar sakte hain agar change hai
    const { data, error: dbError } = await supabase
      .from("doctors") 
      .upsert({
        id: user.id, // User id primary key link karne k liye
        doctor_name: body.basicInfo?.doctorName || "",
        clinic_name: body.basicInfo?.clinicName || "",
        specialization: body.basicInfo?.specialization || "",
        qualification: body.basicInfo?.qualification || "",
        experience_years: body.basicInfo?.experienceYears || "",
        registration_number: body.basicInfo?.registrationNumber || "",
        mobile: body.contact?.mobile || "",
        email: body.contact?.email || "",
        location_data: body.location, // Pure location object ko save karne k liye (JSONB field)
        consultation_fee: body.consultation?.consultationFee || 0,
        slot_size_minutes: body.consultation?.slotSizeMinutes || "30",
        availability_schedule: body.availability?.schedule || [],
        clinic_details: body.clinicDetails || {},
        public_profile: body.publicProfile || {},
        documents: body.documents || {},
        updated_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error("Supabase Database Error:", dbError);
      return NextResponse.json({ success: false, error: dbError.message }, { status: 400 });
    }

    // 3. Frontend ko success return karein taake router.push() trigger ho sake
    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error("Global Catch Onboarding API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
