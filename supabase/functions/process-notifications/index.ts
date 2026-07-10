import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.108.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Process pending notifications from the queue
    const { data: notifications, error: fetchError } = await supabase.rpc(
      "process_notification_queue"
    );

    if (fetchError) {
      throw new Error(`Failed to fetch notifications: ${fetchError.message}`);
    }

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No pending notifications" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let successCount = 0;
    let failCount = 0;

    for (const notif of notifications) {
      try {
        // For in_app notifications, just mark as sent (the trigger already inserts into notifications table)
        if (notif.channels && notif.channels.includes("in_app")) {
          await supabase.rpc("update_notification_status", {
            p_id: notif.id,
            p_success: true,
          });
          successCount++;
          continue;
        }

        // For push notifications, look up push tokens and send
        const { data: tokens } = await supabase
          .from("push_tokens")
          .select("token, endpoint")
          .eq("user_type", notif.user_type)
          .eq("user_id", notif.user_id)
          .eq("is_active", true);

        if (tokens && tokens.length > 0) {
          // Push notification would be sent here via web push
          // For now, mark as sent
          await supabase.rpc("update_notification_status", {
            p_id: notif.id,
            p_success: true,
          });
          successCount++;
        } else {
          // No tokens, mark as sent (in_app only)
          await supabase.rpc("update_notification_status", {
            p_id: notif.id,
            p_success: true,
          });
          successCount++;
        }
      } catch (err) {
        await supabase.rpc("update_notification_status", {
          p_id: notif.id,
          p_success: false,
          p_error: err.message,
        });
        failCount++;
      }
    }

    // Process scheduled notifications from queue (reminders, etc.)
    const { data: scheduledNotifications } = await supabase
      .from("notification_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .limit(100);

    if (scheduledNotifications && scheduledNotifications.length > 0) {
      for (const notif of scheduledNotifications) {
        try {
          // Insert into notifications table for in_app delivery
          if (notif.payload) {
            await supabase.from("notifications").insert({
              user_id: notif.user_id,
              user_type: notif.user_type,
              type: notif.payload.type,
              title: notif.payload.title,
              body: notif.payload.body,
              data: notif.payload.data,
            });
          }

          // Mark as sent
          await supabase
            .from("notification_queue")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", notif.id);

          successCount++;
        } catch (err) {
          await supabase
            .from("notification_queue")
            .update({ status: "failed", error: (err as Error).message })
            .eq("id", notif.id);
          failCount++;
        }
      }
    }

    // Also expire featured listings
    await supabase.rpc("expire_featured_listings_auto");

    return new Response(
      JSON.stringify({
        processed: successCount + failCount,
        success: successCount,
        failed: failCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
