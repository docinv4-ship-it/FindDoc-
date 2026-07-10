import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation_id, blocker_type, blocker_id, blocked_user_id, reason, description } = body;

    if (!conversation_id || !blocker_type || !blocker_id || !blocked_user_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["doctor", "patient"].includes(blocker_type)) {
      return NextResponse.json({ error: "Invalid blocker type" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();

    // Verify the blocker owns the conversation
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, doctor_id, patient_id")
      .eq("id", conversation_id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Verify ownership
    const isOwner =
      (blocker_type === "doctor" && conversation.doctor_id === blocker_id) ||
      (blocker_type === "patient" && conversation.patient_id === blocker_id);

    if (!isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Create block record
    const { error: blockError } = await supabase
      .from("user_blocks")
      .insert({
        conversation_id,
        blocker_type,
        blocker_id,
        blocked_user_id,
        reason: reason || "no_reason",
        description: description || null,
        created_at: new Date().toISOString(),
      });

    if (blockError) {
      // Check if already blocked
      if (blockError.code === "23505") {
        return NextResponse.json({ error: "User already blocked" }, { status: 409 });
      }
      throw blockError;
    }

    // Update conversation status to resolved
    await supabase
      .from("conversations")
      .update({ status: "resolved", updated_at: new Date().toISOString() })
      .eq("id", conversation_id);

    return NextResponse.json({ success: true, message: "User blocked successfully" });
  } catch (error) {
    console.error("Block error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversation_id = searchParams.get("conversation_id");
    const blocker_id = searchParams.get("blocker_id");
    const blocked_user_id = searchParams.get("blocked_user_id");

    if (!conversation_id || !blocker_id || !blocked_user_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();

    const { error } = await supabase
      .from("user_blocks")
      .delete()
      .eq("conversation_id", conversation_id)
      .eq("blocker_id", blocker_id)
      .eq("blocked_user_id", blocked_user_id);

    if (error) {
      throw error;
    }

    // Update conversation status back to active
    await supabase
      .from("conversations")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", conversation_id);

    return NextResponse.json({ success: true, message: "User unblocked successfully" });
  } catch (error) {
    console.error("Unblock error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
