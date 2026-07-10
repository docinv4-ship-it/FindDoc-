export interface CheckoutParams {
  planId: string;
  doctorId: string;
  successUrl: string;
  cancelUrl: string;
  billingCycle: 'monthly' | 'yearly';
}

export interface CheckoutSession {
  id: string;
  url: string;
  provider: string;
}

export interface SubscriptionInfo {
  id: string;
  status: 'trial' | 'active' | 'past_due' | 'grace' | 'cancelled' | 'expired';
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  planId: string | null;
  provider: string;
}

export interface WebhookEvent {
  type: string;
  subscriptionId: string;
  customerId: string;
  planId: string | null;
  data: Record<string, unknown>;
}

export interface BillingProvider {
  name: string;
  createCheckout(params: CheckoutParams): Promise<CheckoutSession>;
  getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  handleWebhook(payload: string, signature: string): Promise<WebhookEvent>;
}

let provider: BillingProvider | null = null;

export const BILLING_PROVIDER = process.env.BILLING_PROVIDER || 'paddle';

export function getBillingProvider(): BillingProvider {
  if (provider) return provider;
  const activeProvider = process.env.BILLING_PROVIDER || 'paddle';
  if (activeProvider === 'paddle') {
    const { PaddleBillingProvider } = require('./paddle');
    provider = new PaddleBillingProvider();
  } else {
    throw new Error(`Unknown billing provider: ${activeProvider}`);
  }
  return provider!;
}

export async function createCheckoutSession(params: CheckoutParams): Promise<CheckoutSession> {
  return getBillingProvider().createCheckout(params);
}

export async function getSubscriptionDetails(subscriptionId: string): Promise<SubscriptionInfo | null> {
  return getBillingProvider().getSubscription(subscriptionId);
}

export async function cancelBillingSubscription(subscriptionId: string): Promise<void> {
  return getBillingProvider().cancelSubscription(subscriptionId);
}

export async function processWebhookEvent(payload: string, signature: string): Promise<WebhookEvent> {
  return getBillingProvider().handleWebhook(payload, signature);
}

export const PLAN_LIMITS = {
  trial: { doctors: 1, clinics: 1, patients: -1 },
  basic: { doctors: 1, clinics: 1, patients: -1 },
  pro: { doctors: 5, clinics: 3, patients: -1 },
  featured: { doctors: -1, clinics: -1, patients: -1 },
} as const;

export const PRO_FEATURES = ['medical_records', 'prescriptions', 'qr_checkin', 'pwa', 'sms_reminders', 'custom_branding'];

export function canAccessFeature(planSlug: string, feature: string): boolean {
  if (planSlug === 'trial') return true;
  if (planSlug === 'pro') return true;
  if (PRO_FEATURES.includes(feature)) return planSlug === 'pro';
  return true;
}

export function getPlanLimit(planSlug: string, limitType: 'doctors' | 'clinics' | 'patients'): number {
  const limits = PLAN_LIMITS[planSlug as keyof typeof PLAN_LIMITS];
  if (!limits) return 0;
  return limits[limitType];
}
