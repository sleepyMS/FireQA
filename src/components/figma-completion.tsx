interface FigmaCompletionProps {
  description: string;
  figmaFileKey: string;
  summary?: string;
}

export function FigmaCompletion({ description, figmaFileKey, summary }: FigmaCompletionProps) {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🎨</span>
        <h3 className="font-semibold">Figma에 생성 완료</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        {description}이 Figma 파일에 직접 생성되었습니다.
      </p>
      <a
        href={`https://www.figma.com/design/${figmaFileKey}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-primary underline hover:no-underline"
      >
        Figma에서 열기 →
      </a>
      {summary && (
        <pre className="mt-3 rounded bg-muted p-3 text-xs whitespace-pre-wrap">{summary}</pre>
      )}
    </div>
  );
}
