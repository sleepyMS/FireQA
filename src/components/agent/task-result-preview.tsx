"use client";

import { parseTaskResult } from "@/lib/agent/parse-task-result";
import { TestCaseResults } from "@/components/test-cases/test-case-results";
import { MermaidPreview } from "@/components/diagrams/mermaid-preview";
import { ExternalLink } from "lucide-react";

interface Props {
  taskType: string;
  taskId: string;
  projectName: string;
  rawResult: string;
}

export function TaskResultPreview({ taskType, taskId, projectName, rawResult }: Props) {
  const parsed = parseTaskResult(taskType, rawResult);

  switch (parsed.type) {
    case "tc":
      return (
        <TestCaseResults
          jobId={taskId}
          projectName={projectName}
          sheets={parsed.sheets}
        />
      );

    case "mermaid":
      return (
        <div className="rounded-md border bg-white p-4">
          <MermaidPreview code={parsed.code} />
        </div>
      );

    case "figma-link":
      return (
        <div className="space-y-2">
          {parsed.urls.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md border p-3 text-sm text-primary hover:bg-accent transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Figma에서 보기
            </a>
          ))}
        </div>
      );

    case "raw":
    default:
      return (
        <pre className="whitespace-pre-wrap break-words text-xs font-mono bg-muted rounded-md p-3 max-h-64 overflow-y-auto leading-relaxed">
          {typeof parsed.content === "string" ? parsed.content : JSON.stringify(parsed.content, null, 2)}
        </pre>
      );
  }
}
