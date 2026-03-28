"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, FolderOpen, FileText, MessageSquare } from "lucide-react";
import { JOB_TYPE_LABEL } from "@/types/enums";

interface SearchResults {
  projects: { id: string; name: string; description: string | null; status: string }[];
  jobs: { id: string; type: string; status: string; projectName: string; createdAt: string }[];
  comments: { id: string; body: string; jobId: string | null; createdAt: string }[];
}

const JOB_TYPE_PATH: Record<string, string> = {
  "test-cases": "generate",
  diagrams: "diagrams",
  wireframes: "wireframes",
  "spec-improve": "improve",
};

export function SearchDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cmd+K / Ctrl+K 단축키
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 열릴 때 input 포커스
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults(null);
    }
  }, [open]);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults(null); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) setResults(await res.json());
      } finally {
        setLoading(false);
      }
    }, 250);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    search(e.target.value);
  }

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  const hasResults =
    results &&
    (results.projects.length > 0 || results.jobs.length > 0 || results.comments.length > 0);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-xl border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 검색 입력 */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            placeholder="프로젝트, 작업, 코멘트 검색..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
          <kbd className="hidden rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            ESC
          </kbd>
        </div>

        {/* 결과 */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {!query.trim() && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              검색어를 입력하세요
            </p>
          )}

          {query.trim() && !loading && !hasResults && (
            <p className="py-6 text-center text-xs text-muted-foreground">검색 결과가 없습니다</p>
          )}

          {results?.projects && results.projects.length > 0 && (
            <div className="mb-1">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                프로젝트
              </p>
              {results.projects.map((p) => (
                <button
                  key={p.id}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate font-medium">{p.name}</span>
                  {p.description && (
                    <span className="truncate text-xs text-muted-foreground max-w-[160px]">
                      {p.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {results?.jobs && results.jobs.length > 0 && (
            <div className="mb-1">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                작업
              </p>
              {results.jobs.map((j) => (
                <button
                  key={j.id}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => navigate(`/${JOB_TYPE_PATH[j.type] ?? "generate"}/${j.id}`)}
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate font-medium">{j.projectName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {JOB_TYPE_LABEL[j.type] ?? j.type}
                  </span>
                </button>
              ))}
            </div>
          )}

          {results?.comments && results.comments.length > 0 && (
            <div className="mb-1">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                코멘트
              </p>
              {results.comments.map((c) => (
                <button
                  key={c.id}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() =>
                    navigate(c.jobId ? `/generate/${c.jobId}` : "/history")
                  }
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-muted-foreground">{c.body}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 하단 힌트 */}
        <div className="border-t px-4 py-2 text-[10px] text-muted-foreground">
          <kbd className="rounded border px-1 py-0.5">↵</kbd> 이동
          &nbsp;·&nbsp;
          <kbd className="rounded border px-1 py-0.5">ESC</kbd> 닫기
        </div>
      </div>
    </div>
  );
}
