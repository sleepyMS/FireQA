import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { requireRole } from "@/lib/auth/require-role";
import { UserRole } from "@/types/enums";
import { stripe } from "@/lib/billing/stripe";
import { prisma } from "@/lib/db";

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

    const { returnUrl } = (await request.json()) as { returnUrl: string };

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: user.organizationId },
    });

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json({ error: "활성 구독이 없습니다." }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("포털 세션 생성 오류:", error);
    return NextResponse.json({ error: "포털 세션 생성에 실패했습니다." }, { status: 500 });
  }
}
