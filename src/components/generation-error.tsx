"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface GenerationErrorProps {
  error: string;
}

export function GenerationError({ error }: GenerationErrorProps) {
  return (
    <Card className="border-red-200">
      <CardContent className="py-8">
        <div className="text-center space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-medium">생성에 실패했습니다.</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            다시 시도
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
