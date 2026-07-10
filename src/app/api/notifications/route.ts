import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userType = searchParams.get("user_type");
    const unreadOnly = searchParams.get("unread_only") === "true";

    if (!userType || !["doctor", "patient"].includes(userType)) {
      return NextResponse.json({ error: "Valid user_type is required" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let userId: string;
    if (userType === "doctor") {
      const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user.id).single();
      if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
      userId = doctor.id;
    } else {
      const { data: patient } = await supabase.from("patients").select("id").eq("user_id", user.id).single();
      if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
      userId = patient.id;
    }

    let query = supabase.from("notifications").select("*").eq("user_id", userId).eq("user_type", userType).order("created_at", { ascending: false }).limit(50);
    if (unreadOnly) query = query.eq("is_read", false);

    const { data: notifications, error } = await query;
    if (error) { console.error("Error fetching notifications:", error); return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 }); }

    return NextResponse.json({ notifications });
  } catch {
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notification_ids, all_read } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user.id).maybeSingle();
    const { data: patient } = await supabase.from("patients").select("id").eq("user_id", user.id).maybeSingle();
    const userId = doctor?.id || patient?.id;
    const userType = doctor ? "doctor" : "patient";

    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (all_read) {
      const { error } = await supabase.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("user_id", userId).eq("user_type", userType).eq("is_read", false);
      if (error) return NextResponse.json({ error: "Failed to mark notifications as read" }, { status: 500 });
    } else if (notification_ids && notification_ids.length > 0) {
      const { error } = await supabase.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).in("id", notification_ids).eq("user_id", userId).eq("user_type", userType);
      if (error) return NextResponse.json({ error: "Failed to mark notifications as read" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
