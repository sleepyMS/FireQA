interface ExportButtonProps {
  href: string;
  label: string;
}

export function ExportButton({ href, label }: ExportButtonProps) {
  return (
    <a href={href} download>
      <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
        {label}
      </span>
    </a>
  );
}
