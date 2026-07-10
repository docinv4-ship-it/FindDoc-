import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { token, platform, user_type } = body;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  // Get doctor or patient ID
  let userId: string | null = null;
  if (user_type === "doctor") {
    const { data: doctor } = await supabase
      .from("doctors")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    userId = doctor?.id || null;
  } else {
    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    userId = patient?.id || null;
  }

  if (!userId) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Upsert push token
  const { error } = await supabase
    .from("push_tokens")
    .upsert(
      {
        user_type: user_type || "doctor",
        user_id: userId,
        token,
        platform: platform || "web",
        is_active: true,
      },
      { onConflict: "user_type,user_id,token" }
    );

  if (error) {
    console.error("Push token error:", error);
    return NextResponse.json({ error: "Failed to save token" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_tokens")
    .update({ is_active: false })
    .eq("token", token);

  if (error) {
    return NextResponse.json({ error: "Failed to deactivate token" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
