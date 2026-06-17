import { calcScore } from '../score.js';

export function jsonReport(violations, files, options, parseErrors = []) {
  const errors = violations.filter((v) => v.severity === 'error').length;
  const warnings = violations.filter((v) => v.severity === 'warn').length;

  const output = {
    files: files.length,
    violations: violations.length,
    errors,
    warnings,
    results: violations,
    parseErrors,
  };

  if (options.score) {
    output.score = calcScore(violations, files.length);
  }

  console.log(JSON.stringify(output, null, 2));
}
