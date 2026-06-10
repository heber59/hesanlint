import { readFileSync, writeFileSync } from 'fs';

/**
 * Applies safe auto-fixes in-place to `file`.
 * Adds fixed violations to `fixedSet` so the caller can exclude them from the report.
 * Returns the number of fixes applied.
 */
export function applyFixes(file, violations, fixedSet) {
  const fixable = violations.filter((v) => v.autofix);
  if (!fixable.length) return 0;

  const lines = readFileSync(file, 'utf8').split('\n');
  let fixCount = 0;

  // Process bottom-to-top so splice offsets stay valid
  const sorted = [...fixable].sort((a, b) => b.line - a.line);

  for (const v of sorted) {
    let applied = false;

    if (v.autofix.type === 'merge-import') {
      applied = mergeDuplicateImport(lines, v.autofix);
    }

    if (applied) {
      fixedSet.add(v);
      fixCount++;
    }
  }

  if (fixCount > 0) writeFileSync(file, lines.join('\n'));
  return fixCount;
}

// Only handles simple named imports: import { A, B } from '...'
// Skips default imports, namespace imports, or multi-line imports.
function mergeDuplicateImport(lines, { firstLine, dupLine }) {
  const i1 = firstLine - 1;
  const i2 = dupLine - 1;
  if (i1 < 0 || i2 < 0 || i1 >= lines.length || i2 >= lines.length) return false;

  const l1 = lines[i1];
  const l2 = lines[i2];

  const namedRe = /^import\s*\{([^}]+)\}\s*from\s*(['"])([^'"]+)\2\s*;?\s*$/;
  const m1 = l1.match(namedRe);
  const m2 = l2.match(namedRe);
  if (!m1 || !m2) return false;

  const specs = [...new Set([
    ...m1[1].split(',').map((s) => s.trim()).filter(Boolean),
    ...m2[1].split(',').map((s) => s.trim()).filter(Boolean),
  ])].sort();

  const quote = m1[2];
  const semi = l1.trimEnd().endsWith(';') ? ';' : '';
  lines[i1] = `import { ${specs.join(', ')} } from ${quote}${m1[3]}${quote}${semi}`;
  lines.splice(i2, 1);
  return true;
}
