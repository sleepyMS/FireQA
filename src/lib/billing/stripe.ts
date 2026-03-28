import Stripe from "stripe";

// Stripe 클라이언트 — STRIPE_SECRET_KEY 미설정 시 null (구조만 구현, 실 키 없이도 빌드 가능)
function createStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith("sk-placeholder")) return null;
  return new Stripe(key);
}

export const stripe = createStripeClient();

export const STRIPE_PRICE_IDS = {
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? "",
  pro_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID ?? "",
} as const;
