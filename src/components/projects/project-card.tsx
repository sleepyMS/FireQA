"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
    archivedAt: string | null;
    _count: { jobs: number; uploads: number };
  };
  onArchive?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "archived")
    return <Badge variant="secondary">보관됨</Badge>;
  if (status === "deleted")
    return <Badge variant="outline">삭제됨</Badge>;
  return <Badge variant="default">활성</Badge>;
}

export function ProjectCard({
  project,
  onArchive,
  onDelete,
  onRestore,
}: ProjectCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const router = useRouter();

  const lastUpdated = new Date(project.updatedAt).toLocaleDateString("ko-KR");

  return (
    <>
      <Card
        className="cursor-pointer transition-shadow hover:shadow-md"
        onClick={() => router.push(`/projects/${project.id}`)}
      >
        <CardHeader>
          <CardTitle>
            <Link
              href={`/projects/${project.id}`}
              className="hover:underline"
              // 카드 전체 클릭과 링크 충돌 방지: 링크 클릭은 버블링 차단
              onClick={(e) => e.stopPropagation()}
            >
              {project.name}
            </Link>
          </CardTitle>
          <CardDescription className="line-clamp-2">
            {project.description ?? (
              <span className="italic">설명 없음</span>
            )}
          </CardDescription>
          <CardAction>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                }
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">메뉴 열기</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="end">
                {project.status !== "deleted" && (
                  <DropdownMenuItem onClick={onArchive}>
                    {project.status === "archived" ? (
                      <>
                        <ArchiveRestore className="mr-2 h-4 w-4" />
                        보관 해제
                      </>
                    ) : (
                      <>
                        <Archive className="mr-2 h-4 w-4" />
                        보관
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {project.status === "deleted" && (
                  <DropdownMenuItem onClick={onRestore}>
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    복구
                  </DropdownMenuItem>
                )}
                {project.status !== "deleted" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      삭제
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="secondary">생성 {project._count.jobs}건</Badge>
          <Badge variant="secondary">파일 {project._count.uploads}개</Badge>
          <StatusBadge status={project.status} />
        </CardContent>

        <CardFooter className="text-xs text-muted-foreground">
          마지막 수정: {lastUpdated}
        </CardFooter>
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => !open && setDeleteDialogOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>프로젝트 삭제</DialogTitle>
            <DialogDescription>
              &quot;{project.name}&quot; 프로젝트를 삭제하시겠습니까? 삭제된
              프로젝트는 휴지통에서 복구할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteDialogOpen(false);
                onDelete?.();
              }}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
