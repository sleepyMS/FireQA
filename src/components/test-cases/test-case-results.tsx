"use client";

import { useState, useCallback } from "react";
import { Download, Pencil, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { TestCase, TestSheet } from "@/types/test-case";
import { VersionBar } from "@/components/versions/version-bar";

interface TestCaseResultsProps {
  jobId: string;
  projectName: string;
  sheets: TestSheet[];
}

type EditingKey = { sheetIdx: number; tcIdx: number } | null;

export function TestCaseResults({
  jobId,
  projectName,
  sheets: initialSheets,
}: TestCaseResultsProps) {
  const [sheets, setSheets] = useState<TestSheet[]>(initialSheets);
  const [isExporting, setIsExporting] = useState(false);
  const [editing, setEditing] = useState<EditingKey>(null);
  const [editForm, setEditForm] = useState<TestCase | null>(null);
  const [saving, setSaving] = useState(false);

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

  const startEdit = useCallback((sheetIdx: number, tcIdx: number) => {
    setEditing({ sheetIdx, tcIdx });
    setEditForm({ ...sheets[sheetIdx].testCases[tcIdx] });
  }, [sheets]);

  const cancelEdit = useCallback(() => {
    setEditing(null);
    setEditForm(null);
  }, []);

  const updateField = useCallback((field: keyof TestCase, value: string) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editing || !editForm) return;

    setSaving(true);
    const { sheetIdx, tcIdx } = editing;

    // 낙관적 업데이트: 변경된 시트만 업데이트
    const updatedSheets = sheets.map((sheet, si) => {
      if (si !== sheetIdx) return sheet;
      const updatedTestCases = [...sheet.testCases];
      updatedTestCases[tcIdx] = { ...editForm };
      return { ...sheet, testCases: updatedTestCases };
    });

    setSheets(updatedSheets);
    setEditing(null);
    setEditForm(null);

    try {
      const res = await fetch(`/api/test-cases/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheets: updatedSheets,
          changeSummary: `TC ${editForm.tcId} 수동 편집`,
        }),
      });

      if (!res.ok) {
        // 실패 시 롤백
        setSheets(sheets);
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || "저장에 실패했습니다.");
        return;
      }

      toast.success("테스트케이스가 저장되었습니다.");
    } catch {
      // 네트워크 오류 시 롤백
      setSheets(sheets);
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }, [editing, editForm, sheets, jobId]);

  // VersionBar에서 버전 전환 시 로컬 시트 동기화
  const handleVersionChange = useCallback((resultJson: string) => {
    try {
      const parsed = JSON.parse(resultJson);
      if (parsed.sheets) {
        setSheets(parsed.sheets);
        cancelEdit();
      }
    } catch {
      // JSON 파싱 실패 시 페이지 리로드
      window.location.reload();
    }
  }, [cancelEdit]);

  const isEditing = (sheetIdx: number, tcIdx: number) =>
    editing?.sheetIdx === sheetIdx && editing?.tcIdx === tcIdx;

  return (
    <div className="min-w-0 space-y-4">
      <VersionBar jobId={jobId} onVersionChange={handleVersionChange} />
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

        {sheets.map((sheet, sheetIdx) => (
          <TabsContent key={sheet.sheetName} value={sheet.sheetName}>
            <Card className="min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">{sheet.sheetName}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="w-[44px] min-w-[44px] px-1 py-2" />
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
                      {sheet.testCases.map((tc, tcIdx) =>
                        isEditing(sheetIdx, tcIdx) && editForm ? (
                          <EditRow
                            key={tc.tcId || tcIdx}
                            form={editForm}
                            saving={saving}
                            onUpdate={updateField}
                            onSave={saveEdit}
                            onCancel={cancelEdit}
                          />
                        ) : (
                          <ReadRow
                            key={tc.tcId || tcIdx}
                            tc={tc}
                            disabled={editing !== null}
                            onEdit={() => startEdit(sheetIdx, tcIdx)}
                          />
                        ),
                      )}
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

// ─── 읽기 전용 행 ───

function ReadRow({
  tc,
  disabled,
  onEdit,
}: {
  tc: TestCase;
  disabled: boolean;
  onEdit: () => void;
}) {
  return (
    <tr className="group border-b last:border-b-0 hover:bg-muted/30">
      <td className="px-1 py-2 align-top">
        <Button
          variant="ghost"
          size="icon-sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          disabled={disabled}
          onClick={onEdit}
          title="편집"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </td>
      <td className="px-3 py-2 align-top font-mono text-xs">{tc.tcId}</td>
      <td className="px-3 py-2 align-top text-xs font-medium">{tc.name}</td>
      <td className="px-3 py-2 align-top text-xs">{tc.depth1}</td>
      <td className="px-3 py-2 align-top text-xs">{tc.depth2}</td>
      <td className="px-3 py-2 align-top text-xs">{tc.depth3}</td>
      <td className="whitespace-pre-wrap px-3 py-2 align-top text-xs">{tc.precondition}</td>
      <td className="whitespace-pre-wrap px-3 py-2 align-top text-xs">{tc.procedure}</td>
      <td className="whitespace-pre-wrap px-3 py-2 align-top text-xs">{tc.expectedResult}</td>
    </tr>
  );
}

// ─── 편집 행 ───

function EditRow({
  form,
  saving,
  onUpdate,
  onSave,
  onCancel,
}: {
  form: TestCase;
  saving: boolean;
  onUpdate: (field: keyof TestCase, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <tr className="border-b bg-primary/5 last:border-b-0">
      <td className="px-1 py-2 align-top">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onSave}
            disabled={saving}
            title="저장"
            className="text-green-600 hover:text-green-700"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onCancel}
            disabled={saving}
            title="취소"
            className="text-red-600 hover:text-red-700"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
      <td className="px-3 py-2 align-top font-mono text-xs text-muted-foreground">
        {form.tcId}
      </td>
      <td className="px-2 py-1 align-top">
        <Input
          value={form.name}
          onChange={(e) => onUpdate("name", e.target.value)}
          className="h-7 text-xs"
          disabled={saving}
        />
      </td>
      <td className="px-2 py-1 align-top">
        <Input
          value={form.depth1}
          onChange={(e) => onUpdate("depth1", e.target.value)}
          className="h-7 text-xs"
          disabled={saving}
        />
      </td>
      <td className="px-2 py-1 align-top">
        <Input
          value={form.depth2}
          onChange={(e) => onUpdate("depth2", e.target.value)}
          className="h-7 text-xs"
          disabled={saving}
        />
      </td>
      <td className="px-2 py-1 align-top">
        <Input
          value={form.depth3}
          onChange={(e) => onUpdate("depth3", e.target.value)}
          className="h-7 text-xs"
          disabled={saving}
        />
      </td>
      <td className="px-2 py-1 align-top">
        <Textarea
          value={form.precondition}
          onChange={(e) => onUpdate("precondition", e.target.value)}
          className="min-h-[60px] text-xs"
          rows={2}
          disabled={saving}
        />
      </td>
      <td className="px-2 py-1 align-top">
        <Textarea
          value={form.procedure}
          onChange={(e) => onUpdate("procedure", e.target.value)}
          className="min-h-[60px] text-xs"
          rows={2}
          disabled={saving}
        />
      </td>
      <td className="px-2 py-1 align-top">
        <Textarea
          value={form.expectedResult}
          onChange={(e) => onUpdate("expectedResult", e.target.value)}
          className="min-h-[60px] text-xs"
          rows={2}
          disabled={saving}
        />
      </td>
    </tr>
  );
}
