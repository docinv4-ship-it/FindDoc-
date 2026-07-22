import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/messages?conversation_id=xxx
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversation_id");

    if (!conversationId) {
      return NextResponse.json({ error: "conversation_id parameter required" }, { status: 400 });
    }

    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch messages";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

// POST /api/messages
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const {
      conversation_id,
      sender_id,
      sender_type,
      content,
      attachment_url,
      attachment_type,
      attachment_name,
    } = body;

    if (!conversation_id || !sender_id || !sender_type || (!content?.trim() && !attachment_url)) {
      return NextResponse.json({ error: "Missing required message parameters." }, { status: 400 });
    }

    // Check block status
    const { data: block } = await supabase
      .from("user_blocks")
      .select("id")
      .eq("conversation_id", conversation_id)
      .or(`blocker_id.eq.${sender_id},blocked_user_id.eq.${sender_id}`)
      .maybeSingle();

    if (block) {
      return NextResponse.json(
        { error: "Cannot send message. Active block detected on this conversation." },
        { status: 403 }
      );
    }

    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        conversation_id,
        sender_id,
        sender_type,
        content: content?.trim() || "",
        attachment_url: attachment_url || null,
        attachment_type: attachment_type || null,
        attachment_name: attachment_name || null,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to send message";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

// PATCH /api/messages (Mark as Read)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { conversation_id, reader_id } = body;

    if (!conversation_id || !reader_id) {
      return NextResponse.json({ error: "conversation_id and reader_id are required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("conversation_id", conversation_id)
      .neq("sender_id", reader_id)
      .eq("is_read", false);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update read status";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
