export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, ArrowRight } from "lucide-react";

export default async function WireframeResultPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    include: { project: true, upload: true },
  });

  if (!job) notFound();

  const result = job.result ? JSON.parse(job.result) : null;

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {job.project.name} - 와이어프레임
        </h2>
        <p className="text-muted-foreground">
          {job.upload.fileName} 기반으로 설계된 화면 구성입니다.
        </p>
      </div>

      {job.status === "processing" && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p>와이어프레임을 생성하고 있습니다...</p>
          </div>
        </div>
      )}

      {job.status === "failed" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <p className="font-medium">생성에 실패했습니다.</p>
          {job.error && <p className="mt-2 text-sm">{job.error}</p>}
        </div>
      )}

      {job.status === "completed" && result && (
        <div className="space-y-6">
          {/* 요약 */}
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-sm">
              {result.screens?.length || 0}개 화면
            </Badge>
            <Badge variant="secondary" className="text-sm">
              {result.flows?.length || 0}개 흐름
            </Badge>
            <div className="rounded-md bg-blue-50 px-3 py-1.5 text-xs text-blue-700">
              FigJam 플러그인에서 &quot;와이어프레임 생성하기&quot;로 Figma에 가져가세요
            </div>
          </div>

          {/* 화면 목록 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(result.screens || []).map(
              (screen: {
                id: string;
                title: string;
                description: string;
                elements: { type: string; label: string }[];
              }) => (
                <Card key={screen.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Smartphone className="h-4 w-4 text-purple-500" />
                      {screen.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {screen.description}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {screen.elements.map(
                        (
                          el: { type: string; label: string },
                          i: number
                        ) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-xs"
                          >
                            <Badge
                              variant="outline"
                              className="shrink-0 text-[9px]"
                            >
                              {el.type}
                            </Badge>
                            <span className="truncate text-muted-foreground">
                              {el.label}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>

          {/* 흐름 목록 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">화면 흐름</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(result.flows || []).map(
                  (
                    flow: {
                      from: string;
                      to: string;
                      label: string;
                      action: string;
                    },
                    i: number
                  ) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Badge variant="secondary">{flow.from}</Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="secondary">{flow.to}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {flow.label}
                      </span>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
