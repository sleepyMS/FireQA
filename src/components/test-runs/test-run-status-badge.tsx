"use client";

import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, CircleDot, Ban, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { useLocale } from "@/lib/i18n/locale-provider";

type TestRunStatus = "in_progress" | "completed" | "aborted";
type ExecutionStatus = "pending" | "passed" | "failed" | "skipped" | "blocked";

export function TestRunStatusBadge({ status }: { status: string }) {
  const { t } = useLocale();

  const RUN_STATUS_CONFIG: Record<
    TestRunStatus,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: ReactNode }
  > = {
    in_progress: {
      label: t.testRun.status.inProgress,
      variant: "default",
      icon: <Clock className="h-3 w-3" />,
    },
    completed: {
      label: t.testRun.status.completed,
      variant: "secondary",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    aborted: {
      label: t.testRun.status.aborted,
      variant: "destructive",
      icon: <XCircle className="h-3 w-3" />,
    },
  };

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
  const { t } = useLocale();

  const EXEC_STATUS_CONFIG: Record<
    ExecutionStatus,
    { label: string; className: string; icon: ReactNode }
  > = {
    pending: {
      label: t.testRun.status.pending,
      className: "bg-blue-100 text-blue-700",
      icon: <CircleDot className="h-3 w-3" />,
    },
    passed: {
      label: t.testRun.status.passed,
      className: "bg-green-100 text-green-700",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    failed: {
      label: t.testRun.status.failed,
      className: "bg-red-100 text-red-700",
      icon: <XCircle className="h-3 w-3" />,
    },
    skipped: {
      label: t.testRun.status.skipped,
      className: "bg-gray-100 text-gray-500",
      icon: <Ban className="h-3 w-3" />,
    },
    blocked: {
      label: t.testRun.status.blocked,
      className: "bg-amber-100 text-amber-700",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
  };

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
