import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";

// GET /api/diagram-versions?jobId=xxx&title=yyy — 버전 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const jobId = request.nextUrl.searchParams.get("jobId");
    const title = request.nextUrl.searchParams.get("title");

    if (!jobId || !title) {
      return NextResponse.json(
        { error: "jobId와 title이 필요합니다." },
        { status: 400 }
      );
    }

    const job = await prisma.generationJob.findFirst({
      where: { id: jobId, project: { organizationId: user.organizationId } },
    });
    if (!job) {
      return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
    }

    const versions = await prisma.diagramVersion.findMany({
      where: { jobId, diagramTitle: title },
      orderBy: { version: "asc" },
    });

    return NextResponse.json({ versions });
  } catch (error) {
    console.error("버전 조회 오류:", error);
    return NextResponse.json(
      { error: "버전 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/diagram-versions — 새 버전 추가 (nodes/edges 포함)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { jobId, diagramTitle, mermaidCode, nodes, edges, instruction } =
      await request.json();

    if (!jobId || !diagramTitle || !mermaidCode) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      );
    }

    const jobCheck = await prisma.generationJob.findFirst({
      where: { id: jobId, project: { organizationId: user.organizationId } },
    });
    if (!jobCheck) {
      return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
    }

    const latest = await prisma.diagramVersion.findFirst({
      where: { jobId, diagramTitle },
      orderBy: { version: "desc" },
    });
    const nextVersion = (latest?.version || 0) + 1;

    const version = await prisma.diagramVersion.create({
      data: {
        jobId,
        diagramTitle,
        mermaidCode,
        nodesJson: JSON.stringify(nodes || []),
        edgesJson: JSON.stringify(edges || []),
        instruction: instruction || null,
        version: nextVersion,
      },
    });

    // GenerationJob의 result도 최신 코드로 업데이트
    const newResultJson = await updateJobResult(jobId, diagramTitle, mermaidCode, nodes, edges);

    // ResultVersion도 함께 생성 (다이어그램 편집 이력 추적)
    if (newResultJson) {
      const latestResultVersion = await prisma.resultVersion.findFirst({
        where: { jobId },
        orderBy: { version: "desc" },
      });
      const nextResultVersion = (latestResultVersion?.version ?? 0) + 1;
      await prisma.resultVersion.updateMany({ where: { jobId, isActive: true }, data: { isActive: false } });
      await prisma.resultVersion.create({
        data: {
          jobId,
          version: nextResultVersion,
          resultJson: newResultJson,
          changeType: "manual-edit",
          instruction: instruction || null,
          isActive: true,
          createdById: user.userId,
        },
      });
    }

    return NextResponse.json({ version });
  } catch (error) {
    console.error("버전 생성 오류:", error);
    return NextResponse.json(
      { error: "버전 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}

// PATCH /api/diagram-versions — 특정 버전을 확정 (LLM 호출 없이 즉시)
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { jobId, diagramTitle, versionId } = await request.json();

    if (!jobId || !diagramTitle || !versionId) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      );
    }

    const jobCheck = await prisma.generationJob.findFirst({
      where: { id: jobId, project: { organizationId: user.organizationId } },
    });
    if (!jobCheck) {
      return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
    }

    // 기존 확정 해제
    await prisma.diagramVersion.updateMany({
      where: { jobId, diagramTitle, isConfirmed: true },
      data: { isConfirmed: false },
    });

    // 선택한 버전 확정
    const confirmed = await prisma.diagramVersion.update({
      where: { id: versionId },
      data: { isConfirmed: true },
    });

    // 저장된 nodes/edges로 즉시 result 업데이트
    const nodes = JSON.parse(confirmed.nodesJson || "[]");
    const edges = JSON.parse(confirmed.edgesJson || "[]");
    await updateJobResult(
      jobId,
      diagramTitle,
      confirmed.mermaidCode,
      nodes,
      edges
    );

    return NextResponse.json({ confirmed });
  } catch (error) {
    console.error("버전 확정 오류:", error);
    return NextResponse.json(
      { error: "버전 확정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// updateJobResult는 job result를 업데이트하고, 변경된 result JSON 문자열을 반환한다.
// 변경 대상 다이어그램을 찾지 못하면 null을 반환한다.
async function updateJobResult(
  jobId: string,
  diagramTitle: string,
  mermaidCode: string,
  nodes?: unknown[],
  edges?: unknown[]
): Promise<string | null> {
  const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
  if (!job || !job.result) return null;

  const result = JSON.parse(job.result);
  const diagram = result.diagrams?.find(
    (d: { title: string }) => d.title === diagramTitle
  );
  if (diagram) {
    diagram.mermaidCode = mermaidCode;
    if (nodes && nodes.length > 0) diagram.nodes = nodes;
    if (edges && edges.length > 0) diagram.edges = edges;
    const newResultJson = JSON.stringify(result);
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { result: newResultJson },
    });
    return newResultJson;
  }
  return null;
}
