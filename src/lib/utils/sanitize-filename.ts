export function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 50) || "project"
  );
}
