import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, otp_code, purpose } = body;
    if (!phone || !otp_code || !purpose) return NextResponse.json({ error: "Phone, OTP code, and purpose are required" }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();

    const { data: otpRecord, error: otpError } = await supabase.from("otp_verifications").select("*").eq("phone", phone).eq("otp_code", otp_code).eq("purpose", purpose).eq("verified", false).single();
    if (otpError || !otpRecord) return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });

    if (new Date(otpRecord.expires_at) < new Date()) return NextResponse.json({ error: "OTP has expired" }, { status: 400 });

    await supabase.from("otp_verifications").update({ verified: true, verified_at: new Date().toISOString() }).eq("id", otpRecord.id);

    return NextResponse.json({ success: true, message: "OTP verified successfully", verification_id: otpRecord.id });
  } catch (error) {
    console.error("OTP verify error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
