import { checkExports } from '../src/rules/exports/index.js';
import { parseCode } from './helpers.js';

const has = (violations, rule) => violations.some((v) => v.rule === rule);
const get = (violations, rule) => violations.find((v) => v.rule === rule);

describe('no-default-export-object', () => {
  test('flags export default of a non-empty object', () => {
    const code = `const a = 1, b = 2; export default { a, b };`;
    const v = checkExports(parseCode(code), 'Test.tsx');
    expect(has(v, 'no-default-export-object')).toBe(true);
    expect(get(v, 'no-default-export-object').severity).toBe('error');
  });

  test('does NOT flag a named default export', () => {
    const code = `export default function Foo() {}`;
    const v = checkExports(parseCode(code), 'Test.tsx');
    expect(has(v, 'no-default-export-object')).toBe(false);
  });
});

describe('no-wildcard-external-reexport', () => {
  test('flags export * from an external package', () => {
    const v = checkExports(parseCode(`export * from 'lodash';`), 'Test.tsx');
    expect(has(v, 'no-wildcard-external-reexport')).toBe(true);
    expect(get(v, 'no-wildcard-external-reexport').severity).toBe('error');
  });

  test('does NOT flag export * from a relative source', () => {
    const v = checkExports(parseCode(`export * from './x';`), 'Test.tsx');
    expect(has(v, 'no-wildcard-external-reexport')).toBe(false);
  });
});
