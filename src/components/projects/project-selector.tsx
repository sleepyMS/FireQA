"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import useSWR from "swr";
import { SWR_KEYS } from "@/lib/swr/keys";

type Project = { id: string; name: string };

type ProjectValue =
  | { type: "existing"; id: string; name: string }
  | { type: "new"; name: string };

interface ProjectSelectorProps {
  value: ProjectValue | null;
  onChange: (value: ProjectValue) => void;
  disabled?: boolean;
}

export function ProjectSelector({
  value,
  onChange,
  disabled,
}: ProjectSelectorProps) {
  const { data } = useSWR<{ projects: Project[] }>(SWR_KEYS.projects("status=active&limit=50"));
  const projects = data?.projects ?? [];
  const [inputValue, setInputValue] = useState(value?.name || "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  function updateDropdownPosition() {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(inputValue.toLowerCase())
  );
  const exactMatch = projects.find(
    (p) => p.name.toLowerCase() === inputValue.toLowerCase()
  );
  const showNewOption = inputValue.trim() && !exactMatch;

  function handleInputChange(text: string) {
    setInputValue(text);
    setOpen(true);
  }

  function selectExisting(p: Project) {
    setInputValue(p.name);
    setOpen(false);
    onChange({ type: "existing", id: p.id, name: p.name });
  }

  function selectNew() {
    const name = inputValue.trim();
    if (!name) return;
    setOpen(false);
    onChange({ type: "new", name });
  }

  const dropdown = open && (inputValue || filtered.length > 0) && (
    <div style={dropdownStyle} className="z-50 rounded-md border bg-popover shadow-md">
      {filtered.slice(0, 10).map((p) => (
        <button
          key={p.id}
          type="button"
          onMouseDown={() => selectExisting(p)}
          className="flex w-full items-center px-3 py-2 text-sm hover:bg-accent text-left"
        >
          {p.name}
        </button>
      ))}
      {showNewOption && (
        <button
          type="button"
          onMouseDown={selectNew}
          className="flex w-full items-center px-3 py-2 text-sm hover:bg-accent text-left text-primary"
        >
          + 새 프로젝트로 생성: &quot;{inputValue.trim()}&quot;
        </button>
      )}
      {!filtered.length && !showNewOption && (
        <div className="px-3 py-2 text-sm text-muted-foreground">
          검색 결과 없음
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => { updateDropdownPosition(); setOpen(true); }}
        placeholder="프로젝트 이름 입력 또는 선택"
        disabled={disabled}
      />
      {dropdown && createPortal(dropdown, document.body)}
    </div>
  );
}
