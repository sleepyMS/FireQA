import { Zap, FolderOpen, Users, History, Activity } from "lucide-react";
import { ActivityAction, JOB_TYPE_LABEL } from "@/types/enums";

interface ActivityItemProps {
  log: {
    id: string;
    action: string;
    actorId: string | null;
    projectId: string | null;
    jobId: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
  };
}

// 상대 시간 헬퍼
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

// 액션별 아이콘 + 색상
function ActionIcon({ action }: { action: string }) {
  if (action.startsWith("generation.")) {
    return <Zap className="h-4 w-4 text-orange-500" />;
  }
  if (action.startsWith("project.")) {
    return <FolderOpen className="h-4 w-4 text-blue-500" />;
  }
  if (action.startsWith("member.")) {
    return <Users className="h-4 w-4 text-green-500" />;
  }
  if (action.startsWith("version.")) {
    return <History className="h-4 w-4 text-purple-500" />;
  }
  return <Activity className="h-4 w-4 text-gray-400" />;
}

// 아이콘 배경색
function iconBgClass(action: string): string {
  if (action.startsWith("generation.")) return "bg-orange-100";
  if (action.startsWith("project.")) return "bg-blue-100";
  if (action.startsWith("member.")) return "bg-green-100";
  if (action.startsWith("version.")) return "bg-purple-100";
  return "bg-gray-100";
}

// 액션 → 한글 설명
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
  return (
    <div className="relative flex items-start gap-4 pb-6 pl-8">
      {/* 타임라인 세로선 */}
      <div className="absolute left-[15px] top-8 h-full w-[2px] -translate-x-1/2 bg-border" />

      {/* 아이콘 */}
      <div
        className={`absolute left-0 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBgClass(log.action)}`}
      >
        <ActionIcon action={log.action} />
      </div>

      {/* 내용 */}
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
        <p className="text-sm text-foreground">
          {describeAction(log.action, log.metadata)}
        </p>
        <span className="shrink-0 text-xs text-muted-foreground">
          {relativeTime(log.createdAt)}
        </span>
      </div>
    </div>
  );
}
