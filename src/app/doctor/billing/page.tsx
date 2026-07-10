"use client";

import { Suspense, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Check, Star, AlertCircle, Clock, CreditCard, Zap, X } from "lucide-react";
import type { Database } from "@/types/database";

type SubscriptionPlan = Database["public"]["Tables"]["subscription_plans"]["Row"];
type DoctorSubscription = Database["public"]["Tables"]["doctor_subscriptions"]["Row"];
type FeaturedListing = Database["public"]["Tables"]["featured_listings"]["Row"];

function DoctorBillingContent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<DoctorSubscription | null>(null);
  const [featuredListing, setFeaturedListing] = useState<FeaturedListing | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/doctor/login"); return; }
      const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user.id).single();
      if (!doctor) { router.push("/doctor/login"); return; }
      setDoctorId(doctor.id);

      const { data: subData } = await supabase.from("doctor_subscriptions").select("*").eq("doctor_id", doctor.id).single();
      setSubscription(subData || null);

      const { data: featuredData } = await supabase.from("featured_listings").select("*").eq("doctor_id", doctor.id).single();
      setFeaturedListing(featuredData || null);

      const { data: planData } = await supabase.from("subscription_plans").select("*").eq("is_active", true).order("display_order");
      if (planData) setPlans(planData);

      if (searchParams.get("success")) setSuccess("Subscription activated successfully!");
      if (searchParams.get("canceled")) setError("Payment was canceled. Please try again.");

      const preselectPlan = searchParams.get("plan");
      const preselectCycle = searchParams.get("cycle");
      if (preselectPlan && planData) {
        const plan = planData.find((p: SubscriptionPlan) => p.slug === preselectPlan);
        if (plan) setSelectedPlan(plan.id);
      }
      if (preselectCycle === "monthly" || preselectCycle === "yearly") setBillingCycle(preselectCycle);

      setLoading(false);
    };
    init();
  }, [supabase, router, searchParams]);

  const getTrialDaysRemaining = () => {
    if (!subscription?.trial_ends_at) return 0;
    const end = new Date(subscription.trial_ends_at);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const getGraceDaysRemaining = () => {
    if (!subscription?.grace_period_ends_at) return 0;
    const end = new Date(subscription.grace_period_ends_at);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const handleSubscribe = async (planId: string) => {
    if (!doctorId) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingCycle }),
      });
      const data = await response.json();
      if (response.ok && data.checkout?.url) {
        window.location.href = data.checkout.url;
      } else {
        setError(data.error || "Failed to start checkout");
      }
    } catch {
      setError("An error occurred");
    }
    setSaving(false);
  };

  const handleCancel = async () => {
    if (!subscription || !confirm("Are you sure you want to cancel your subscription?")) return;
    setSaving(true);
    try {
      await supabase.from("doctor_subscriptions").update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", subscription.id);
      if (featuredListing) {
        await supabase.from("featured_listings").update({
          status: "inactive",
          updated_at: new Date().toISOString(),
        }).eq("id", featuredListing.id);
        setFeaturedListing({ ...featuredListing, status: "inactive" });
      }
      setSubscription({ ...subscription, status: "cancelled", cancelled_at: new Date().toISOString() });
      setSuccess("Subscription cancelled. You will retain access until the end of your billing period.");
    } catch {
      setError("Failed to cancel subscription");
    }
    setSaving(false);
  };

  const startTrial = async () => {
    if (!doctorId) return;
    setSaving(true);
    try {
      const trialPlan = plans.find((p) => p.slug === "trial");
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const { data, error: subError } = await supabase.from("doctor_subscriptions").upsert({
        doctor_id: doctorId,
        plan_id: trialPlan?.id,
        status: "trial",
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
      }, { onConflict: "doctor_id" }).select().single();
      if (!subError && data) {
        setSubscription(data);
        setSuccess("Trial started! You have 14 days of full access.");
      }
    } catch {
      setError("Failed to start trial");
    }
    setSaving(false);
  };

  const plan = plans.find((p) => p.id === (selectedPlan || subscription?.plan_id));
  const trialDays = getTrialDaysRemaining();
  const graceDays = getGraceDaysRemaining();

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-600">Manage your subscription and billing</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-400" /></button>
        </div>
      )}

      {success && (
        <div className="rounded-lg border p-4 flex items-start gap-3" style={{ backgroundColor: "#e6faf9", borderColor: "#36d1cf" }}>
          <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#239999" }} />
          <div className="flex-1">
            <p className="text-sm" style={{ color: "#239999" }}>{success}</p>
          </div>
          <button onClick={() => setSuccess(null)}><X className="w-4 h-4" style={{ color: "#36d1cf" }} /></button>
        </div>
      )}

      {subscription?.status === "trial" && trialDays > 0 && (
        <div className="rounded-xl border p-6" style={{ backgroundColor: "#e6faf9", borderColor: "#36d1cf" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#36d1cf" }}>
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Free Trial Active</h3>
                <p className="text-sm" style={{ color: "#239999" }}>{trialDays} days remaining</p>
              </div>
            </div>
            <button onClick={() => { const basic = plans.find(p => p.slug === "basic"); if (basic) setSelectedPlan(basic.id); }} className="px-4 py-2 text-white font-medium rounded-lg" style={{ backgroundColor: "#36d1cf" }}>
              Choose Plan
            </button>
          </div>
        </div>
      )}

      {(subscription?.status === "expired" || (subscription?.status === "trial" && trialDays <= 0)) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Subscription Expired</h3>
                <p className="text-sm text-red-600">Please choose a plan to continue using DocFind</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {subscription?.status === "grace" && graceDays > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Payment Failed</h3>
                <p className="text-sm text-yellow-700">{graceDays} days to update payment method</p>
              </div>
            </div>
            <button onClick={() => { const current = plans.find(p => p.id === subscription.plan_id); if (current) setSelectedPlan(current.id); }} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg">
              Update Payment
            </button>
          </div>
        </div>
      )}

      {!subscription && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
              <Zap className="w-8 h-8" style={{ color: "#36d1cf" }} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Your Free Trial</h3>
            <p className="text-gray-600 mb-6">Try all features free for 14 days. No credit card required.</p>
            <button onClick={startTrial} disabled={saving} className="px-6 py-3 text-white font-medium rounded-lg disabled:opacity-50" style={{ backgroundColor: "#36d1cf" }}>
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Start Free Trial"}
            </button>
          </div>
        </div>
      )}

      {subscription?.status === "active" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
              <p className="text-gray-600">{plan?.name || "Unknown Plan"}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: "#e6faf9", color: "#239999" }}>
              Active
            </span>
          </div>
          {subscription.current_period_end && (
            <p className="text-sm text-gray-500 mb-4">
              Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={handleCancel} disabled={saving} className="px-4 py-2 text-red-600 hover:bg-red-50 font-medium rounded-lg border border-red-200">
              Cancel Subscription
            </button>
          </div>
        </div>
      )}

      {featuredListing?.status === "active" && featuredListing.expires_at && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#36d1cf" }}>
                <Star className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Featured Listing Active</h3>
                <p className="text-sm text-gray-500">Expires: {new Date(featuredListing.expires_at).toLocaleDateString()}</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-sm font-medium text-white" style={{ backgroundColor: "#36d1cf" }}>
              <Star className="w-3 h-3 inline fill-current mr-1" />Featured
            </span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Available Plans</h3>
          <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
            <button onClick={() => setBillingCycle("monthly")} className={`px-3 py-1.5 rounded-md text-sm font-medium ${billingCycle === "monthly" ? "bg-white shadow-sm" : "text-gray-600"}`}>Monthly</button>
            <button onClick={() => setBillingCycle("yearly")} className={`px-3 py-1.5 rounded-md text-sm font-medium ${billingCycle === "yearly" ? "bg-white shadow-sm" : "text-gray-600"}`}>Yearly</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.filter((p) => p.slug !== "trial").map((p) => {
            const price = billingCycle === "monthly" ? p.price_monthly : p.price_yearly;
            const isCurrentPlan = subscription?.plan_id === p.id;
            const isPro = p.slug === "pro";
            const isFeatured = p.slug === "featured";

            return (
              <div
                key={p.id}
                className={`rounded-xl border p-4 cursor-pointer transition-all ${selectedPlan === p.id ? "ring-2" : "hover:border-gray-300"}`}
                style={selectedPlan === p.id ? { borderColor: "#36d1cf", "--tw-ring-color": "#36d1cf" } as React.CSSProperties : {}}
                onClick={() => setSelectedPlan(p.id)}
              >
                {isFeatured && (
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-4 h-4" style={{ color: "#36d1cf" }} />
                    <span className="text-xs font-medium" style={{ color: "#36d1cf" }}>Add-on</span>
                  </div>
                )}
                <h4 className="font-semibold text-gray-900">{p.name}</h4>
                <p className="text-2xl font-bold mt-2">${price.toFixed(2)}<span className="text-sm font-normal text-gray-500">/{billingCycle === "monthly" ? "mo" : "yr"}</span></p>
                {isCurrentPlan && subscription?.status === "active" && (
                  <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full text-white" style={{ backgroundColor: "#36d1cf" }}>Current</span>
                )}
              </div>
            );
          })}
        </div>

        {selectedPlan && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Selected: {plan?.name}</p>
                <p className="text-lg font-semibold text-gray-900">
                  ${(billingCycle === "monthly" ? (plan?.price_monthly || 0) : (plan?.price_yearly || 0)).toFixed(2)}/{billingCycle === "monthly" ? "month" : "year"}
                </p>
              </div>
              <button onClick={() => handleSubscribe(selectedPlan)} disabled={saving} className="px-6 py-3 text-white font-medium rounded-lg disabled:opacity-50 flex items-center gap-2" style={{ backgroundColor: "#36d1cf" }}>
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                Subscribe
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DoctorBillingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} /></div>}>
      <DoctorBillingContent />
    </Suspense>
  );
}
