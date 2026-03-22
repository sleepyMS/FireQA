"use client";

import { useEffect, useState, useCallback } from "react";

interface MermaidPreviewProps {
  code: string;
  onRenderError?: (error: string) => void;
  onRenderSuccess?: () => void;
}

function sanitizeMermaidCode(code: string): string {
  let s = code.trim();
  s = s.replace(
    /\(\(([^)]*)\)\)/g,
    (_, c) => `(("${c.replace(/"/g, "'")}"))`
  );
  s = s.replace(
    /\[([^\]"]*[가-힣/()][^\]"]*)\]/g,
    (_, c) => `["${c.replace(/"/g, "'")}"]`
  );
  return s;
}

function renderInIframe(code: string): Promise<{ svg: string } | { error: string }> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;border:none;";
    document.body.appendChild(iframe);

    const timeout = setTimeout(() => {
      cleanup();
      resolve({ error: "렌더링 타임아웃 (15초)" });
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      window.removeEventListener("message", handler);
      try { document.body.removeChild(iframe); } catch {}
    }

    function handler(event: MessageEvent) {
      if (event.data?.type !== "mermaid-result") return;
      cleanup();
      if (event.data.svg) {
        resolve({ svg: event.data.svg });
      } else {
        resolve({ error: event.data.error || "렌더링 실패" });
      }
    }

    window.addEventListener("message", handler);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      cleanup();
      resolve({ error: "iframe 생성 실패" });
      return;
    }

    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html>
<html><head></head><body>
<script type="module">
import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "loose" });
try {
  const { svg } = await mermaid.render("m-" + Date.now(), ${JSON.stringify(code)});
  window.parent.postMessage({ type: "mermaid-result", svg }, "*");
} catch(e) {
  window.parent.postMessage({ type: "mermaid-result", error: e.message || String(e) }, "*");
}
<\/script></body></html>`);
    iframeDoc.close();
  });
}

export function MermaidPreview({
  code,
  onRenderError,
  onRenderSuccess,
}: MermaidPreviewProps) {
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  const stableOnError = useCallback(
    (msg: string) => onRenderError?.(msg),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const stableOnSuccess = useCallback(
    () => onRenderSuccess?.(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setSvgHtml(null);

    const run = async () => {
      // 1차: 원본 코드
      const result1 = await renderInIframe(code);
      if (cancelled) return;

      if ("svg" in result1) {
        setSvgHtml(result1.svg);
        setStatus("ok");
        stableOnSuccess();
        return;
      }

      // 2차: 정제 코드
      const sanitized = sanitizeMermaidCode(code);
      if (sanitized !== code) {
        const result2 = await renderInIframe(sanitized);
        if (cancelled) return;

        if ("svg" in result2) {
          setSvgHtml(result2.svg);
          setStatus("ok");
          stableOnSuccess();
          return;
        }
      }

      // 실패
      if (cancelled) return;
      setStatus("error");
      stableOnError(result1.error);
    };

    run();
    return () => { cancelled = true; };
  }, [code, stableOnError, stableOnSuccess]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[200px] animate-pulse items-center justify-center">
        <p className="text-sm text-muted-foreground">렌더링 중...</p>
      </div>
    );
  }

  if (status === "error" || !svgHtml) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        {/* 에러 UI는 부모(diagram-results)에서 onRenderError 콜백으로 처리 */}
      </div>
    );
  }

  return (
    <div
      className="flex min-h-[200px] items-center justify-center overflow-auto"
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}
