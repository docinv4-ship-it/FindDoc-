import type { BillingProvider, CheckoutParams, CheckoutSession, SubscriptionInfo, WebhookEvent } from './index';

const PADDLE_VENDOR_ID = process.env.PADDLE_VENDOR_ID || '';
const PADDLE_VENDOR_AUTH_CODE = process.env.PADDLE_VENDOR_AUTH_CODE || '';
const PADDLE_PUBLIC_KEY = process.env.PADDLE_PUBLIC_KEY || '';

const PLAN_TO_PADDLE_ID: Record<string, Record<'monthly' | 'yearly', string>> = {
  basic: {
    monthly: process.env.PADDLE_PLAN_BASIC_MONTHLY || '',
    yearly: process.env.PADDLE_PLAN_BASIC_YEARLY || '',
  },
  pro: {
    monthly: process.env.PADDLE_PLAN_PRO_MONTHLY || '',
    yearly: process.env.PADDLE_PLAN_PRO_YEARLY || '',
  },
  featured: {
    monthly: process.env.PADDLE_PLAN_FEATURED_MONTHLY || '',
    yearly: process.env.PADDLE_PLAN_FEATURED_YEARLY || '',
  },
};

export class PaddleBillingProvider implements BillingProvider {
  name = 'paddle';

  async createCheckout(params: CheckoutParams): Promise<CheckoutSession> {
    const { planId, doctorId, successUrl, cancelUrl, billingCycle, planSlug } = await this.resolvePlanInfo(params);

    const paddlePlanId = PLAN_TO_PADDLE_ID[planSlug]?.[billingCycle];
    if (!paddlePlanId) {
      return this.createMockCheckoutSession(params, planId);
    }

    try {
      const response = await fetch('https://vendors.paddle.com/api/2.0/product/generate_pay_link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          vendor_id: PADDLE_VENDOR_ID,
          vendor_auth_code: PADDLE_VENDOR_AUTH_CODE,
          product_id: paddlePlanId,
          passthrough: JSON.stringify({ doctorId, planId, billingCycle }),
          success_url: successUrl,
          cancel_url: cancelUrl,
        }).toString(),
      });

      const data = await response.json();
      if (data.success && data.response?.url) {
        return {
          id: `paddle_${Date.now()}`,
          url: data.response.url,
          provider: 'paddle',
        };
      }
    } catch (error) {
      console.error('Paddle checkout error:', error);
    }

    return this.createMockCheckoutSession(params, planId);
  }

  private async resolvePlanInfo(params: CheckoutParams): Promise<{
    planId: string;
    doctorId: string;
    successUrl: string;
    cancelUrl: string;
    billingCycle: 'monthly' | 'yearly';
    planSlug: string;
  }> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/subscription_plans?id=eq.${params.planId}&select=slug`, {
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
          },
        });
        const plans = await response.json();
        const planSlug = plans[0]?.slug || 'basic';
        return { ...params, planSlug };
      } catch {}
    }

    return { ...params, planSlug: 'basic' };
  }

  private createMockCheckoutSession(params: CheckoutParams, planId: string): CheckoutSession {
    const checkoutId = `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      id: checkoutId,
      url: `/doctor/billing/complete?checkout_id=${checkoutId}&plan_id=${planId}&cycle=${params.billingCycle}`,
      provider: 'mock',
    };
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null> {
    if (subscriptionId.startsWith('sub_')) {
      return {
        id: subscriptionId,
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        planId: null,
        provider: 'paddle',
      };
    }
    return null;
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    console.log(`Canceling subscription: ${subscriptionId}`);
  }

  async handleWebhook(payload: string, signature: string): Promise<WebhookEvent> {
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(payload);
    } catch {
      data = { raw: payload };
    }

    const eventType = (data.alert_name as string) || 'unknown';
    const subscriptionId = (data.subscription_id as string) || `sub_${Date.now()}`;
    const customerId = (data.user_id as string) || '';
    const planId = (data.product_id as string) || null;

    return {
      type: eventType,
      subscriptionId: String(subscriptionId),
      customerId: String(customerId),
      planId: planId ? String(planId) : null,
      data,
    };
  }
}

export function getPaddlePublicKey(): string {
  return PADDLE_PUBLIC_KEY;
}
