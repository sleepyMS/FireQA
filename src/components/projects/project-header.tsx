"use client";

import { useState } from "react";
import { Pencil, Archive, ArchiveRestore, Trash2, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

interface ProjectHeaderProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    createdAt: string;
    archivedAt: string | null;
  };
  onUpdate: (data: { name?: string; description?: string }) => void;
  onArchive: () => void;
  onDelete: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLocale();
  if (status === "archived")
    return <Badge variant="secondary">{t.projects.statusArchived}</Badge>;
  if (status === "deleted")
    return <Badge variant="destructive">{t.projects.statusDeleted}</Badge>;
  return <Badge variant="default">{t.projects.statusActive}</Badge>;
}

export function ProjectHeader({
  project,
  onUpdate,
  onArchive,
  onDelete,
}: ProjectHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editDescription, setEditDescription] = useState(
    project.description ?? ""
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { t } = useLocale();

  const handleSave = () => {
    if (!editName.trim()) return;
    onUpdate({
      name: editName.trim(),
      description: editDescription.trim() || undefined,
    });
    setEditing(false);
  };

  const handleCancel = () => {
    setEditName(project.name);
    setEditDescription(project.description ?? "");
    setEditing(false);
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1 space-y-1">
        {editing ? (
          <div className="space-y-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-2xl font-bold h-auto py-1 px-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
              autoFocus
            />
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder={t.projects.descriptionPlaceholder}
              rows={2}
              className="resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={!editName.trim()}>
                <Check className="mr-1 h-3 w-3" />
                {t.common.save}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="mr-1 h-3 w-3" />
                {t.common.cancel}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {project.name}
              </h1>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setEditing(true)}
                // 삭제된 프로젝트는 편집 불가
                disabled={project.status === "deleted"}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">{t.projects.editProjectSr}</span>
              </Button>
              <StatusBadge status={project.status} />
            </div>
            {project.description ? (
              <p className="text-sm text-muted-foreground">
                {project.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {t.projects.noDescription}
              </p>
            )}
          </>
        )}
      </div>

      {/* 액션 버튼 (삭제된 프로젝트에는 표시 안 함) */}
      {project.status !== "deleted" && (
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={onArchive}>
            {project.status === "archived" ? (
              <>
                <ArchiveRestore className="mr-1 h-4 w-4" />
                {t.projects.unarchive}
              </>
            ) : (
              <>
                <Archive className="mr-1 h-4 w-4" />
                {t.projects.archive}
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            {t.common.delete}
          </Button>
        </div>
      )}

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
                onDelete();
              }}
            >
              {t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
