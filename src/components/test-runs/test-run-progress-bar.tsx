"use client";

type TestCaseCount = {
  total: number;
  pending: number;
  passed: number;
  failed: number;
  skipped: number;
  blocked: number;
};

export function TestRunProgressBar({ counts }: { counts: TestCaseCount }) {
  const { total, passed, failed, skipped, blocked, pending } = counts;
  if (total === 0) return null;

  const segments = [
    { count: passed, color: "bg-green-500", label: "성공" },
    { count: failed, color: "bg-red-500", label: "실패" },
    { count: blocked, color: "bg-amber-500", label: "차단" },
    { count: skipped, color: "bg-gray-400", label: "스킵" },
    { count: pending, color: "bg-blue-500", label: "대기" },
  ];

  return (
    <div className="space-y-1.5">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        {segments.map(
          (seg) =>
            seg.count > 0 && (
              <div
                key={seg.label}
                className={`${seg.color} transition-all`}
                style={{ width: `${(seg.count / total) * 100}%` }}
                title={`${seg.label}: ${seg.count}`}
              />
            ),
        )}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {segments.map(
          (seg) =>
            seg.count > 0 && (
              <span key={seg.label} className="flex items-center gap-1">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${seg.color}`}
                />
                {seg.label} {seg.count}
              </span>
            ),
        )}
      </div>
    </div>
  );
}
