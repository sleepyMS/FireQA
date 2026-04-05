"use client";

import { Zap, FolderOpen, Users, History, Activity } from "lucide-react";
import { ActivityAction, JOB_TYPE_LABEL } from "@/types/enums";
import { relativeTime } from "@/lib/date/relative-time";
import type { ActivityLog } from "@/types/activity";
import { useLocale, interp } from "@/lib/i18n/locale-provider";
import type { Messages } from "@/lib/i18n/messages";

interface ActivityItemProps {
  log: ActivityLog;
}

const ACTION_META: Array<{
  prefix: string;
  icon: React.ElementType;
  iconClass: string;
  bg: string;
}> = [
  { prefix: "generation.", icon: Zap, iconClass: "text-orange-500", bg: "bg-orange-100" },
  { prefix: "project.", icon: FolderOpen, iconClass: "text-blue-500", bg: "bg-blue-100" },
  { prefix: "member.", icon: Users, iconClass: "text-green-500", bg: "bg-green-100" },
  { prefix: "version.", icon: History, iconClass: "text-purple-500", bg: "bg-purple-100" },
];

const DEFAULT_META = { icon: Activity, iconClass: "text-gray-400", bg: "bg-gray-100" };

function getActionMeta(action: string) {
  return ACTION_META.find((m) => action.startsWith(m.prefix)) ?? DEFAULT_META;
}

function describeAction(
  action: string,
  metadata: Record<string, unknown>,
  at: Messages["activity"],
): string {
  const typeLabel =
    typeof metadata.type === "string"
      ? (JOB_TYPE_LABEL[metadata.type] ?? metadata.type)
      : null;

  switch (action) {
    case ActivityAction.GENERATION_COMPLETED:
      return typeLabel ? interp(at.generationCompletedType, { type: typeLabel }) : at.generationCompleted;
    case ActivityAction.GENERATION_FAILED:
      return typeLabel ? interp(at.generationFailedType, { type: typeLabel }) : at.generationFailed;
    case ActivityAction.PROJECT_CREATED:
      return interp(at.projectCreated, { name: String(metadata.name ?? "") });
    case ActivityAction.PROJECT_UPDATED:
      return at.projectUpdated;
    case ActivityAction.PROJECT_ARCHIVED:
      return at.projectArchived;
    case ActivityAction.PROJECT_UNARCHIVED:
      return at.projectUnarchived;
    case ActivityAction.PROJECT_DELETED:
      return at.projectDeleted;
    case ActivityAction.PROJECT_RESTORED:
      return at.projectRestored;
    case ActivityAction.MEMBER_INVITED:
      return interp(at.memberInvited, { email: String(metadata.email ?? "") });
    case ActivityAction.MEMBER_ROLE_CHANGED:
      return at.memberRoleChanged;
    case ActivityAction.MEMBER_REMOVED:
      return at.memberRemoved;
    case ActivityAction.VERSION_CREATED:
      return interp(at.versionCreated, { changeType: String(metadata.changeType ?? "") });
    case ActivityAction.VERSION_ACTIVATED:
      return at.versionActivated;
    default:
      return action;
  }
}

export function ActivityItem({ log }: ActivityItemProps) {
  const { t } = useLocale();
  const { icon: Icon, iconClass, bg } = getActionMeta(log.action);
  const actorLabel = log.actorName ?? log.actorEmail ?? null;

  return (
    <div className="relative flex items-start gap-4 pb-6 pl-8">
      {/* 아이템 사이 타임라인 세로선: 마지막 아이템에서도 그려지지만 부모 overflow-hidden이 클리핑 */}
      <div className="absolute left-[15px] top-8 h-full w-[2px] -translate-x-1/2 bg-border" />

      <div
        className={`absolute left-0 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bg}`}
      >
        <Icon className={`h-4 w-4 ${iconClass}`} />
      </div>

      <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-foreground">
            {actorLabel && (
              <span className="font-medium">{actorLabel}</span>
            )}
            {actorLabel && t.activity.actorSuffix}
            {describeAction(log.action, log.metadata, t.activity)}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {relativeTime(log.createdAt)}
        </span>
      </div>
    </div>
  );
}
