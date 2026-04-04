import { Skeleton } from "@/components/ui/skeleton";

export default function GenerateLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Upload & Config */}
        <div className="space-y-4">
          {/* Project selector card */}
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>

          {/* File upload card */}
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>

          {/* Mode selection card */}
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 space-y-3">
            <Skeleton className="h-4 w-28" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          </div>

          {/* Generate button */}
          <Skeleton className="h-11 w-full rounded-md" />
        </div>

        {/* Right: Preview */}
        <div className="space-y-4">
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-64 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
