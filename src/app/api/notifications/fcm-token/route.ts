import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { token, device_type } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "FCM token is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase.from("user_fcm_tokens").upsert(
      {
        user_id: user.id,
        fcm_token: token,
        device_type: device_type || "web",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "fcm_token" }
    );

    if (error) {
      console.error("FCM Token API Save Error:", error);
      return NextResponse.json({ error: "Database save failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "FCM Token registered successfully" });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
