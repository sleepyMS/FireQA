import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Terminal,
  PackageCheck,
  KeyRound,
  Figma,
  PlayCircle,
  Wand2,
  ArrowLeft,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
          {/* 번호 배지 */}
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
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            에이전트 시작 가이드
          </h2>
          <p className="text-muted-foreground">
            fireqa-agent CLI를 로컬 머신에 설치하고 Claude Code와 연결하세요.
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

      {/* 단계별 가이드 */}
      <div className="space-y-4">
        {/* Step 1 */}
        <StepCard step={1} icon={PackageCheck} title="사전 준비">
          <p>다음 항목을 미리 준비하세요.</p>
          <div className="space-y-2">
            <p className="font-medium text-foreground">
              Claude Code 설치
            </p>
            <CodeBlock>npm install -g @anthropic-ai/claude-code</CodeBlock>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">
              Anthropic API Key 발급
            </p>
            <p>
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                console.anthropic.com
              </a>
              에서 API Key를 발급받으세요.
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground flex items-center gap-1.5">
              Figma MCP 설정{" "}
              <Badge variant="outline" className="text-xs">
                선택
              </Badge>
            </p>
            <p>
              Figma에 직접 다이어그램/와이어프레임을 생성하려면 Figma MCP도
              설치하세요.
            </p>
            <CodeBlock>
              {`claude mcp add figma --transport sse --url https://figma.com/api/mcp`}
            </CodeBlock>
          </div>
        </StepCard>

        {/* Step 2 */}
        <StepCard step={2} icon={Figma} title="Figma MCP 설정 (선택)">
          <p>
            Figma에 직접 다이어그램이나 와이어프레임을 생성하고 싶을 때
            설정합니다. TC 생성만 필요하다면 건너뛰어도 됩니다.
          </p>
          <CodeBlock>
            {`claude mcp add figma --transport sse --url <figma-mcp-url>`}
          </CodeBlock>
          <p className="text-xs text-muted-foreground">
            Figma MCP URL은 Figma Developer 설정 페이지에서 확인할 수 있습니다.
          </p>
        </StepCard>

        {/* Step 3 */}
        <StepCard step={3} icon={KeyRound} title="fireqa-agent 설치 및 로그인">
          <p>
            fireqa-agent CLI를 통해 FireQA 계정에 로그인합니다. 두 가지 방법
            중 하나를 선택하세요.
          </p>
          <div className="space-y-2">
            <p className="font-medium text-foreground">
              방법 A — OAuth 브라우저 인증
            </p>
            <CodeBlock>npx fireqa-agent login</CodeBlock>
            <p>브라우저가 열리면 FireQA 계정으로 로그인하세요.</p>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">
              방법 B — API 키 인증
            </p>
            <CodeBlock>npx fireqa-agent login --api-key</CodeBlock>
            <p>
              API 키는{" "}
              <Link
                href={`/${orgSlug}/settings`}
                className="text-primary underline underline-offset-2"
              >
                설정 &gt; API 키
              </Link>{" "}
              탭에서 발급받을 수 있습니다.
            </p>
          </div>
        </StepCard>

        {/* Step 4 */}
        <StepCard step={4} icon={PlayCircle} title="에이전트 시작">
          <p>로그인 후 아래 명령으로 에이전트를 시작합니다.</p>
          <CodeBlock>npx fireqa-agent start</CodeBlock>
          <p>
            에이전트가 정상적으로 연결되면{" "}
            <Link
              href={`/${orgSlug}/agent`}
              className="text-primary underline underline-offset-2"
            >
              에이전트 대시보드
            </Link>
            에 온라인 상태로 표시됩니다.
          </p>
        </StepCard>

        {/* Step 5 */}
        <StepCard step={5} icon={Wand2} title="작업 실행">
          <p>에이전트가 연결된 후 다양한 작업을 실행할 수 있습니다.</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              기획서 업로드 페이지에서{" "}
              <span className="font-medium text-foreground">
                에이전트 모드
              </span>{" "}
              토글을 활성화하세요.
            </li>
            <li>
              TC 생성, FigJam 다이어그램, 와이어프레임 등을 자동으로 생성합니다.
            </li>
            <li>
              생성된 작업은{" "}
              <Link
                href={`/${orgSlug}/agent`}
                className="text-primary underline underline-offset-2"
              >
                에이전트 대시보드
              </Link>
              에서 확인할 수 있습니다.
            </li>
          </ul>
        </StepCard>
      </div>

      {/* 하단 링크 */}
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
