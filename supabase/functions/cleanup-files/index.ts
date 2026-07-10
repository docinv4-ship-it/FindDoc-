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

    // Cleanup old notifications (older than 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: deletedNotifications, error: notifError } = await supabase
      .from("notifications")
      .delete()
      .lt("created_at", ninetyDaysAgo.toISOString())
      .eq("is_read", true)
      .select("id");

    if (notifError) {
      console.error("Error cleaning up notifications:", notifError);
    }

    // Cleanup expired featured listings
    const { error: featuredError } = await supabase.rpc("expire_featured_listings_auto");
    if (featuredError) {
      console.error("Error expiring featured listings:", featuredError);
    }

    // Cleanup expired subscriptions in grace period
    const gracePeriodAgo = new Date();
    gracePeriodAgo.setDate(gracePeriodAgo.getDate() - 7);

    const { data: expiredSubscriptions, error: subError } = await supabase
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("status", "grace")
      .lt("grace_period_ends_at", new Date().toISOString())
      .select("id");

    if (subError) {
      console.error("Error expiring subscriptions:", subError);
    }

    // Detect orphan files in storage
    // Get all files in verification-docs bucket
    const { data: storageFiles, error: storageError } = await supabase.storage
      .from("verification-docs")
      .list();

    if (storageError) {
      console.error("Error listing storage files:", storageError);
    }

    let orphanFilesCount = 0;
    if (storageFiles) {
      for (const file of storageFiles) {
        // Check if this file is referenced in verification_documents
        const { data: docRefs } = await supabase
          .from("verification_documents")
          .select("id")
          .eq("file_path", file.name)
          .limit(1);

        if (!docRefs || docRefs.length === 0) {
          // File is orphaned, could be deleted
          orphanFilesCount++;
          // Note: In production, you might want to archive instead of delete
          // await supabase.storage.from("verification-docs").remove([file.name]);
        }
      }
    }

    // Cleanup old notification queue items (processed and older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: deletedQueue, error: queueError } = await supabase
      .from("notification_queue")
      .delete()
      .in("status", ["sent", "failed"])
      .lt("updated_at", sevenDaysAgo.toISOString())
      .select("id");

    if (queueError) {
      console.error("Error cleaning up notification queue:", queueError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsDeleted: deletedNotifications?.length || 0,
        subscriptionsExpired: expiredSubscriptions?.length || 0,
        orphanFilesDetected: orphanFilesCount,
        queueItemsDeleted: deletedQueue?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
