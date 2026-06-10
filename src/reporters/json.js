export function jsonReport(violations, files, options) {
  const errors = violations.filter((v) => v.severity === 'error').length;
  const warnings = violations.filter((v) => v.severity === 'warn').length;

  const output = {
    files: files.length,
    violations: violations.length,
    errors,
    warnings,
    results: violations,
  };

  if (options.score) {
    const penalty = violations.reduce((acc, v) => {
      if (v.severity === 'error') return acc + 10;
      if (v.severity === 'warn') return acc + 3;
      if (v.severity === 'info') return acc + 1;
      return acc;
    }, 0);
    output.score = files.length > 0 ? Math.max(0, Math.round(100 - penalty / files.length)) : 100;
  }

  console.log(JSON.stringify(output, null, 2));
}
