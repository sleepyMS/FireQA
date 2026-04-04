"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });
import remarkGfm from "remark-gfm";
import { Copy, Download, GitCompare, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SpecImproveSummary } from "@/types/spec-improve";
import { VersionBar } from "@/components/versions/version-bar";
import { useLocale } from "@/lib/i18n/locale-provider";

interface SpecImproveResultsProps {
  jobId: string;
  markdown: string;
  summary: SpecImproveSummary;
  originalFileName: string;
}

export function SpecImproveResults({ jobId, markdown, summary, originalFileName }: SpecImproveResultsProps) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `improved-${originalFileName.replace(/\.[^.]+$/, "")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <VersionBar jobId={jobId} />
      {/* 변경 요약 카드 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t.specImprove.improveSummaryTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t.specImprove.totalSections.replace("{count}", String(summary.totalSections))}
          </p>
          {summary.changeHighlights.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {summary.changeHighlights.map((h, i) => (
                <Badge key={i} variant="secondary">{h}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check className="mr-1.5 h-3.5 w-3.5 text-green-600" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
          {copied ? t.specImprove.copied : t.specImprove.copyMarkdown}
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          {t.specImprove.downloadMd}
        </Button>
        <Button
          variant={showComparison ? "default" : "outline"}
          size="sm"
          onClick={() => setShowComparison(!showComparison)}
        >
          <GitCompare className="mr-1.5 h-3.5 w-3.5" />
          {t.specImprove.compareOriginal}
        </Button>
      </div>

      {/* 원문 비교 모드 */}
      {showComparison ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {t.specImprove.originalFileName.replace("{name}", originalFileName)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t.specImprove.originalHint}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t.specImprove.improvedSpec}</CardTitle>
            </CardHeader>
            <CardContent>
              <MarkdownRenderer markdown={markdown} />
            </CardContent>
          </Card>
        </div>
      ) : (
        /* 단독 결과 렌더링 */
        <Card>
          <CardContent className="py-2">
            <MarkdownRenderer markdown={markdown} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MarkdownRenderer({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-3">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-semibold mt-5 mb-2 pb-1 border-b">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>,
        h4: ({ children }) => <h4 className="text-base font-semibold mt-3 mb-1">{children}</h4>,
        p: ({ children }) => <p className="my-2 text-sm leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1 text-sm">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1 text-sm">{children}</ol>,
        li: ({ children }) => <li className="text-sm">{children}</li>,
        blockquote: ({ children }) => <blockquote className="my-3 border-l-4 border-amber-400 bg-amber-50 pl-4 py-2 text-sm text-amber-800">{children}</blockquote>,
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          return isBlock
            ? <code className="block my-3 rounded-md bg-muted p-4 text-xs font-mono overflow-x-auto">{children}</code>
            : <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{children}</code>;
        },
        pre: ({ children }) => <pre className="my-3 overflow-x-auto rounded-md bg-muted p-4 text-xs">{children}</pre>,
        table: ({ children }) => <div className="my-3 overflow-x-auto"><table className="w-full text-sm border-collapse">{children}</table></div>,
        thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
        th: ({ children }) => <th className="border border-border px-3 py-2 text-left font-semibold text-xs">{children}</th>,
        td: ({ children }) => <td className="border border-border px-3 py-2 text-sm">{children}</td>,
        hr: () => <hr className="my-4 border-border" />,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        a: ({ href, children }) => <a href={href} className="text-primary underline-offset-4 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
