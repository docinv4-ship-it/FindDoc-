import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notification_ids } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's doctor or patient ID
    const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user.id).maybeSingle();
    const { data: patient } = await supabase.from("patients").select("id").eq("user_id", user.id).maybeSingle();

    const userId = doctor?.id || patient?.id;
    const userType = doctor ? "doctor" : "patient";

    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let query = supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("user_type", userType);

    if (notification_ids && Array.isArray(notification_ids) && notification_ids.length > 0) {
      query = query.in("id", notification_ids);
    } else {
      // Mark all as read
      query = query.eq("is_read", false);
    }

    const { error } = await query;

    if (error) {
      console.error("Error marking notifications as read:", error);
      return NextResponse.json({ error: "Failed to mark notifications as read" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

// Get unread count
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_type = searchParams.get("user_type");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's doctor or patient ID
    const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user.id).maybeSingle();
    const { data: patient } = await supabase.from("patients").select("id").eq("user_id", user.id).maybeSingle();

    const userId = doctor?.id || patient?.id;
    const userType = user_type || (doctor ? "doctor" : "patient");

    if (!userId) {
      return NextResponse.json({ unread_count: 0 });
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("user_type", userType)
      .eq("is_read", false);

    if (error) {
      console.error("Error getting notification count:", error);
      return NextResponse.json({ error: "Failed to get notification count" }, { status: 500 });
    }

    return NextResponse.json({ unread_count: count || 0 });
  } catch {
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
