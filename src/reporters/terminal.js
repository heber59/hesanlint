import chalk from 'chalk';
import { relative } from 'path';
import { calcScore } from '../score.js';

const SEVERITY_COLOR = {
  error: chalk.red,
  warn: chalk.yellow,
  info: chalk.cyan,
};

const SEVERITY_ICON = {
  error: '✖',
  warn: '⚠',
  info: 'ℹ',
};

export function terminalReport(violations, files, options) {
  const byFile = groupByFile(violations);

  for (const [file, fileViolations] of byFile) {
    const relPath = relative(process.cwd(), file);
    console.log('\n' + chalk.underline(relPath));

    for (const v of fileViolations) {
      const color = SEVERITY_COLOR[v.severity] ?? chalk.white;
      const icon = SEVERITY_ICON[v.severity] ?? '·';
      const loc = chalk.dim(`${v.line}:${String(v.col).padEnd(3)}`);
      const rule = chalk.dim(`[${v.rule}]`);
      console.log(`  ${color(icon)}  ${loc}  ${v.message}  ${rule}`);
      if (v.fix) {
        console.log(`       ${chalk.dim('→')} ${chalk.dim(v.fix)}`);
      }
    }
  }

  console.log('');
  printSummary(violations, files);

  if (options.score) {
    printScore(violations, files.length);
  }
}

function groupByFile(violations) {
  const map = new Map();
  for (const v of violations) {
    if (!map.has(v.file)) map.set(v.file, []);
    map.get(v.file).push(v);
  }
  return map;
}

function printSummary(violations, files) {
  if (violations.length === 0) {
    console.log(chalk.green('✔ No issues found') + chalk.dim(` (${files.length} files)`));
    return;
  }

  const errors = violations.filter((v) => v.severity === 'error').length;
  const warns = violations.filter((v) => v.severity === 'warn').length;
  const infos = violations.filter((v) => v.severity === 'info').length;

  const parts = [];
  if (errors) parts.push(chalk.red(`${errors} error${errors > 1 ? 's' : ''}`));
  if (warns) parts.push(chalk.yellow(`${warns} warning${warns > 1 ? 's' : ''}`));
  if (infos) parts.push(chalk.cyan(`${infos} info`));

  console.log(
    parts.join(chalk.dim(', ')) +
      chalk.dim(` in ${files.length} file${files.length !== 1 ? 's' : ''}`)
  );
}

function printScore(violations, fileCount) {
  const score = calcScore(violations, fileCount);
  const color = score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;
  const filled = Math.round(score / 5);
  const bar = color('█'.repeat(filled)) + chalk.dim('░'.repeat(20 - filled));
  console.log(`\nPerformance Score  ${color.bold(String(score).padStart(3) + '/100')}  ${bar}`);
}

