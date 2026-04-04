"use client";

import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, CircleDot, Ban, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

type TestRunStatus = "in_progress" | "completed" | "aborted";
type ExecutionStatus = "pending" | "passed" | "failed" | "skipped" | "blocked";

const RUN_STATUS_CONFIG: Record<
  TestRunStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: ReactNode }
> = {
  in_progress: {
    label: "실행 중",
    variant: "default",
    icon: <Clock className="h-3 w-3" />,
  },
  completed: {
    label: "완료",
    variant: "secondary",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  aborted: {
    label: "중단됨",
    variant: "destructive",
    icon: <XCircle className="h-3 w-3" />,
  },
};

const EXEC_STATUS_CONFIG: Record<
  ExecutionStatus,
  { label: string; className: string; icon: ReactNode }
> = {
  pending: {
    label: "대기",
    className: "bg-blue-100 text-blue-700",
    icon: <CircleDot className="h-3 w-3" />,
  },
  passed: {
    label: "성공",
    className: "bg-green-100 text-green-700",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  failed: {
    label: "실패",
    className: "bg-red-100 text-red-700",
    icon: <XCircle className="h-3 w-3" />,
  },
  skipped: {
    label: "스킵",
    className: "bg-gray-100 text-gray-500",
    icon: <Ban className="h-3 w-3" />,
  },
  blocked: {
    label: "차단",
    className: "bg-amber-100 text-amber-700",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
};

export function TestRunStatusBadge({ status }: { status: string }) {
  const config = RUN_STATUS_CONFIG[status as TestRunStatus];
  if (!config) return <Badge variant="outline">{status}</Badge>;
  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
}

export function ExecutionStatusBadge({ status }: { status: string }) {
  const config = EXEC_STATUS_CONFIG[status as ExecutionStatus];
  if (!config) return <Badge variant="outline">{status}</Badge>;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
