import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, purpose } = body;
    if (!phone || !purpose) return NextResponse.json({ error: "Phone and purpose are required" }, { status: 400 });

    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ""))) return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();

    await supabase.from("otp_verifications").delete().eq("phone", phone).eq("purpose", purpose).eq("verified", false);

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: otpError } = await supabase.from("otp_verifications").insert({ phone, otp_code: otpCode, purpose, expires_at: expiresAt, verified: false });
    if (otpError) { console.error("Error storing OTP:", otpError); return NextResponse.json({ error: "Failed to generate OTP" }, { status: 500 }); }

    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json({ success: true, message: "OTP sent successfully", ...(isDev && { dev_otp: otpCode }) });
  } catch (error) {
    console.error("OTP send error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
