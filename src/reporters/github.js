import { appendFileSync } from 'fs';

export function githubReport(violations, files, options) {
  const cwd = process.cwd() + '/';

  for (const v of violations) {
    const level = v.severity === 'error' ? 'error' : 'warning';
    const file = v.file.startsWith(cwd) ? v.file.slice(cwd.length) : v.file;
    console.log(`::${level} file=${file},line=${v.line},col=${v.col}::hesanlint[${v.rule}] ${v.message}`);
  }

  if (options.score) {
    const errors = violations.filter((v) => v.severity === 'error').length;
    const warns = violations.filter((v) => v.severity === 'warn').length;
    const fileCount = files.length;
    const penalty = errors * 10 + warns * 3;
    const score = fileCount > 0 ? Math.max(0, Math.round(100 - penalty / fileCount)) : 100;
    console.log(`\nPerformance Score: ${score}/100`);
  }

  // Write markdown table to GitHub Job Summary when available
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile && violations.length > 0) {
    appendFileSync(summaryFile, buildMarkdownSummary(violations, files));
  }
}

function buildMarkdownSummary(violations, files) {
  const errors = violations.filter((v) => v.severity === 'error').length;
  const warns = violations.filter((v) => v.severity === 'warn').length;
  const cwd = process.cwd() + '/';

  let md = `\n## hesanlint\n\n`;
  md += `| Files scanned | Errors | Warnings |\n|:---:|:---:|:---:|\n`;
  md += `| ${files.length} | ${errors} | ${warns} |\n\n`;
  md += `| File | Line | Severity | Rule |\n|---|:---:|:---:|---|\n`;

  for (const v of violations.slice(0, 50)) {
    const file = v.file.startsWith(cwd) ? v.file.slice(cwd.length) : v.file;
    md += `| \`${file}\` | ${v.line} | ${v.severity} | \`${v.rule}\` |\n`;
  }

  if (violations.length > 50) {
    md += `\n_…and ${violations.length - 50} more_\n`;
  }

  return md;
}
