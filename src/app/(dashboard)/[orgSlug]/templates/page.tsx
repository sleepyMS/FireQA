"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  FileText,
  Layers,
  Columns3,
  X,
  GripVertical,
  MessageSquarePlus,
  ShieldAlert,
  Code,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

interface Template {
  id: string;
  name: string;
  description: string | null;
  sheetConfig: string;
  columnConfig: string;
  constraints?: string;
  requirements?: string;
  systemPromptOverride?: string | null;
  promptMode?: string;
  createdAt: string;
}

interface ColumnDef {
  key: string;
  label: string;
  enabled: boolean;
  custom?: boolean;
  description?: string;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: "tcId", label: "TC ID", enabled: true },
  { key: "name", label: "테스트케이스 명", enabled: true },
  { key: "depth1", label: "1Depth (대분류)", enabled: true },
  { key: "depth2", label: "2Depth (중분류)", enabled: true },
  { key: "depth3", label: "3Depth (소분류)", enabled: true },
  { key: "precondition", label: "사전조건", enabled: true },
  { key: "procedure", label: "테스트 절차", enabled: true },
  { key: "expectedResult", label: "기대결과", enabled: true },
];

const templateFormSchema = z.object({
  name: z.string().min(1, "템플릿 이름을 입력해주세요."),
  description: z.string().optional(),
  constraints: z.string().optional(),
  requirements: z.string().optional(),
  systemPromptOverride: z.string().optional(),
  promptMode: z.enum(["append", "replace"]),
  sheets: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
      }),
    )
    .refine((sheets) => sheets.some((s) => s.name.trim()), {
      message: "최소 하나의 시트 이름을 입력해주세요.",
    }),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Columns managed separately (toggle-based UI)
  const [columns, setColumns] = useState<ColumnDef[]>(
    DEFAULT_COLUMNS.map((c) => ({ ...c }))
  );
  const [newColLabel, setNewColLabel] = useState("");
  const [newColDesc, setNewColDesc] = useState("");

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      constraints: "",
      requirements: "",
      systemPromptOverride: "",
      promptMode: "append",
      sheets: [{ name: "", description: "" }],
    },
  });

  const { fields: sheetFields, append: appendSheet, remove: removeSheet, move: moveSheet } =
    useFieldArray({ control: form.control, name: "sheets" });

  async function loadTemplates() {
    const res = await fetch("/api/templates");
    const data = await res.json();
    setTemplates(data.templates || []);
  }

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/templates");
      const data = await res.json();
      setTemplates(data.templates || []);
    })();
  }, []);

  const resetForm = () => {
    form.reset({
      name: "",
      description: "",
      constraints: "",
      requirements: "",
      systemPromptOverride: "",
      promptMode: "append",
      sheets: [{ name: "", description: "" }],
    });
    setColumns(DEFAULT_COLUMNS.map((c) => ({ ...c })));
    setNewColLabel("");
    setNewColDesc("");
    setIsCreating(false);
  };

  const handleSave = async (values: TemplateFormValues) => {
    const validSheets = values.sheets.filter((s) => s.name.trim());

    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          description: values.description?.trim() || null,
          sheets: validSheets,
          columns: columns.filter((c) => c.enabled),
          constraints: values.constraints?.trim(),
          requirements: values.requirements?.trim(),
          systemPromptOverride: values.systemPromptOverride?.trim() || null,
          promptMode: values.promptMode,
        }),
      });

      if (res.ok) {
        toast.success("템플릿이 저장되었습니다.");
        resetForm();
        loadTemplates();
      } else {
        const data = await res.json();
        toast.error(data.error || "저장에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadTemplates();
  };

  // Drag & drop for sheets
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    moveSheet(dragIdx, idx);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const toggleColumn = (idx: number) => {
    const updated = [...columns];
    updated[idx].enabled = !updated[idx].enabled;
    setColumns(updated);
  };

  const addCustomColumn = () => {
    if (!newColLabel.trim()) return;
    const key = `custom_${Date.now()}`;
    setColumns([
      ...columns,
      {
        key,
        label: newColLabel.trim(),
        enabled: true,
        custom: true,
        description: newColDesc.trim() || undefined,
      },
    ]);
    setNewColLabel("");
    setNewColDesc("");
  };

  const removeCustomColumn = (idx: number) => {
    setColumns(columns.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            QA 템플릿 관리
          </h2>
          <p className="text-muted-foreground">
            TC 생성 시 AI에게 제공할 가이드라인 템플릿을 관리합니다.
          </p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            새 템플릿
          </Button>
        )}
      </div>

      {/* Create Form */}
      {isCreating && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">새 템플릿 만들기</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>템플릿 이름 *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="예: 파트너센터 QA 기본 템플릿"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>설명</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="이 템플릿의 용도를 간략히 설명하세요"
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Sheet Definitions */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <FormLabel className="text-sm font-semibold">
                      시트 구성 (AI가 이 시트 분류를 따릅니다)
                    </FormLabel>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    시트 이름과 설명을 입력하면, AI가 이 카테고리에 맞춰 TC를
                    분류합니다.
                  </p>

                  <div className="space-y-1">
                    {sheetFields.map((sheetField, idx) => (
                      <div
                        key={sheetField.id}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={() => handleDrop(idx)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "flex items-start gap-2 rounded-md border border-transparent px-1 py-1 transition-all",
                          dragIdx === idx && "opacity-40",
                          dragOverIdx === idx &&
                            dragIdx !== idx &&
                            "border-primary bg-primary/5"
                        )}
                      >
                        <GripVertical className="mt-2.5 h-4 w-4 shrink-0 cursor-grab text-muted-foreground/50 active:cursor-grabbing" />
                        <div className="flex flex-1 gap-2">
                          <Input
                            placeholder="시트 이름 (예: 로그인_플로우)"
                            {...form.register(`sheets.${idx}.name`)}
                            className="flex-1"
                          />
                          <Input
                            placeholder="설명 (예: 로그인/로그아웃 관련 TC)"
                            {...form.register(`sheets.${idx}.description`)}
                            className="flex-[2]"
                          />
                        </div>
                        {sheetFields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="mt-0.5 shrink-0"
                            onClick={() => removeSheet(idx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {form.formState.errors.sheets?.root && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.sheets.root.message}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendSheet({ name: "", description: "" })}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    시트 추가
                  </Button>
                </div>

                <Separator />

                {/* Column Config */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Columns3 className="h-4 w-4 text-muted-foreground" />
                    <FormLabel className="text-sm font-semibold">
                      컬럼 구성
                    </FormLabel>
                  </div>

                  {/* Default columns toggle */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">
                      기본 컬럼 (클릭하여 포함/제외)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {columns
                        .filter((c) => !c.custom)
                        .map((col) => {
                          const idx = columns.findIndex(
                            (c) => c.key === col.key
                          );
                          return (
                            <Badge
                              key={col.key}
                              variant={col.enabled ? "default" : "outline"}
                              className="cursor-pointer select-none"
                              onClick={() => toggleColumn(idx)}
                            >
                              {col.label}
                            </Badge>
                          );
                        })}
                    </div>
                  </div>

                  {/* Custom columns */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      커스텀 컬럼 (직접 추가한 컬럼)
                    </p>

                    {columns.filter((c) => c.custom).length > 0 && (
                      <div className="space-y-1.5">
                        {columns
                          .map((col, idx) => ({ col, idx }))
                          .filter(({ col }) => col.custom)
                          .map(({ col, idx }) => (
                            <div
                              key={col.key}
                              className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2"
                            >
                              <div className="flex-1">
                                <span className="text-sm font-medium">
                                  {col.label}
                                </span>
                                {col.description && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    — {col.description}
                                  </span>
                                )}
                              </div>
                              <Badge
                                variant={col.enabled ? "default" : "outline"}
                                className="cursor-pointer select-none text-[10px]"
                                onClick={() => toggleColumn(idx)}
                              >
                                {col.enabled ? "활성" : "비활성"}
                              </Badge>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => removeCustomColumn(idx)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Add custom column */}
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <FormLabel className="text-xs">컬럼 이름</FormLabel>
                        <Input
                          placeholder="예: 우선순위"
                          value={newColLabel}
                          onChange={(e) => setNewColLabel(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex-[2] space-y-1">
                        <FormLabel className="text-xs">
                          설명 (AI에게 전달할 가이드)
                        </FormLabel>
                        <Input
                          placeholder="예: High/Medium/Low 중 선택"
                          value={newColDesc}
                          onChange={(e) => setNewColDesc(e.target.value)}
                          className="h-8 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomColumn();
                            }
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0"
                        onClick={addCustomColumn}
                        disabled={!newColLabel.trim()}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        추가
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Constraints */}
                <FormField
                  control={form.control}
                  name="constraints"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-red-500" />
                        <FormLabel className="text-sm font-semibold">
                          제약조건 (필수 준수)
                        </FormLabel>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        AI가 <strong>반드시</strong> 지켜야 할 규칙입니다. 최우선으로 적용되며, 위반 시 결과물이 부적합해집니다.
                      </p>
                      <FormControl>
                        <Textarea
                          placeholder={`예시:\n- 사전조건에 반드시 로그인 상태(로그인/비로그인)를 명시할 것\n- 에러 케이스의 기대결과에 반드시 실제 에러 메시지 문구를 포함할 것\n- 하나의 TC에 하나의 검증 포인트만 포함할 것 (복합 검증 금지)\n- TC 절차는 반드시 재현 가능한 수준으로 구체적으로 작성할 것`}
                          rows={5}
                          className="border-red-200 font-mono text-xs focus-visible:ring-red-300"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Requirements */}
                <FormField
                  control={form.control}
                  name="requirements"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <div className="flex items-center gap-2">
                        <MessageSquarePlus className="h-4 w-4 text-blue-500" />
                        <FormLabel className="text-sm font-semibold">
                          요구사항 (권장 사항)
                        </FormLabel>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        AI가 가능한 한 반영해야 할 희망 사항입니다. 제약조건보다는 유연하게 적용됩니다.
                      </p>
                      <FormControl>
                        <Textarea
                          placeholder={`예시:\n- 크로스 브라우저(Chrome, Safari, Firefox) 테스트를 포함하면 좋겠음\n- 각 시트당 최소 15개 이상의 TC를 생성해주세요\n- 접근성(a11y) 관련 TC도 포함해주세요\n- 모바일/데스크톱 환경 차이를 고려한 TC가 있으면 좋겠음\n- 보안 관련 TC (XSS, 인젝션 등)도 고려해주세요`}
                          rows={5}
                          className="border-blue-200 font-mono text-xs focus-visible:ring-blue-300"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Separator />

                {/* System Prompt Override */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-purple-500" />
                    <FormLabel className="text-sm font-semibold">
                      시스템 프롬프트 커스터마이즈
                    </FormLabel>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    AI에게 전달되는 시스템 프롬프트를 커스터마이즈합니다. 비워두면 기본 프롬프트가 사용됩니다.
                  </p>

                  <FormField
                    control={form.control}
                    name="promptMode"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-xs">적용 모드</FormLabel>
                        <FormControl>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="radio"
                                value="append"
                                checked={field.value === "append"}
                                onChange={() => field.onChange("append")}
                                className="accent-primary"
                              />
                              <span>추가 모드</span>
                              <span className="text-xs text-muted-foreground">— 기본 프롬프트 뒤에 추가</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="radio"
                                value="replace"
                                checked={field.value === "replace"}
                                onChange={() => field.onChange("replace")}
                                className="accent-primary"
                              />
                              <span>대체 모드</span>
                              <span className="text-xs text-muted-foreground">— 기본 프롬프트를 완전히 대체</span>
                            </label>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="systemPromptOverride"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder={form.watch("promptMode") === "replace"
                              ? "기본 시스템 프롬프트를 완전히 대체할 커스텀 프롬프트를 입력하세요.\n\n주의: 대체 모드에서는 기본 프롬프트가 사용되지 않으므로, TC 생성에 필요한 전체 지침을 포함해야 합니다."
                              : "기본 시스템 프롬프트에 추가할 지침을 입력하세요.\n\n예: 모든 TC에 대해 한글과 영문 병기로 작성해주세요."}
                            rows={6}
                            className="border-purple-200 font-mono text-xs focus-visible:ring-purple-300"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button type="submit">
                    저장
                  </Button>
                  <Button type="button" variant="ghost" onClick={resetForm}>
                    취소
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Template List */}
      {templates.length === 0 && !isCreating ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center text-muted-foreground">
            <FileText className="mb-4 h-12 w-12 opacity-50" />
            <p className="font-medium">저장된 템플릿이 없습니다</p>
            <p className="mt-1 text-sm">
              새 템플릿을 만들어 TC 생성 시 가이드라인으로 활용하세요.
              <br />
              템플릿 없이도 AI 자율 모드로 TC를 생성할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((tmpl) => {
            const sheetList: { name: string; description: string }[] = JSON.parse(tmpl.sheetConfig || "[]");
            const colList: ColumnDef[] = JSON.parse(tmpl.columnConfig || "[]");
            return (
              <Card key={tmpl.id}>
                <CardHeader className="flex flex-row items-start justify-between py-4">
                  <div className="space-y-1">
                    <CardTitle className="text-sm">{tmpl.name}</CardTitle>
                    {tmpl.description && (
                      <p className="text-xs text-muted-foreground">
                        {tmpl.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(tmpl.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      시트:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {sheetList.map((s) => (
                        <Badge
                          key={s.name}
                          variant="secondary"
                          className="text-xs"
                        >
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Columns3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground shrink-0">
                      컬럼:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {colList.map((c) => (
                        <Badge
                          key={c.key}
                          variant={c.custom ? "outline" : "secondary"}
                          className="text-[10px]"
                        >
                          {c.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {tmpl.constraints && (
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        <span className="font-medium text-red-600">제약:</span>{" "}
                        {tmpl.constraints}
                      </p>
                    </div>
                  )}
                  {tmpl.requirements && (
                    <div className="flex items-start gap-2">
                      <MessageSquarePlus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        <span className="font-medium text-blue-600">요구:</span>{" "}
                        {tmpl.requirements}
                      </p>
                    </div>
                  )}
                  {tmpl.systemPromptOverride && (
                    <div className="flex items-start gap-2">
                      <Code className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-400" />
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        <span className="font-medium text-purple-600">
                          프롬프트 ({tmpl.promptMode === "replace" ? "대체" : "추가"}):
                        </span>{" "}
                        {tmpl.systemPromptOverride}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
