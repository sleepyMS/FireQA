import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Tab nav */}
      <Skeleton className="h-10 w-full max-w-2xl rounded-lg" />

      {/* Settings form skeleton */}
      <div className="space-y-6">
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full rounded-md" />
            </div>
          </div>
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}
