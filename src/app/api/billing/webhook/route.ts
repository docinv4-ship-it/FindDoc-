import { NextRequest, NextResponse } from 'next/server';
import { processWebhookEvent, BILLING_PROVIDER } from '@/lib/billing';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('x-paddle-signature') || request.headers.get('x-signature') || '';

    const event = await processWebhookEvent(payload, signature);

    const headers: HeadersInit = {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };

    if (event.type === 'subscription_created' || event.type === 'subscription_payment_succeeded') {
      const passthrough = event.data.passthrough ? JSON.parse(event.data.passthrough as string) : {};
      const doctorId = passthrough.doctorId;
      const planId = passthrough.planId || event.planId;
      const billingCycle = passthrough.billingCycle || 'monthly';

      if (doctorId) {
        const now = new Date();
        const periodEnd = new Date(now.getTime() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);

        const subData = {
          doctor_id: doctorId,
          plan_id: planId,
          status: 'active',
          billing_cycle: billingCycle,
          external_subscription_id: event.subscriptionId,
          external_customer_id: event.customerId,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          trial_started_at: null,
          trial_ends_at: null,
          updated_at: now.toISOString(),
        };

        await fetch(`${SUPABASE_URL}/rest/v1/doctor_subscriptions?doctor_id=eq.${doctorId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(subData),
        });

        const { data: planData } = await fetch(`${SUPABASE_URL}/rest/v1/subscription_plans?id=eq.${planId}&select=slug`, {
          headers,
        }).then(r => r.json());

        if (planData?.[0]?.slug === 'featured') {
          const featuredEnd = new Date(now.getTime() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);
          await fetch(`${SUPABASE_URL}/rest/v1/featured_listings?doctor_id=eq.${doctorId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              status: 'active',
              started_at: now.toISOString(),
              expires_at: featuredEnd.toISOString(),
              updated_at: now.toISOString(),
            }),
          });
        }
      }
    }

    if (event.type === 'subscription_cancelled' || event.type === 'subscription_expired') {
      const { data: subscriptions } = await fetch(
        `${SUPABASE_URL}/rest/v1/doctor_subscriptions?external_subscription_id=eq.${event.subscriptionId}&select=id,doctor_id`,
        { headers }
      ).then(r => r.json());

      if (subscriptions?.[0]) {
        const sub = subscriptions[0];
        await fetch(`${SUPABASE_URL}/rest/v1/doctor_subscriptions?id=eq.${sub.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });

        await fetch(`${SUPABASE_URL}/rest/v1/featured_listings?doctor_id=eq.${sub.doctor_id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            status: 'inactive',
            updated_at: new Date().toISOString(),
          }),
        });
      }
    }

    if (event.type === 'subscription_payment_failed') {
      const { data: subscriptions } = await fetch(
        `${SUPABASE_URL}/rest/v1/doctor_subscriptions?external_subscription_id=eq.${event.subscriptionId}&select=id`,
        { headers }
      ).then(r => r.json());

      if (subscriptions?.[0]) {
        const graceEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await fetch(`${SUPABASE_URL}/rest/v1/doctor_subscriptions?id=eq.${subscriptions[0].id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            status: 'grace',
            grace_period_ends_at: graceEnd.toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
      }
    }

    await fetch(`${SUPABASE_URL}/rest/v1/billing_events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event_type: event.type,
        external_event_id: event.subscriptionId,
        provider: BILLING_PROVIDER || 'paddle',
        payload: event.data,
        processed_at: new Date().toISOString(),
      }),
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
