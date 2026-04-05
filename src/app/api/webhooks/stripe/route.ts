import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/billing/stripe";
import { prisma } from "@/lib/db";
import { invalidateOrgPlanCache } from "@/lib/billing/get-org-plan";
import type Stripe from "stripe";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "api/webhooks/stripe" });

// Stripe 웹훅은 raw body가 필요하므로 Next.js 파싱 비활성화
export const runtime = "nodejs";

async function handleSubscriptionUpsert(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata?.organizationId;
  if (!organizationId) return;

  const priceId = subscription.items.data[0]?.price.id ?? null;
  const plan = subscription.metadata?.plan ?? "pro";
  // Stripe v2025+: period dates tracked via invoice events, not subscription object
  const periodEnd = subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null;

  await prisma.subscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      plan,
      status: subscription.status,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      plan,
      status: subscription.status,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  await prisma.organization.update({
    where: { id: organizationId },
    data: { plan },
  });
  invalidateOrgPlanCache(organizationId);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata?.organizationId;
  if (!organizationId) return;

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: "canceled", plan: "free" },
  });

  await prisma.organization.update({
    where: { id: organizationId },
    data: { plan: "free" },
  });
  invalidateOrgPlanCache(organizationId);
}

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "결제 기능이 아직 활성화되지 않았습니다." },
      { status: 503 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "웹훅 시크릿이 설정되지 않았습니다." }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "서명이 없습니다." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "웹훅 서명 검증 실패" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.type === "credit_purchase") {
          const orgId = session.metadata.organizationId;
          const credits = parseInt(session.metadata.credits ?? "0", 10);
          if (orgId && credits > 0) {
            const { addCredits } = await import("@/lib/billing/credits");
            await addCredits(orgId, credits, {
              type: "purchase",
              description: `${credits} 크레딧 구매`,
            });
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    logger.error("웹훅 처리 오류", { eventType: event.type, error });
    return NextResponse.json({ error: "웹훅 처리에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
