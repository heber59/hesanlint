const WEIGHTS = { error: 10, warn: 3, info: 1 };

export function calcScore(violations, fileCount) {
  if (fileCount === 0) return 100;
  const penalty = violations.reduce((acc, v) => acc + (WEIGHTS[v.severity] ?? 0), 0);
  return Math.max(0, Math.round(100 - penalty / fileCount));
}
