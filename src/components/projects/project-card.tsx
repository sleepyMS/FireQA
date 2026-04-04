"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { useLocale } from "@/lib/i18n/locale-provider";

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
  const { t } = useLocale();
  if (status === "archived")
    return <Badge variant="secondary">{t.projects.statusArchived}</Badge>;
  if (status === "deleted")
    return <Badge variant="outline">{t.projects.statusDeleted}</Badge>;
  return <Badge variant="default">{t.projects.statusActive}</Badge>;
}

export function ProjectCard({
  project,
  onArchive,
  onDelete,
  onRestore,
}: ProjectCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const router = useRouter();
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const { t } = useLocale();

  const lastUpdated = new Date(project.updatedAt).toLocaleDateString("ko-KR");

  return (
    <>
      <Card
        className="cursor-pointer transition-shadow hover:shadow-md"
        onClick={() => router.push(`${orgSlug ? `/${orgSlug}` : ""}/projects/${project.id}`)}
      >
        <CardHeader>
          <CardTitle>
            <Link
              href={`${orgSlug ? `/${orgSlug}` : ""}/projects/${project.id}`}
              className="hover:underline"
              // 카드 전체 클릭과 링크 충돌 방지: 링크 클릭은 버블링 차단
              onClick={(e) => e.stopPropagation()}
            >
              {project.name}
            </Link>
          </CardTitle>
          <CardDescription className="line-clamp-2">
            {project.description ?? (
              <span className="italic">{t.projects.noDescription}</span>
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
                <span className="sr-only">{t.projects.openMenu}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="end">
                {project.status !== "deleted" && (
                  <DropdownMenuItem onClick={onArchive}>
                    {project.status === "archived" ? (
                      <>
                        <ArchiveRestore className="mr-2 h-4 w-4" />
                        {t.projects.unarchive}
                      </>
                    ) : (
                      <>
                        <Archive className="mr-2 h-4 w-4" />
                        {t.projects.archive}
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {project.status === "deleted" && (
                  <DropdownMenuItem onClick={onRestore}>
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    {t.projects.restore}
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
                      {t.common.delete}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {t.projects.jobsCount.replace("{count}", String(project._count.jobs))}
          </Badge>
          <Badge variant="secondary">
            {t.projects.uploadsCount.replace("{count}", String(project._count.uploads))}
          </Badge>
          <StatusBadge status={project.status} />
        </CardContent>

        <CardFooter className="text-xs text-muted-foreground">
          {t.projects.lastModified.replace("{date}", lastUpdated)}
        </CardFooter>
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => !open && setDeleteDialogOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.projects.deleteProjectTitle}</DialogTitle>
            <DialogDescription>
              {t.projects.deleteProjectConfirm.replace("{name}", project.name)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t.common.cancel}</DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteDialogOpen(false);
                onDelete?.();
              }}
            >
              {t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
