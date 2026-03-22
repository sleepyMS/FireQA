import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/diagram-versions?jobId=xxx&title=yyy — 버전 목록 조회
export async function GET(request: NextRequest) {
  try {
    const jobId = request.nextUrl.searchParams.get("jobId");
    const title = request.nextUrl.searchParams.get("title");

    if (!jobId || !title) {
      return NextResponse.json(
        { error: "jobId와 title이 필요합니다." },
        { status: 400 }
      );
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
    const { jobId, diagramTitle, mermaidCode, nodes, edges, instruction } =
      await request.json();

    if (!jobId || !diagramTitle || !mermaidCode) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      );
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
    await updateJobResult(jobId, diagramTitle, mermaidCode, nodes, edges);

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
    const { jobId, diagramTitle, versionId } = await request.json();

    if (!jobId || !diagramTitle || !versionId) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      );
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

async function updateJobResult(
  jobId: string,
  diagramTitle: string,
  mermaidCode: string,
  nodes?: unknown[],
  edges?: unknown[]
) {
  const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
  if (!job || !job.result) return;

  const result = JSON.parse(job.result);
  const diagram = result.diagrams?.find(
    (d: { title: string }) => d.title === diagramTitle
  );
  if (diagram) {
    diagram.mermaidCode = mermaidCode;
    if (nodes && nodes.length > 0) diagram.nodes = nodes;
    if (edges && edges.length > 0) diagram.edges = edges;
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { result: JSON.stringify(result) },
    });
  }
}
