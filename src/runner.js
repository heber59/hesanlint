import { existsSync, readFileSync, statSync } from 'fs';
import { resolve, dirname, join, relative, parse as parsePath } from 'path';
import fg from 'fast-glob';
const { globSync } = fg;
import { parseFile } from './parser.js';
import { checkImports } from './rules/imports/index.js';
import { checkHooks } from './rules/hooks/index.js';
import { checkFunctions, extractComponentStyles } from './rules/functions/index.js';
import { checkExports } from './rules/exports/index.js';
import { checkReact } from './rules/react/index.js';
import { checkCycles } from './rules/cycles/index.js';
import { applyFixes } from './fixer.js';
import { terminalReport } from './reporters/terminal.js';
import { githubReport } from './reporters/github.js';
import { jsonReport } from './reporters/json.js';

const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/*.d.ts',
  '**/dist/**',
  '**/.next/**',
  '**/build/**',
  '**/.turbo/**',
];

const FILE_CHECKERS = [
  checkImports,
  checkHooks,
  checkFunctions,
  checkExports,
  checkReact,
];

function findConfig(startDir) {
  let dir = startDir;
  const { root } = parsePath(dir);
  while (true) {
    const configPath = join(dir, '.hesanlintrc.json');
    if (existsSync(configPath)) return configPath;
    if (dir === root) break;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function loadConfig(startDir) {
  let configPath = findConfig(startDir);
  if (!configPath) configPath = findConfig(process.cwd());
  if (!configPath) return { rules: {}, ignore: [] };
  try {
    return JSON.parse(readFileSync(configPath, 'utf8'));
  } catch {
    return { rules: {}, ignore: [] };
  }
}

export async function run(targetPath, options = {}) {
  const absTarget = resolve(targetPath);

  if (!existsSync(absTarget)) {
    console.error(`hesanlint: path not found: ${targetPath}`);
    return 1;
  }

  const isDir = statSync(absTarget).isDirectory();
  const configStartDir = isDir ? absTarget : dirname(absTarget);
  const config = loadConfig(configStartDir);
  const ignorePatterns = [...DEFAULT_IGNORE, ...(config.ignore ?? [])];
  if (options.ignore) ignorePatterns.push(options.ignore);

  const isDirectory = isDir;

  const files = isDirectory
    ? globSync('**/*.{js,jsx,ts,tsx}', {
        cwd: absTarget,
        absolute: true,
        ignore: ignorePatterns,
      })
    : [absTarget];

  if (files.length === 0) {
    console.log('hesanlint: no files matched');
    return 0;
  }

  const allViolations = [];
  const parseErrors = [];
  let totalFixed = 0;

  // Cycle detection runs on the whole directory
  const ruleFilter = options.rule?.toLowerCase();
  const runCycles = !ruleFilter || 'no-dependency-cycle'.includes(ruleFilter);
  if (runCycles) {
    const cycleDir = isDirectory ? absTarget : dirname(absTarget);
    const cycleViolations = await checkCycles(cycleDir);
    allViolations.push(...applyConfig(cycleViolations, config));
  }

  // Per-file checks
  const projectStylesMap = new Map(); // file → [{style, name, line}]

  for (const file of files) {
    let ast;
    try {
      ast = parseFile(file);
    } catch (err) {
      parseErrors.push({ file, message: err?.message ?? String(err) });
      continue;
    }

    const fileViolations = [];

    for (const checker of FILE_CHECKERS) {
      let violations;
      try {
        violations = checker(ast, file);
      } catch {
        continue;
      }
      const filtered = applyConfig(violations, config, ruleFilter);
      fileViolations.push(...filtered.map((v) => ({ ...v, file })));
    }

    if (options.fix) {
      const fixed = new Set();
      totalFixed += applyFixes(file, fileViolations, fixed);
      allViolations.push(...fileViolations.filter((v) => !fixed.has(v)));
    } else {
      allViolations.push(...fileViolations);
    }

    // Collect style metadata for project-wide consistency check
    const styleEnabled = !ruleFilter || 'consistent-component-style'.includes(ruleFilter);
    const styleOff = config.rules?.['consistent-component-style'] === 'off';
    if (styleEnabled && !styleOff) {
      try {
        const styles = extractComponentStyles(ast, file);
        if (styles.length) projectStylesMap.set(file, styles);
      } catch {
        // ignore
      }
    }
  }

  // Project-wide component style consistency
  if (projectStylesMap.size >= 2) {
    let arrowTotal = 0;
    let declarationTotal = 0;
    for (const styles of projectStylesMap.values()) {
      for (const s of styles) {
        if (s.style === 'arrow') arrowTotal++;
        else declarationTotal++;
      }
    }
    const dominant = arrowTotal >= declarationTotal ? 'arrow' : 'declaration';
    const dominantLabel = dominant === 'arrow' ? 'arrow functions (const X = () => {})' : 'function declarations (function X() {})';
    const offenderLabel = dominant === 'arrow' ? 'function declaration' : 'arrow function';

    for (const [file, styles] of projectStylesMap) {
      const severity = config.rules?.['consistent-component-style'] ?? 'warn';
      if (severity === 'off') continue;

      for (const offender of styles) {
        if (offender.style === dominant) continue;

        allViolations.push({
          rule: 'consistent-component-style',
          severity,
          message: `${offender.name} is a ${offenderLabel} but the project uses ${dominantLabel} (${arrowTotal} arrow vs ${declarationTotal} declaration across project).`,
          line: offender.line,
          col: 0,
          file,
          fix: `Convert to match project style: ${dominant === 'arrow' ? `const ${offender.name} = () => { ... }` : `function ${offender.name}() { ... }`}`,
        });
      }
    }
  }

  if (totalFixed > 0) {
    console.log(`\nhesanlint: fixed ${totalFixed} violation${totalFixed > 1 ? 's' : ''}`);
  }

  const reporter =
    options.ci ? githubReport :
    options.format === 'json' ? jsonReport :
    terminalReport;

  reporter(allViolations, files, options, parseErrors);

  // Surface parse failures (json reporter includes them in its output object instead)
  if (parseErrors.length > 0 && options.format !== 'json') {
    console.warn(
      `\nhesanlint: skipped ${parseErrors.length} file${parseErrors.length > 1 ? 's' : ''} that failed to parse`
    );
    for (const { file, message } of parseErrors) {
      const rel = relative(process.cwd(), file);
      console.warn(`  - ${rel}: ${message}`);
    }
  }

  return allViolations.some((v) => v.severity === 'error') ? 1 : 0;
}

function applyConfig(violations, config, ruleFilter) {
  return violations.filter((v) => {
    if (ruleFilter && !v.rule.includes(ruleFilter)) return false;
    const override = config.rules?.[v.rule];
    if (override === 'off') return false;
    if (override) v.severity = override;
    return true;
  });
}
