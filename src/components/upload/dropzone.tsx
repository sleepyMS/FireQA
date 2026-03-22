"use client";

import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/markdown",
];

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".txt", ".md"];

interface DropzoneProps {
  onFileSelected: (file: File) => void;
}

export function Dropzone({ onFileSelected }: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <div
      className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        className="absolute inset-0 cursor-pointer opacity-0"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        onChange={handleChange}
      />
      <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">
        파일을 드래그하거나 클릭하여 업로드
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        PDF, DOCX, XLSX, TXT, MD 지원
      </p>
    </div>
  );
}
