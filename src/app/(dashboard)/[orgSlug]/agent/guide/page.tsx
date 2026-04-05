import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Terminal,
  PackageCheck,
  Figma,
  Wand2,
  ArrowLeft,
} from "lucide-react";
import { CliSelector } from "./cli-selector";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="rounded-md bg-zinc-900 p-3 text-sm font-mono text-zinc-100 overflow-x-auto">
      {children}
    </pre>
  );
}

function StepCard({
  step,
  icon: Icon,
  title,
  children,
}: {
  step: number;
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-base">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {step}
          </span>
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}

export default async function AgentGuidePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/onboarding");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">에이전트 시작 가이드</h2>
          <p className="text-muted-foreground">
            fireqa-agent CLI를 설치하고 사용 중인 AI CLI와 연결하세요. API 키 없이 본인 계정으로 동작합니다.
          </p>
        </div>
        <Link
          href={`/${orgSlug}/agent`}
          className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          에이전트 대시보드
        </Link>
      </div>

      <div className="space-y-4">
        {/* Step 1 */}
        <StepCard step={1} icon={PackageCheck} title="CLI 설치 · 로그인 · 에이전트 시작">
          <p>사용할 AI CLI를 선택하세요. API 키 없이 본인 계정으로 동작합니다.</p>
          <CliSelector />
          <p>
            에이전트가 정상적으로 연결되면{" "}
            <Link href={`/${orgSlug}/agent`} className="text-primary underline underline-offset-2">
              에이전트 대시보드
            </Link>
            에 온라인 상태로 표시됩니다.
          </p>
        </StepCard>

        {/* Step 2 */}
        <StepCard step={2} icon={Figma} title="Figma MCP 설정 (선택)">
          <p>
            Figma에 직접 다이어그램이나 와이어프레임을 생성하고 싶을 때만 설정합니다.
            TC 생성만 필요하다면 건너뛰어도 됩니다.
          </p>
          <CodeBlock>{`claude mcp add figma --transport sse --url <figma-mcp-url>`}</CodeBlock>
          <p className="text-xs">Figma MCP URL은 Figma Developer 설정 페이지에서 확인할 수 있습니다.</p>
        </StepCard>

        {/* Step 3 */}
        <StepCard step={3} icon={Wand2} title="작업 실행">
          <p>에이전트가 연결된 후 생성 페이지에서 실행 방식을 선택하세요.</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              TC 생성, 다이어그램, 와이어프레임, 기획서 개선 페이지에서{" "}
              <span className="font-medium text-foreground">실행 방식 → 내 에이전트</span>를 선택하세요.
            </li>
            <li>생성된 작업은{" "}
              <Link href={`/${orgSlug}/agent`} className="text-primary underline underline-offset-2">
                에이전트 대시보드
              </Link>
              에서 확인할 수 있습니다.
            </li>
          </ul>
        </StepCard>
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <Link
          href={`/${orgSlug}/agent`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          에이전트 대시보드
        </Link>
        <Link
          href={`/${orgSlug}/guide`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Terminal className="h-4 w-4" />
          전체 사용 가이드
        </Link>
      </div>
    </div>
  );
}
