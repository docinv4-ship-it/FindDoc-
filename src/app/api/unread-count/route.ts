import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_type = searchParams.get("user_type");
    const user_id = searchParams.get("user_id");

    if (!user_type || !["doctor", "patient"].includes(user_type)) {
      return NextResponse.json({ error: "Valid user_type is required" }, { status: 400 });
    }

    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();

    // Get unread message count
    let unreadMessages = 0;
    if (user_type === "doctor") {
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id")
        .eq("doctor_id", user_id);

      if (conversations && conversations.length > 0) {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .in("conversation_id", conversations.map((c: { id: string }) => c.id))
          .eq("sender_type", "patient")
          .eq("is_read", false);
        unreadMessages = count || 0;
      }
    } else {
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id")
        .eq("patient_id", user_id);

      if (conversations && conversations.length > 0) {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .in("conversation_id", conversations.map((c: { id: string }) => c.id))
          .eq("sender_type", "doctor")
          .eq("is_read", false);
        unreadMessages = count || 0;
      }
    }

    // Get unread notification count
    const { count: unreadNotifications } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user_id)
      .eq("user_type", user_type)
      .eq("is_read", false);

    return NextResponse.json({
      unread_messages: unreadMessages,
      unread_notifications: unreadNotifications || 0,
      total: unreadMessages + (unreadNotifications || 0),
    });
  } catch {
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
