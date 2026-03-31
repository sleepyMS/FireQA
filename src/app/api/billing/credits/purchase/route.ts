import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { stripe } from "@/lib/billing/stripe";

// POST — 크레딧 팩 구매 (Stripe Checkout Session 생성)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json(
        { error: "결제 기능이 아직 활성화되지 않았습니다." },
        { status: 503 },
      );
    }

    const body = await request.json();
    const { packageId } = body as { packageId?: string };

    if (!packageId) {
      return NextResponse.json({ error: "패키지 ID는 필수입니다." }, { status: 400 });
    }

    const creditPackage = await prisma.creditPackage.findUnique({
      where: { id: packageId },
    });

    if (!creditPackage || !creditPackage.isActive) {
      return NextResponse.json(
        { error: "유효하지 않은 크레딧 패키지입니다." },
        { status: 404 },
      );
    }

    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: creditPackage.stripePriceId, quantity: 1 }],
      metadata: {
        type: "credit_purchase",
        organizationId: user.organizationId,
        packageId: creditPackage.id,
        credits: String(creditPackage.credits),
      },
      success_url: `${origin}/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("크레딧 구매 세션 생성 오류:", error);
    return NextResponse.json({ error: "결제 세션 생성에 실패했습니다." }, { status: 500 });
  }
}
