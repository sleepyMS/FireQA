// Average AI response size used to estimate streaming progress
const ESTIMATED_RESPONSE_SIZE = 10_000;

export function calcProgress(
  receivedLength: number,
  pMin: number,
  pMax: number,
): number {
  const ratio = Math.min(receivedLength / ESTIMATED_RESPONSE_SIZE, 0.95);
  return Math.round(pMin + (pMax - pMin) * ratio);
}
