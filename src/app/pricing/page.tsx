"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Check, Loader2, Star, Stethoscope, ArrowRight } from "lucide-react";
import type { Database } from "@/types/database";

type SubscriptionPlan = Database["public"]["Tables"]["subscription_plans"]["Row"];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<"doctor" | "patient" | null>(null);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user.id).single();
        if (doctor) setUserType("doctor");
        else setUserType("patient");
      }
      const { data: planData } = await supabase.from("subscription_plans").select("*").eq("is_active", true).order("display_order");
      if (planData) setPlans(planData);
      setLoading(false);
    };
    init();
  }, [supabase]);

  const getPrice = (plan: SubscriptionPlan) => {
    if (billingCycle === "monthly") return plan.price_monthly;
    return plan.price_yearly;
  };

  const getSavings = (plan: SubscriptionPlan) => {
    if (plan.price_monthly === 0) return 0;
    const monthlyCost = plan.price_monthly * 12;
    const yearlyCost = plan.price_yearly;
    return Math.round(((monthlyCost - yearlyCost) / monthlyCost) * 100);
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (plan.slug === "trial") {
      router.push("/doctor/signup");
    } else if (userType === "doctor") {
      router.push(`/doctor/billing?plan=${plan.slug}&cycle=${billingCycle}`);
    } else {
      router.push("/doctor/signup");
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  }

  const displayPlans = plans.filter(p => p.slug !== "trial");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button onClick={() => router.push("/")} className="flex items-center gap-2">
              <Stethoscope className="w-8 h-8" style={{ color: "#36d1cf" }} />
              <span className="text-xl font-bold text-gray-900">DocFind</span>
            </button>
            <nav className="flex items-center gap-6">
              <button onClick={() => router.push("/about")} className="text-sm text-gray-600 hover:text-gray-900">About</button>
              <button onClick={() => router.push("/contact")} className="text-sm text-gray-600 hover:text-gray-900">Contact</button>
              <button onClick={() => router.push("/patient")} className="text-sm font-medium" style={{ color: "#36d1cf" }}>Find Doctors</button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600 mb-8">Start your 14-day free trial. No credit card required.</p>

          <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${billingCycle === "monthly" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${billingCycle === "yearly" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}`}
            >
              Yearly
              <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full" style={{ backgroundColor: "#e6faf9", color: "#239999" }}>Save 17%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {displayPlans.map((plan, index) => {
            const isPro = plan.slug === "pro";
            const isFeatured = plan.slug === "featured";
            const price = getPrice(plan);
            const savings = getSavings(plan);

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border ${isPro ? "border-2" : "border-gray-200"} overflow-hidden`}
                style={isPro ? { borderColor: "#36d1cf" } : undefined}
              >
                {isPro && (
                  <div className="absolute top-0 left-0 right-0 text-center py-2 text-sm font-medium text-white" style={{ backgroundColor: "#36d1cf" }}>
                    Recommended
                  </div>
                )}

                <div className={`p-8 ${isPro ? "pt-14" : ""}`}>
                  {isFeatured && (
                    <div className="flex items-center gap-2 mb-4">
                      <Star className="w-5 h-5" style={{ color: "#36d1cf" }} />
                      <span className="text-sm font-medium" style={{ color: "#36d1cf" }}>Add-on</span>
                    </div>
                  )}

                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h2>
                  <p className="text-gray-600 text-sm mb-6">{plan.description}</p>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-gray-900">${price.toFixed(2)}</span>
                      <span className="text-gray-500">/{billingCycle === "monthly" ? "mo" : "yr"}</span>
                    </div>
                    {billingCycle === "yearly" && savings > 0 && (
                      <p className="text-sm mt-1" style={{ color: "#239999" }}>Save {savings}% with yearly billing</p>
                    )}
                  </div>

                  <button
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${isPro ? "text-white" : "bg-gray-100 text-gray-900 hover:bg-gray-200"}`}
                    style={isPro ? { backgroundColor: "#36d1cf" } : undefined}
                  >
                    {plan.slug === "trial" ? "Start Free Trial" : "Get Started"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="border-t border-gray-100 p-8">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">What's included:</h3>
                  <ul className="space-y-3">
                    {(plan.features as string[]).map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#e6faf9" }}>
                          <Check className="w-3 h-3" style={{ color: "#239999" }} />
                        </div>
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        <div className="max-w-3xl mx-auto mt-16 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">All plans include a 14-day free trial</h3>
          <p className="text-gray-600 mb-8">Try every feature risk-free. Cancel anytime during trial with no charge.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h4 className="font-semibold text-gray-900 mb-2">No Setup Fees</h4>
              <p className="text-sm text-gray-600">Start using DocFind immediately. No hidden costs or service charges.</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h4 className="font-semibold text-gray-900 mb-2">Cancel Anytime</h4>
              <p className="text-sm text-gray-600">No long-term contracts. Cancel your subscription anytime from your dashboard.</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h4 className="font-semibold text-gray-900 mb-2">Secure Payments</h4>
              <p className="text-sm text-gray-600">All payments processed securely through industry-leading providers.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <button onClick={() => router.push("/privacy")} className="hover:text-gray-900">Privacy Policy</button>
              <button onClick={() => router.push("/terms")} className="hover:text-gray-900">Terms of Service</button>
              <button onClick={() => router.push("/refund")} className="hover:text-gray-900">Refund Policy</button>
              <button onClick={() => router.push("/faq")} className="hover:text-gray-900">FAQ</button>
            </div>
            <p className="text-sm text-gray-500">© 2024 DocFind. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
