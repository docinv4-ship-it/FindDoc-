import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversation_id");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const beforeId = searchParams.get("before_id");

    if (!conversationId) return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();

    let query = supabase
      .from("messages")
      .select("*", { count: "exact" })
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (beforeId) {
      const { data: beforeMsg } = await supabase
        .from("messages")
        .select("created_at")
        .eq("id", beforeId)
        .single();

      if (beforeMsg) {
        query = query.lt("created_at", beforeMsg.created_at);
      }
    }

    query = query.limit(limit);

    const { data: messages, error, count } = await query;
    if (error) { console.error("Error fetching messages:", error); return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 }); }

    return NextResponse.json({ messages, total: count || 0, hasMore: (messages?.length || 0) === limit });
  } catch {
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation_id, sender_id, sender_type, content } = body;
    if (!conversation_id || !sender_id || !sender_type || !content) return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    if (!["doctor", "patient"].includes(sender_type)) return NextResponse.json({ error: "Invalid sender type" }, { status: 400 });
    if (!content.trim()) return NextResponse.json({ error: "Message content cannot be empty" }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();

    const { data: conversation, error: convError } = await supabase.from("conversations").select("id, clinic_id, patient_id, doctor_id").eq("id", conversation_id).single();
    if (convError || !conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    if (sender_type === "doctor" && sender_id !== conversation.doctor_id) return NextResponse.json({ error: "Invalid sender for this conversation" }, { status: 403 });
    if (sender_type === "patient" && sender_id !== conversation.patient_id) return NextResponse.json({ error: "Invalid sender for this conversation" }, { status: 403 });

    const { data: message, error: msgError } = await supabase.from("messages").insert({ conversation_id, sender_id, sender_type, content: content.trim(), is_read: false }).select().single();
    if (msgError) { console.error("Error sending message:", msgError); return NextResponse.json({ error: "Failed to send message" }, { status: 500 }); }

    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversation_id);

    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation_id, reader_id } = body;
    if (!conversation_id || !reader_id) return NextResponse.json({ error: "Conversation ID and reader ID are required" }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();

    const { error } = await supabase.from("messages").update({ is_read: true, read_at: new Date().toISOString() }).eq("conversation_id", conversation_id).neq("sender_id", reader_id).eq("is_read", false);
    if (error) { console.error("Error marking messages as read:", error); return NextResponse.json({ error: "Failed to mark messages as read" }, { status: 500 }); }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
