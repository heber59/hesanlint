import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { run } from '../src/runner.js';

const root = process.cwd();
const workspace = mkdtempSync(join(root, '.lint-evaluator-'));

async function runHesanlint(target, options = {}) {
  const output = [];
  const errors = [];
  const warnings = [];
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args) => output.push(args.join(' '));
  console.error = (...args) => errors.push(args.join(' '));
  console.warn = (...args) => warnings.push(args.join(' '));

  try {
    const status = await run(target, options);
    return {
      status,
      stdout: output.join('\n'),
      stderr: [...errors, ...warnings].join('\n'),
    };
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }
}

function parseJson(stdout, label) {
  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error(`${label}: expected JSON output, received:\n${stdout || '(empty stdout)'}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const cleanDir = join(workspace, 'clean');
  const badDir = join(workspace, 'bad');
  mkdirSync(cleanDir, { recursive: true });
  mkdirSync(badDir, { recursive: true });

  writeFileSync(
    join(cleanDir, 'Clean.tsx'),
    `
import React from 'react';

export function Clean({ items }: { items: string[] }) {
  return <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}
`.trimStart()
  );

  writeFileSync(
    join(badDir, 'Bad.tsx'),
    `
import _ from 'lodash';
import React, { useEffect } from 'react';

export default function Bad({ items }: { items: string[] }) {
  useEffect(() => {}, [{ id: 1 }]);
  return <ul>{items.map((item) => <li>{_.startCase(item)}</li>)}</ul>;
}
`.trimStart()
  );

  const clean = await runHesanlint(cleanDir, { format: 'json', score: true });
  const cleanJson = parseJson(clean.stdout, 'clean project');
  assert(clean.status === 0, `clean project should pass, exited ${clean.status}`);
  assert(cleanJson.errors === 0, `clean project should have 0 errors, got ${cleanJson.errors}`);
  assert(cleanJson.violations === 0, `clean project should have 0 violations, got ${cleanJson.violations}`);

  const bad = await runHesanlint(badDir, { format: 'json', score: true });
  const badJson = parseJson(bad.stdout, 'bad project');
  const badRules = new Set(badJson.results.map((result) => result.rule));
  assert(bad.status === 1, `bad project should fail, exited ${bad.status}`);
  assert(badJson.errors >= 2, `bad project should report multiple errors, got ${badJson.errors}`);
  assert(badRules.has('no-heavy-default-import'), 'bad project should catch no-heavy-default-import');
  assert(badRules.has('useeffect-object-dep'), 'bad project should catch useeffect-object-dep');
  assert(badRules.has('missing-key-prop'), 'bad project should catch missing-key-prop');

  const ci = await runHesanlint(badDir, { ci: true, score: true });
  assert(ci.status === 1, `CI mode should fail on errors, exited ${ci.status}`);
  assert(ci.stdout.includes('::error file='), 'CI mode should emit GitHub error annotations');
  assert(ci.stdout.includes('Performance Score:'), 'CI mode should emit a performance score');

  console.log('lint evaluator agent: pass');
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
