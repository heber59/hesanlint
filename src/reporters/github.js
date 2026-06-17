import { appendFileSync } from 'fs';
import { relative, sep } from 'path';
import { calcScore } from '../score.js';

export function githubReport(violations, files, options) {
  for (const v of violations) {
    const level = v.severity === 'error' ? 'error' : 'warning';
    const file = relative(process.cwd(), v.file).split(sep).join('/');
    console.log(`::${level} file=${file},line=${v.line},col=${v.col}::hesanlint[${v.rule}] ${v.message}`);
  }

  if (options.score) {
    const score = calcScore(violations, files.length);
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

  let md = `\n## hesanlint\n\n`;
  md += `| Files scanned | Errors | Warnings |\n|:---:|:---:|:---:|\n`;
  md += `| ${files.length} | ${errors} | ${warns} |\n\n`;
  md += `| File | Line | Severity | Rule |\n|---|:---:|:---:|---|\n`;

  for (const v of violations.slice(0, 50)) {
    const file = relative(process.cwd(), v.file).split(sep).join('/');
    md += `| \`${file}\` | ${v.line} | ${v.severity} | \`${v.rule}\` |\n`;
  }

  if (violations.length > 50) {
    md += `\n_…and ${violations.length - 50} more_\n`;
  }

  return md;
}
