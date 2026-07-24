import { NextRequest, NextResponse } from "next/server";
import { messaging } from "@/lib/firebase-admin";
import { createClient } from "@supabase/supabase-js";

// Use Service Role Key to bypass Row Level Security (RLS) safely on the server side
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 🛡️ Enterprise Security Layer: Verify Webhook Secret
    const authHeader = req.headers.get("x-webhook-secret");
    if (authHeader !== process.env.SUPABASE_WEBHOOK_SECRET) {
      console.warn("Unauthorized webhook attempt blocked.");
      return NextResponse.json({ error: "Unauthorized request" }, { status: 401 });
    }

    // 📦 Parse Supabase Webhook Payload
    const payload = await req.json();

    // System Check: Ensure it's an INSERT event from the notifications table
    if (payload.type !== "INSERT" || payload.table !== "notifications") {
      return NextResponse.json({ message: "Event ignored (Not a notification insert)" }, { status: 200 });
    }

    const notificationRecord = payload.record;
    if (!notificationRecord || !notificationRecord.user_id) {
      return NextResponse.json({ error: "Invalid record data structure" }, { status: 400 });
    }

    // 🔍 Fetch User's FCM Tokens from Supabase
    const { data: tokens, error } = await supabaseAdmin
      .from("user_fcm_tokens")
      .select("fcm_token")
      .eq("user_id", notificationRecord.user_id);

    if (error) throw error;

    if (!tokens || tokens.length === 0) {
      console.log(`[Push API] No active devices found for user: ${notificationRecord.user_id}`);
      return NextResponse.json({ message: "No tokens found, push skipped." }, { status: 200 });
    }

    // 🚀 Construct Professional Push Payload
    const pushPayload = {
      notification: {
        title: notificationRecord.title,
        body: notificationRecord.body,
      },
      data: {
        notificationId: String(notificationRecord.id),
        type: notificationRecord.type || "system",
        click_action: "/patient/notifications", // Where user goes when they tap the notification
      },
    };

    // ⚡ Send to ALL user devices (Multicast Support)
    const tokenArray = tokens.map((t) => t.fcm_token);
    const response = await messaging.sendEachForMulticast({
      tokens: tokenArray,
      ...pushPayload,
    });

    console.log(`[Push API] Success: ${response.successCount} | Failed: ${response.failureCount}`);

    // (Optional Auto-Clean) If token expired/uninstalled, you can map response.responses and delete them from DB here.

    return NextResponse.json({ 
      success: true, 
      delivered: response.successCount 
    }, { status: 200 });

  } catch (error: any) {
    console.error("[Push API] Critical Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
