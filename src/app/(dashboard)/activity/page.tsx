import { ActivityTimeline } from "@/components/activity/activity-timeline";

export default function ActivityPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">활동 로그</h1>
        <p className="text-sm text-muted-foreground">조직의 전체 활동 기록</p>
      </div>
      <ActivityTimeline />
    </div>
  );
}
