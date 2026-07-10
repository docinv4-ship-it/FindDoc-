import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();
    const { data, error } = await supabase
      .from("platform_settings")
      .select("value, updated_at")
      .eq("key", "maintenance_mode")
      .single();

    if (error || !data) {
      return NextResponse.json({ enabled: false });
    }

    return NextResponse.json({
      enabled: data.value?.enabled || false,
      message: data.value?.message || null,
      scheduledStart: data.value?.scheduledStart || null,
      scheduledEnd: data.value?.scheduledEnd || null,
      updatedAt: data.updated_at,
    });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check admin role
    const { data: adminRole } = await supabase
      .from("admin_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!adminRole || !["super_admin", "admin"].includes(adminRole.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { enabled, message, scheduledStart, scheduledEnd } = body;

    const { error } = await supabase
      .from("platform_settings")
      .upsert(
        {
          key: "maintenance_mode",
          value: {
            enabled: enabled || false,
            message: message || "System is under maintenance. Please try again later.",
            scheduledStart: scheduledStart || null,
            scheduledEnd: scheduledEnd || null,
          },
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    if (error) {
      return NextResponse.json({ error: "Failed to update maintenance mode" }, { status: 500 });
    }

    // Log to audit
    await supabase.from("audit_logs").insert({
      admin_id: adminRole.id,
      action: enabled ? "enable_maintenance" : "disable_maintenance",
      entity_type: "platform",
      entity_id: null,
      before_data: null,
      after_data: { enabled, message },
    });

    return NextResponse.json({
      success: true,
      enabled,
      message: enabled ? "Maintenance mode enabled" : "Maintenance mode disabled",
    });
  } catch (err) {
    console.error("Maintenance mode error:", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
