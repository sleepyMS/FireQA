"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { TestSheet } from "@/types/test-case";

interface TestCaseResultsProps {
  jobId: string;
  projectName: string;
  sheets: TestSheet[];
}

export function TestCaseResults({
  jobId,
  projectName,
  sheets,
}: TestCaseResultsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const totalTCs = sheets.reduce((sum, s) => sum + s.testCases.length, 0);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/export/excel?jobId=${jobId}`);
      if (!res.ok) throw new Error("내보내기 실패");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName}_QA_TC.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-sm">
            총 {totalTCs}개 TC
          </Badge>
          <Badge variant="secondary" className="text-sm">
            {sheets.length}개 시트
          </Badge>
        </div>
        <Button onClick={handleExport} disabled={isExporting}>
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "내보내는 중..." : "Excel 다운로드"}
        </Button>
      </div>

      {/* Sheet Tabs */}
      <Tabs defaultValue={sheets[0]?.sheetName} className="min-w-0">
        <div className="overflow-x-auto rounded-lg border bg-muted/50 p-1">
          <div className="flex w-max gap-1">
            <TabsList className="h-auto flex-none gap-1 bg-transparent p-0">
              {sheets.map((sheet) => (
                <TabsTrigger
                  key={sheet.sheetName}
                  value={sheet.sheetName}
                  className="shrink-0 whitespace-nowrap"
                >
                  {sheet.sheetName} ({sheet.testCases.length})
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        {sheets.map((sheet) => (
          <TabsContent key={sheet.sheetName} value={sheet.sheetName}>
            <Card className="min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">{sheet.sheetName}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="w-[80px] min-w-[80px] px-3 py-2 text-left text-xs font-medium text-muted-foreground">TC ID</th>
                        <th className="w-[150px] min-w-[150px] px-3 py-2 text-left text-xs font-medium text-muted-foreground">테스트케이스 명</th>
                        <th className="w-[100px] min-w-[100px] px-3 py-2 text-left text-xs font-medium text-muted-foreground">1Depth</th>
                        <th className="w-[100px] min-w-[100px] px-3 py-2 text-left text-xs font-medium text-muted-foreground">2Depth</th>
                        <th className="w-[100px] min-w-[100px] px-3 py-2 text-left text-xs font-medium text-muted-foreground">3Depth</th>
                        <th className="w-[180px] min-w-[180px] px-3 py-2 text-left text-xs font-medium text-muted-foreground">사전조건</th>
                        <th className="w-[220px] min-w-[220px] px-3 py-2 text-left text-xs font-medium text-muted-foreground">테스트 절차</th>
                        <th className="w-[220px] min-w-[220px] px-3 py-2 text-left text-xs font-medium text-muted-foreground">기대결과</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sheet.testCases.map((tc, i) => (
                        <tr key={tc.tcId || i} className="border-b last:border-b-0 hover:bg-muted/30">
                          <td className="px-3 py-2 align-top font-mono text-xs">{tc.tcId}</td>
                          <td className="px-3 py-2 align-top text-xs font-medium">{tc.name}</td>
                          <td className="px-3 py-2 align-top text-xs">{tc.depth1}</td>
                          <td className="px-3 py-2 align-top text-xs">{tc.depth2}</td>
                          <td className="px-3 py-2 align-top text-xs">{tc.depth3}</td>
                          <td className="whitespace-pre-wrap px-3 py-2 align-top text-xs">{tc.precondition}</td>
                          <td className="whitespace-pre-wrap px-3 py-2 align-top text-xs">{tc.procedure}</td>
                          <td className="whitespace-pre-wrap px-3 py-2 align-top text-xs">{tc.expectedResult}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
