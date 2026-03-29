import { Zap, FolderOpen, Users, History, Activity } from "lucide-react";
import { ActivityAction, JOB_TYPE_LABEL } from "@/types/enums";
import { relativeTime } from "@/lib/date/relative-time";
import type { ActivityLog } from "@/types/activity";

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

function describeAction(action: string, metadata: Record<string, unknown>): string {
  const typeLabel =
    typeof metadata.type === "string"
      ? (JOB_TYPE_LABEL[metadata.type] ?? metadata.type)
      : null;

  switch (action) {
    case ActivityAction.GENERATION_COMPLETED:
      return typeLabel ? `${typeLabel} 생성 완료` : "생성 완료";
    case ActivityAction.GENERATION_FAILED:
      return typeLabel ? `${typeLabel} 생성 실패` : "생성 실패";
    case ActivityAction.PROJECT_CREATED:
      return `프로젝트 생성: ${metadata.name ?? ""}`;
    case ActivityAction.PROJECT_UPDATED:
      return "프로젝트 정보 수정";
    case ActivityAction.PROJECT_ARCHIVED:
      return "프로젝트 보관";
    case ActivityAction.PROJECT_UNARCHIVED:
      return "프로젝트 보관 해제";
    case ActivityAction.PROJECT_DELETED:
      return "프로젝트 삭제";
    case ActivityAction.PROJECT_RESTORED:
      return "프로젝트 복구";
    case ActivityAction.MEMBER_INVITED:
      return `멤버 초대: ${metadata.email ?? ""}`;
    case ActivityAction.MEMBER_ROLE_CHANGED:
      return "역할 변경";
    case ActivityAction.MEMBER_REMOVED:
      return "멤버 제거";
    case ActivityAction.VERSION_CREATED:
      return `버전 생성 (${metadata.changeType ?? ""})`;
    case ActivityAction.VERSION_ACTIVATED:
      return "버전 복원";
    default:
      return action;
  }
}

export function ActivityItem({ log }: ActivityItemProps) {
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
            {actorLabel && "님이 "}
            {describeAction(log.action, log.metadata)}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {relativeTime(log.createdAt)}
        </span>
      </div>
    </div>
  );
}
