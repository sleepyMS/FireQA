export function estimateTokens(text: string): number {
  return Math.ceil(text.length * 1.5);
}

export function splitDocument(text: string, maxTokens: number = 80000): string[] {
  const estimated = estimateTokens(text);
  if (estimated <= maxTokens) return [text];

  const sections = text.split(/(?=^===\s)/m);
  if (sections.length > 1) return sections.filter((s) => s.trim().length > 0);

  const lines = text.split("\n");
  const chunks: string[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  for (const line of lines) {
    const lineTokens = estimateTokens(line);
    if (currentTokens + lineTokens > maxTokens && current.length > 0) {
      chunks.push(current.join("\n"));
      current = [];
      currentTokens = 0;
    }
    current.push(line);
    currentTokens += lineTokens;
  }

  if (current.length > 0) chunks.push(current.join("\n"));
  return chunks;
}
