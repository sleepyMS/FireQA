import {
  FileText,
  Upload,
  Sparkles,
  Download,
  GitBranch,
  Puzzle,
  Key,
  FolderOpen,
  CheckCircle2,
  Info,
  MonitorSmartphone,
  LayoutTemplate,
  ShieldAlert,
  MessageSquarePlus,
  Columns3,
  Wand2,
  Pencil,
  Trash2,
  Clock,
  Smartphone,
  History,
  AlertTriangle,
  ExternalLink,
  Clipboard,
  Archive,
  BarChart2,
  Bell,
  Users,
  Settings,
  FileEdit,
  ArrowRight,
  MousePointerClick,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {step}
        </div>
        <div className="mt-2 w-px flex-1 bg-border" />
      </div>
      <div className="pb-8">
        <div className="mb-2 flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <div className="text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 pt-6">
        <div className={`rounded-lg p-2.5 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {/* Hero */}
      <div className="space-y-3">
        <h2 className="text-3xl font-bold tracking-tight">FireQA 사용 가이드</h2>
        <p className="text-lg text-muted-foreground">
          기획 문서 하나로 QA 테스트케이스, 다이어그램, 와이어프레임을 자동으로 생성하세요.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="secondary">AI 기반 TC 자동 생성</Badge>
          <Badge variant="secondary">템플릿 시스템</Badge>
          <Badge variant="secondary">Excel 내보내기</Badge>
          <Badge variant="secondary">Mermaid 다이어그램</Badge>
          <Badge variant="secondary">FigJam 원클릭 연동</Badge>
          <Badge variant="secondary">Figma 와이어프레임</Badge>
          <Badge variant="secondary">기획서 AI 개선</Badge>
          <Badge variant="secondary">다이어그램 버전 관리</Badge>
        </div>
      </div>

      <Separator />

      {/* Overview */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">주요 기능</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard
            icon={FileText}
            title="QA 테스트케이스 자동 생성"
            description="기획 문서를 업로드하면 AI가 분석하여 TC ID, 사전조건, 테스트 절차, 기대결과를 포함한 체계적인 테스트케이스를 자동으로 생성합니다."
            color="bg-blue-100 text-blue-600"
          />
          <FeatureCard
            icon={LayoutTemplate}
            title="템플릿 시스템"
            description="시트 구성, 컬럼, 제약조건, 요구사항을 정의한 템플릿으로 AI 생성 결과를 원하는 형식에 맞출 수 있습니다."
            color="bg-indigo-100 text-indigo-600"
          />
          <FeatureCard
            icon={GitBranch}
            title="다이어그램 생성 + FigJam 원클릭 연동"
            description="기획 문서에서 사용자 플로우, 상태 다이어그램을 생성합니다. 결과 페이지에서 'FigJam에서 열기'를 클릭하면 플러그인이 자동으로 해당 작업을 가져옵니다."
            color="bg-purple-100 text-purple-600"
          />
          <FeatureCard
            icon={Smartphone}
            title="와이어프레임 생성"
            description="기획 문서에서 각 화면의 UI 구성 요소를 추출하여 Figma에서 Lo-fi 와이어프레임과 화면 흐름도를 자동으로 생성합니다."
            color="bg-pink-100 text-pink-600"
          />
          <FeatureCard
            icon={FileEdit}
            title="기획서 AI 개선"
            description="기획 문서를 업로드하면 AI가 모범 구조로 재작성합니다. 누락된 엣지 케이스, 명확하지 않은 흐름을 보완합니다."
            color="bg-emerald-100 text-emerald-600"
          />
          <FeatureCard
            icon={FolderOpen}
            title="프로젝트 관리"
            description="생성 작업을 프로젝트별로 분류합니다. 활성/보관/삭제 상태를 지원하며, 프로젝트 카드를 클릭하면 바로 이동합니다."
            color="bg-orange-100 text-orange-600"
          />
          <FeatureCard
            icon={Clock}
            title="이력 관리"
            description="모든 생성 이력(TC, 다이어그램, 와이어프레임, 기획서 개선)을 확인하고, 프로젝트명 수정이나 삭제를 할 수 있습니다."
            color="bg-gray-100 text-gray-600"
          />
          <FeatureCard
            icon={BarChart2}
            title="분석 & 활동 로그"
            description="조직의 생성 활동, 토큰 사용량, 프로젝트별 통계를 확인합니다."
            color="bg-cyan-100 text-cyan-600"
          />
        </div>
      </section>

      <Separator />

      {/* Plugin Token Setup */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Figma 플러그인 연동 설정</h2>
        <p className="text-sm text-muted-foreground">
          FigJam·Figma 플러그인을 처음 사용한다면 아래 단계로 연동하세요.
          토큰 방식이므로 브라우저 인증 없이 빠르게 연결됩니다.
        </p>
        <Card className="border-purple-200 bg-purple-50/40">
          <CardContent className="space-y-5 pt-6">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">1</div>
              <div>
                <p className="text-sm font-medium text-foreground">설정 → Figma 플러그인 연동에서 토큰 발급</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  사이드바 <span className="font-medium text-foreground">설정</span> →{" "}
                  <span className="font-medium text-foreground">Figma 플러그인 연동</span> 섹션에서
                  <span className="font-medium text-foreground"> 토큰 발급하기</span>를 클릭하세요.
                  생성된 토큰을 복사합니다 (한 번만 표시됩니다).
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">2</div>
              <div>
                <p className="text-sm font-medium text-foreground">플러그인 설치 (최초 1회)</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Figma 데스크톱 앱 필요.{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    Plugins › Development › Import plugin from manifest
                  </code>
                  에서{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    figma-plugin/manifest.json
                  </code>
                  을 선택합니다.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">3</div>
              <div>
                <p className="text-sm font-medium text-foreground">플러그인에서 토큰으로 연결</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  FigJam 파일에서 FireQA 플러그인을 실행합니다.
                  인증 화면에서 <span className="font-medium text-foreground">토큰으로 연결하기</span>
                  필드에 복사한 토큰을 붙여넣고 연결합니다.
                  이후 다시 연결할 필요 없이 자동으로 로그인 상태가 유지됩니다.
                </p>
              </div>
            </div>
            <div className="rounded-md bg-white p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">참고</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li>다이어그램은 <strong>FigJam 파일</strong>에서, 와이어프레임은 <strong>Figma 디자인 파일</strong>에서 생성합니다</li>
                <li>토큰을 재발급하면 기존 토큰은 즉시 무효화됩니다</li>
                <li>설정 → 해제 버튼으로 언제든 연동을 해제할 수 있습니다</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Project Management */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">프로젝트 관리</h2>
        <p className="text-sm text-muted-foreground">
          생성 작업은 프로젝트 단위로 분류됩니다. 사이드바 <span className="font-medium text-foreground">프로젝트</span> 메뉴에서 관리합니다.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="flex items-start gap-3 pt-4">
              <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <div>
                <p className="text-sm font-medium">카드 클릭으로 이동</p>
                <p className="text-xs text-muted-foreground">
                  프로젝트 카드 어디를 클릭해도 해당 프로젝트 페이지로 이동합니다.
                  우측 상단의 ⋯ 메뉴로 보관·삭제를 할 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 pt-4">
              <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
              <div>
                <p className="text-sm font-medium">활성 / 보관 / 휴지통</p>
                <p className="text-xs text-muted-foreground">
                  탭으로 상태별 필터링이 가능합니다. 삭제된 프로젝트는 이력·파일
                  열람은 가능하지만 새 생성 작업은 불가합니다.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 pt-4">
              <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
              <div>
                <p className="text-sm font-medium">프로젝트 서브 메뉴</p>
                <p className="text-xs text-muted-foreground">
                  프로젝트를 선택하면 사이드바에 TC 생성, 다이어그램, 와이어프레임
                  등 서브 메뉴가 나타납니다. 이력·설정으로 이동해도 서브 메뉴가 유지됩니다.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 pt-4">
              <Archive className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">보관 프로젝트</p>
                <p className="text-xs text-muted-foreground">
                  완료된 프로젝트는 보관하여 활성 목록을 깔끔하게 유지할 수 있습니다.
                  보관 중에도 생성 기능은 이용 가능합니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Template Guide */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">템플릿 설정 (선택사항)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            TC 생성 결과의 형식을 지정하고 싶다면, 먼저 템플릿을 만드세요.
            템플릿 없이도 AI 자율 모드로 바로 생성할 수 있습니다.
          </p>
        </div>
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm">
              사이드바 <span className="font-medium text-foreground">템플릿</span> 메뉴에서 설정합니다. 템플릿에 포함되는 항목:
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg bg-white p-3">
                <LayoutTemplate className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                <div>
                  <p className="text-sm font-medium">시트 구성</p>
                  <p className="text-xs text-muted-foreground">
                    AI가 TC를 분류할 시트(카테고리)를 지정합니다. 드래그앤드롭으로 순서 변경 가능.<br />
                    예: &quot;로그인_플로우&quot;, &quot;관리자_기능&quot;, &quot;알림_시스템&quot;
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-white p-3">
                <Columns3 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                <div>
                  <p className="text-sm font-medium">컬럼 구성</p>
                  <p className="text-xs text-muted-foreground">
                    기본 컬럼 8개의 포함/제외를 설정하고, <strong>커스텀 컬럼을 자유롭게 추가</strong>할 수 있습니다.<br />
                    예: &quot;우선순위&quot;(High/Medium/Low), &quot;담당자&quot;, &quot;테스트 환경&quot;
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-white p-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-medium">제약조건 (필수 준수)</p>
                  <p className="text-xs text-muted-foreground">
                    AI가 <strong>반드시</strong> 지켜야 할 규칙. 최우선으로 적용됩니다.<br />
                    예: &quot;하나의 TC에 하나의 검증 포인트만 포함할 것&quot;
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-white p-3">
                <MessageSquarePlus className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">요구사항 (권장 사항)</p>
                  <p className="text-xs text-muted-foreground">
                    가능한 한 반영해야 할 희망 사항. 제약조건과 충돌 시 제약조건이 우선합니다.<br />
                    예: &quot;크로스 브라우저 TC 포함&quot;, &quot;각 시트당 최소 15개 TC&quot;
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* TC Generation Guide */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">QA 테스트케이스 생성 방법</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            기획 문서를 업로드하면 AI가 자동으로 테스트케이스를 생성합니다.
          </p>
        </div>
        <div>
          <StepCard step={1} icon={FolderOpen} title="기획 문서 준비">
            <p>QA 테스트케이스를 생성할 기획 문서를 준비합니다. 지원 파일 형식:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">.pdf</Badge>
              <Badge variant="outline">.docx</Badge>
              <Badge variant="outline">.xlsx</Badge>
              <Badge variant="outline">.txt</Badge>
              <Badge variant="outline">.md</Badge>
            </div>
            <div className="mt-3 rounded-md bg-muted p-3 text-xs">
              <p className="font-medium text-foreground">좋은 기획 문서의 조건</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li>화면별 기능 설명이 상세할수록 TC 품질이 높아집니다</li>
                <li>사용자 역할(관리자, 파트너 등)이 구분되어 있으면 시트 분류가 정확합니다</li>
                <li>입력값 조건(최소/최대 글자수, 필수값 등)이 있으면 경계값 TC가 생성됩니다</li>
              </ul>
            </div>
          </StepCard>

          <StepCard step={2} icon={Upload} title="문서 업로드 및 모드 선택">
            <p>
              사이드바에서 <span className="font-medium text-foreground">TC 생성</span> 메뉴를 선택한 뒤:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>프로젝트를 선택하거나 새 프로젝트 이름을 입력합니다</li>
              <li>기획 문서를 드래그앤드롭 또는 클릭하여 업로드합니다</li>
              <li>우측에 파싱된 문서 미리보기가 나타나면 내용이 올바른지 확인합니다</li>
            </ul>
            <div className="mt-3 rounded-md bg-muted p-3 text-xs">
              <p className="font-medium text-foreground">생성 모드 선택</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li><strong>AI 자율</strong>: AI가 문서를 분석해 시트 구성과 TC 구조를 자유롭게 결정합니다</li>
                <li><strong>템플릿 사용</strong>: 미리 만든 템플릿의 시트 구성, 컬럼, 제약조건에 맞춰 생성합니다</li>
              </ul>
            </div>
          </StepCard>

          <StepCard step={3} icon={Sparkles} title="AI 생성 실행">
            <p>
              <span className="font-medium text-foreground">TC 생성하기</span> 버튼을 클릭하면 AI가 문서를 분석합니다.
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>문서 크기에 따라 30초~수 분 소요됩니다</li>
              <li>AI는 정상 케이스, 에러 케이스, 경계값 케이스를 포함해 생성합니다</li>
              <li>대용량 문서는 자동으로 분할 처리 후 병합됩니다</li>
            </ul>
          </StepCard>

          <StepCard step={4} icon={CheckCircle2} title="결과 확인 및 내보내기">
            <p>생성이 완료되면 결과 페이지에서:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li><strong>시트 탭</strong>으로 카테고리별 TC를 확인합니다</li>
              <li>TC ID, 사전조건, 테스트 절차, 기대결과를 검토합니다</li>
              <li><strong>Excel 다운로드</strong> 버튼으로 .xlsx 파일을 내려받습니다</li>
            </ul>
            <div className="mt-3 rounded-md bg-muted p-3 text-xs">
              <p className="font-medium text-foreground">Excel 파일 구성</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li><strong>목차 시트</strong>: 시트별 TC 합계 요약</li>
                <li><strong>기능별 시트</strong>: TC ID, 1~3Depth, 사전조건, 테스트 절차, 기대결과, 테스트 결과 칸</li>
              </ul>
            </div>
          </StepCard>
        </div>
      </section>

      <Separator />

      {/* Diagram Guide */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">다이어그램 생성 방법</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            기획 문서에서 사용자 플로우와 상태 다이어그램을 자동으로 추출하고, 원클릭으로 FigJam에 가져옵니다.
          </p>
        </div>
        <div>
          <StepCard step={1} icon={Upload} title="문서 업로드">
            <p>
              사이드바에서 <span className="font-medium text-foreground">다이어그램</span> 메뉴를 선택하고,
              프로젝트 선택 + 기획 문서를 업로드합니다.
            </p>
          </StepCard>

          <StepCard step={2} icon={Sparkles} title="AI 다이어그램 생성">
            <p>
              <span className="font-medium text-foreground">다이어그램 생성하기</span> 버튼을 클릭하면 AI가 다음을 생성합니다:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li><strong>사용자 플로우</strong>: 화면 전환과 사용자 행동 흐름</li>
              <li><strong>상태 다이어그램</strong>: 엔티티의 상태 변화 (예: 대기→검토중→승인)</li>
              <li><strong>와이어프레임 플로우</strong>: 화면 간 네비게이션 구조</li>
            </ul>
          </StepCard>

          <StepCard step={3} icon={MonitorSmartphone} title="미리보기 및 AI 자동 수정">
            <p>생성된 다이어그램은 웹에서 바로 확인할 수 있습니다:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li><strong>미리보기</strong>: Mermaid.js로 렌더링된 다이어그램을 시각적으로 확인</li>
              <li><strong>코드 복사</strong>: Mermaid 코드를 클립보드에 복사 → Notion, Confluence 등에 바로 붙여넣기 가능</li>
            </ul>
            <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs">
              <Wand2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">AI 구문 자동 수정</p>
                <p className="mt-0.5 text-amber-700">
                  렌더링에 실패하면 에러 메시지와 함께{" "}
                  <strong>&quot;AI로 구문 오류 수정하기&quot;</strong> 버튼이 나타납니다.
                  AI가 에러 원인을 분석하고 코드를 자동으로 수정합니다 (최대 3회).
                </p>
              </div>
            </div>
          </StepCard>

          <StepCard step={4} icon={Puzzle} title="FigJam에서 열기 (원클릭)">
            <p>
              결과 페이지 하단의{" "}
              <span className="font-medium text-foreground">FigJam에서 열기</span> 버튼을 클릭하면:
            </p>
            <ol className="mt-2 list-inside list-decimal space-y-1">
              <li>이 작업의 ID가 클립보드에 자동으로 복사됩니다</li>
              <li>Figma 커뮤니티 플러그인 페이지가 열립니다</li>
              <li>FigJam 파일에서 FireQA 플러그인을 실행합니다</li>
              <li>
                <span className="font-medium text-foreground">웹에서 가져오기</span> 버튼을 클릭하면
                클립보드에서 작업 ID를 읽어 자동으로 해당 다이어그램을 선택합니다
              </li>
              <li><span className="font-medium text-foreground">FigJam에 생성하기</span>를 클릭하면 완료!</li>
            </ol>
            <div className="mt-3 flex items-start gap-2 rounded-md bg-blue-50 p-3 text-xs">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <p className="text-blue-800">
                플러그인 연동이 처음이라면 위의{" "}
                <strong>Figma 플러그인 연동 설정</strong> 섹션을 먼저 완료해주세요.
              </p>
            </div>
            <div className="mt-3 rounded-md bg-muted p-3 text-xs">
              <p className="font-medium text-foreground">Mermaid 코드로 직접 가져오기 (대안)</p>
              <ol className="mt-1 list-inside list-decimal space-y-0.5">
                <li>결과 페이지에서 <strong>코드 복사</strong> 클릭</li>
                <li>FigJam에서 커뮤니티 플러그인 <strong>&quot;Mermaid to FigJam&quot;</strong> 실행</li>
                <li>복사한 코드를 붙여넣고 변환</li>
              </ol>
            </div>
          </StepCard>
        </div>
      </section>

      <Separator />

      {/* Diagram Version Management */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">다이어그램 버전 관리</h2>
        <p className="text-sm text-muted-foreground">
          다이어그램 결과 페이지에서 AI에게 수정을 요청하고, 모든 버전을 관리할 수 있습니다.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="flex items-start gap-3 pt-4">
              <Wand2 className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
              <div>
                <p className="text-sm font-medium">AI 수정 요청</p>
                <p className="text-xs text-muted-foreground">
                  다이어그램 하단 입력창에 요구사항을 작성하면 AI가 Mermaid 코드를 수정합니다.
                  Cmd+Enter로 빠르게 전송할 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 pt-4">
              <History className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <div>
                <p className="text-sm font-medium">버전 내비게이션</p>
                <p className="text-xs text-muted-foreground">
                  모든 수정 버전이 DB에 저장됩니다. 상단의 도트 내비게이션으로
                  이전/다음 버전을 자유롭게 오갈 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 pt-4">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              <div>
                <p className="text-sm font-medium">버전 확정</p>
                <p className="text-xs text-muted-foreground">
                  &quot;이 버전으로 확정&quot; 버튼을 클릭하면 해당 버전이 최종본으로 지정됩니다.
                  FigJam 플러그인에서 가져올 때 확정 버전이 우선 적용됩니다.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 pt-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium">구문 오류 자동 수정</p>
                <p className="text-xs text-muted-foreground">
                  Mermaid 렌더링이 실패하면 &quot;AI로 구문 오류 수정하기&quot; 버튼이 나타납니다.
                  AI가 에러를 분석하고 코드를 자동으로 수정합니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Wireframe Guide */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">와이어프레임 생성 방법</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            기획 문서에서 각 화면의 UI 구성을 추출하여 Figma에 Lo-fi 와이어프레임을 생성합니다.
          </p>
        </div>
        <div>
          <StepCard step={1} icon={Upload} title="문서 업로드">
            <p>
              사이드바에서 <span className="font-medium text-foreground">와이어프레임</span> 메뉴를 선택하고
              프로젝트 선택 + 기획 문서를 업로드합니다.
            </p>
          </StepCard>

          <StepCard step={2} icon={Sparkles} title="화면 타입 선택 후 생성">
            <p>AI가 기획 문서를 분석하여 생성합니다:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>각 화면의 UI 요소 (헤더, 버튼, 인풋, 이미지, 리스트, 카드 등)</li>
              <li>화면 간 이동 흐름 (어떤 행동이 어떤 화면으로 연결되는지)</li>
            </ul>
            <div className="mt-3 rounded-md bg-muted p-3 text-xs">
              <p className="font-medium text-foreground">화면 타입 옵션</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li><strong>AI 자동</strong>: 문서를 보고 AI가 모바일/데스크톱을 판단</li>
                <li><strong>모바일</strong>: 전체 360px 기준</li>
                <li><strong>데스크톱</strong>: 전체 800px 기준</li>
                <li><strong>혼합</strong>: 화면마다 타입 혼합</li>
              </ul>
            </div>
          </StepCard>

          <StepCard step={3} icon={Smartphone} title="Figma 디자인 파일에서 생성">
            <p>
              <strong>Figma 데스크톱 앱</strong>에서 <strong>디자인 파일</strong>(FigJam이 아닌)을 열고:
            </p>
            <ol className="mt-2 list-inside list-decimal space-y-1">
              <li>결과 페이지에서 <span className="font-medium text-foreground">FigJam에서 열기</span> 클릭 (작업 ID 클립보드 복사)</li>
              <li>Figma 디자인 파일에서 FireQA 플러그인 실행</li>
              <li><span className="font-medium text-foreground">웹에서 가져오기</span> → 와이어프레임 항목 자동 선택</li>
              <li>&quot;Figma에 와이어프레임 생성하기&quot; 클릭</li>
              <li>각 화면이 Frame으로 생성되고, UI 요소와 흐름 화살표가 배치됩니다</li>
            </ol>
            <div className="mt-3 flex items-start gap-2 rounded-md bg-blue-50 p-3 text-xs">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <p className="text-blue-800">
                와이어프레임은 <strong>Figma 디자인 파일</strong>에서, 다이어그램은 <strong>FigJam 파일</strong>에서 생성합니다.
                두 파일 타입은 서로 다릅니다.
              </p>
            </div>
          </StepCard>
        </div>
      </section>

      <Separator />

      {/* Spec Improve Guide */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">기획서 개선 방법</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            기획 문서를 업로드하면 AI가 모범 구조로 재작성합니다.
          </p>
        </div>
        <div>
          <StepCard step={1} icon={Upload} title="문서 업로드">
            <p>
              사이드바에서 <span className="font-medium text-foreground">기획서 개선</span> 메뉴를 선택하고
              프로젝트 선택 + 기획 문서를 업로드합니다.
            </p>
          </StepCard>
          <StepCard step={2} icon={FileEdit} title="AI 개선 실행">
            <p>AI가 다음을 보완합니다:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>누락된 엣지 케이스 및 예외 처리 흐름</li>
              <li>불명확한 사용자 행동 및 시스템 반응 정의</li>
              <li>일관성 없는 용어 통일</li>
              <li>모범 구조(목적, 범위, 화면, 기능, 예외 등)로 재구성</li>
            </ul>
          </StepCard>
          <StepCard step={3} icon={CheckCircle2} title="결과 확인 및 내보내기">
            <p>개선된 기획서를 검토하고 복사하거나 다운로드합니다.</p>
          </StepCard>
        </div>
      </section>

      <Separator />

      {/* History Guide */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">이력 관리</h2>
        <p className="text-sm text-muted-foreground">
          사이드바 <span className="font-medium text-foreground">이력</span> 메뉴에서 모든 생성 기록을 관리합니다.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-start gap-3 pt-4">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <div>
                <p className="text-sm font-medium">필터링</p>
                <p className="text-xs text-muted-foreground">
                  전체 / TC 생성 / 다이어그램 / 와이어프레임 / 기획서 개선으로 필터링하여 조회
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 pt-4">
              <Pencil className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium">수정</p>
                <p className="text-xs text-muted-foreground">
                  각 이력의 메뉴(...)에서 프로젝트명을 수정할 수 있습니다
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 pt-4">
              <Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-medium">삭제</p>
                <p className="text-xs text-muted-foreground">
                  불필요한 이력을 삭제할 수 있습니다 (확인 팝업 포함)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Settings Guide */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">설정</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="flex items-start gap-3 pt-4">
              <Settings className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" />
              <div>
                <p className="text-sm font-medium">조직 정보</p>
                <p className="text-xs text-muted-foreground">
                  조직 이름, 슬러그를 변경할 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 pt-4">
              <Key className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Figma 플러그인 연동</p>
                <p className="text-xs text-muted-foreground">
                  플러그인 토큰 발급·재발급·해제. 설정 탭 → 일반 탭에 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 pt-4">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <div>
                <p className="text-sm font-medium">멤버 관리</p>
                <p className="text-xs text-muted-foreground">
                  조직 멤버를 초대하고 역할(관리자/멤버)을 지정합니다.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 pt-4">
              <Bell className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
              <div>
                <p className="text-sm font-medium">알림</p>
                <p className="text-xs text-muted-foreground">
                  헤더 종 아이콘에서 생성 완료, 댓글 등 알림을 확인합니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Supported Formats */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">지원 파일 형식</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { ext: ".pdf", name: "PDF", desc: "기획서, 요구사항 정의서 등 PDF 문서" },
            { ext: ".docx", name: "Word", desc: "Microsoft Word 문서 (.docx만 지원)" },
            { ext: ".xlsx", name: "Excel", desc: "기능 명세가 정리된 스프레드시트" },
            { ext: ".txt", name: "텍스트", desc: "일반 텍스트 파일" },
            { ext: ".md", name: "Markdown", desc: "Notion 내보내기, 마크다운 기획서" },
          ].map((f) => (
            <Card key={f.ext}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">{f.ext}</Badge>
                  <span className="text-sm font-medium">{f.name}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* FAQ */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">자주 묻는 질문</h2>
        <div className="space-y-3">
          {[
            {
              q: "AI가 생성한 TC의 품질은 어떤가요?",
              a: "OpenAI 모델을 사용하여 정상 케이스, 에러 케이스, 경계값 케이스를 포함한 체계적인 TC를 생성합니다. 기획 문서가 상세할수록 TC 품질이 높아지며, 생성 후 검토/수정을 거쳐 사용하는 것을 권장합니다.",
            },
            {
              q: "AI 자율 모드와 템플릿 모드의 차이는?",
              a: "AI 자율 모드는 AI가 문서를 분석하여 시트 구성과 TC 구조를 자유롭게 결정합니다. 템플릿 모드는 사용자가 미리 정의한 시트 구성, 컬럼, 제약조건, 요구사항에 맞춰 생성합니다. 매번 같은 형식이 필요하면 템플릿 모드를, 처음 보는 문서라면 AI 자율 모드를 추천합니다.",
            },
            {
              q: "대용량 문서도 처리할 수 있나요?",
              a: "네. 대용량 문서는 자동으로 섹션별로 분할하여 처리한 뒤 결과를 병합합니다. 다만 문서가 매우 큰 경우 생성 시간이 길어질 수 있습니다.",
            },
            {
              q: "다이어그램 렌더링이 실패하면 어떻게 하나요?",
              a: "렌더링 실패 시 에러 메시지와 함께 'AI로 구문 오류 수정하기' 버튼이 나타납니다. AI가 에러 원인을 분석하고 Mermaid 코드를 자동으로 수정합니다. 최대 3회까지 재시도할 수 있으며, 그래도 실패하면 코드를 복사하여 mermaid.live에서 직접 수정할 수 있습니다.",
            },
            {
              q: "FigJam 플러그인 연결 방법이 바뀌었나요?",
              a: "네. 기존의 브라우저 인증(Device Auth) 방식 대신, 설정 페이지에서 토큰을 발급하여 플러그인에 직접 붙여넣는 방식으로 간소화되었습니다. 토큰은 한 번만 입력하면 이후 자동으로 유지됩니다.",
            },
            {
              q: "FigJam에서 열기 버튼은 어떻게 동작하나요?",
              a: "결과 페이지의 'FigJam에서 열기' 버튼을 클릭하면, 해당 작업의 ID가 클립보드에 복사되고 Figma 플러그인 페이지가 열립니다. FigJam에서 플러그인을 실행한 뒤 '웹에서 가져오기'를 클릭하면 클립보드에서 작업 ID를 읽어 해당 다이어그램을 자동으로 선택합니다.",
            },
            {
              q: "삭제된 프로젝트의 이력은 볼 수 있나요?",
              a: "네. 삭제된 프로젝트도 이력과 파일은 열람할 수 있습니다. 단, 새로운 생성 작업(TC, 다이어그램 등)은 불가합니다. 삭제된 프로젝트 페이지에서는 생성하기 버튼이 표시되지 않으며, 빨간 배너로 삭제 상태를 안내합니다.",
            },
            {
              q: "와이어프레임과 다이어그램의 차이는?",
              a: "다이어그램은 사용자 플로우와 상태 변화를 Mermaid 차트로 표현하며 FigJam 파일에서 생성됩니다. 와이어프레임은 각 화면의 실제 UI 구성 요소(헤더, 버튼, 인풋 등)를 Figma 디자인 파일에 Frame으로 생성합니다. 다이어그램은 '흐름'을, 와이어프레임은 '화면'을 보여줍니다.",
            },
            {
              q: "다이어그램 버전은 어떻게 관리되나요?",
              a: "AI에게 수정을 요청할 때마다 새 버전이 DB에 저장됩니다. 상단의 도트 내비게이션으로 모든 버전을 오갈 수 있으며, '이 버전으로 확정'을 클릭하면 최종본으로 지정됩니다. FigJam 플러그인에서 가져올 때 확정 버전이 우선 반영됩니다.",
            },
            {
              q: "여러 기획 문서를 하나의 프로젝트로 합칠 수 있나요?",
              a: "현재는 문서 하나당 하나의 생성 작업을 수행합니다. 여러 문서를 하나로 합쳐 업로드하거나, 각각 생성한 뒤 Excel에서 병합할 수 있습니다.",
            },
          ].map((item) => (
            <Card key={item.q}>
              <CardContent className="pt-4">
                <p className="text-sm font-medium">{item.q}</p>
                <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
