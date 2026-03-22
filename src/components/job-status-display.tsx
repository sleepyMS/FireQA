import { JobStatus } from "@/types/enums";

interface JobStatusDisplayProps {
  status: string;
  error?: string | null;
  loadingMessage?: string;
}

export function JobStatusDisplay({
  status,
  error,
  loadingMessage = "생성하고 있습니다...",
}: JobStatusDisplayProps) {
  if (status === JobStatus.PROCESSING) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p>{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (status === JobStatus.FAILED) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <p className="font-medium">생성에 실패했습니다.</p>
        {error && <p className="mt-2 text-sm">{error}</p>}
      </div>
    );
  }

  return null;
}
