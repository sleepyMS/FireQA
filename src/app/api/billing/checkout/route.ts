import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { requireRole } from "@/lib/auth/require-role";
import { UserRole } from "@/types/enums";
import { stripe, STRIPE_PRICE_IDS } from "@/lib/billing/stripe";
import { prisma } from "@/lib/db";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "api/billing/checkout" });

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const roleErr = requireRole(user.role, UserRole.ADMIN);
    if (roleErr) {
      return NextResponse.json({ error: roleErr.error }, { status: roleErr.status });
    }

    if (!stripe) {
      return NextResponse.json(
        { error: "결제 기능이 아직 활성화되지 않았습니다." },
        { status: 503 }
      );
    }

    const { priceId, successUrl, cancelUrl } = (await request.json()) as {
      priceId?: string;
      successUrl: string;
      cancelUrl: string;
    };

    const resolvedPriceId = priceId || STRIPE_PRICE_IDS.pro_monthly;
    if (!resolvedPriceId) {
      return NextResponse.json({ error: "플랜 가격 정보가 없습니다." }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        id: true,
        subscription: { select: { stripeCustomerId: true } },
      },
    });

    if (!org) {
      return NextResponse.json({ error: "조직을 찾을 수 없습니다." }, { status: 404 });
    }

    let customerId = org.subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { organizationId: org.id },
      });
      customerId = customer.id;

      await prisma.subscription.upsert({
        where: { organizationId: org.id },
        create: { organizationId: org.id, stripeCustomerId: customerId },
        update: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: resolvedPriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { organizationId: org.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logger.error("결제 세션 생성 오류", { error });
    return NextResponse.json({ error: "결제 세션 생성에 실패했습니다." }, { status: 500 });
  }
}
