import { checkImports } from '../src/rules/imports/index.js';
import { parseCode } from './helpers.js';

const has = (violations, rule) => violations.some((v) => v.rule === rule);
const get = (violations, rule) => violations.find((v) => v.rule === rule);

describe('no-heavy-default-import', () => {
  test('flags default import of lodash', () => {
    const v = checkImports(parseCode(`import _ from 'lodash';`), 'Test.tsx');
    expect(has(v, 'no-heavy-default-import')).toBe(true);
    expect(get(v, 'no-heavy-default-import').severity).toBe('error');
  });

  test('does NOT flag named import of lodash', () => {
    const v = checkImports(parseCode(`import { debounce } from 'lodash';`), 'Test.tsx');
    expect(has(v, 'no-heavy-default-import')).toBe(false);
  });
});

describe('no-barrel-namespace-import', () => {
  test('flags namespace import from react-icons', () => {
    const v = checkImports(parseCode(`import * as Icons from 'react-icons';`), 'Test.tsx');
    expect(has(v, 'no-barrel-namespace-import')).toBe(true);
    expect(get(v, 'no-barrel-namespace-import').severity).toBe('error');
  });

  test('does NOT flag named import from react-icons', () => {
    const v = checkImports(parseCode(`import { FaBeer } from 'react-icons';`), 'Test.tsx');
    expect(has(v, 'no-barrel-namespace-import')).toBe(false);
  });
});

describe('no-duplicate-imports', () => {
  test('flags two imports from the same source', () => {
    const code = `import { a } from './x';\nimport { b } from './x';`;
    const v = checkImports(parseCode(code), 'Test.tsx');
    expect(has(v, 'no-duplicate-imports')).toBe(true);
    expect(get(v, 'no-duplicate-imports').severity).toBe('warn');
  });

  test('does NOT flag distinct sources', () => {
    const code = `import { a } from './x';\nimport { b } from './y';`;
    const v = checkImports(parseCode(code), 'Test.tsx');
    expect(has(v, 'no-duplicate-imports')).toBe(false);
  });
});

describe('no-large-barrel-import', () => {
  test('flags 6 specifiers from a relative ./x/index barrel', () => {
    const code = `import { a, b, c, d, e, f } from './components/index';`;
    const v = checkImports(parseCode(code), 'Test.tsx');
    expect(has(v, 'no-large-barrel-import')).toBe(true);
    expect(get(v, 'no-large-barrel-import').severity).toBe('warn');
  });

  test('does NOT flag 5 specifiers from a barrel', () => {
    const code = `import { a, b, c, d, e } from './components/index';`;
    const v = checkImports(parseCode(code), 'Test.tsx');
    expect(has(v, 'no-large-barrel-import')).toBe(false);
  });
});

describe('no-require-in-esm', () => {
  test('flags require("x") in an ES module', () => {
    const v = checkImports(parseCode(`const fs = require('fs');`), 'Test.tsx');
    expect(has(v, 'no-require-in-esm')).toBe(true);
    expect(get(v, 'no-require-in-esm').severity).toBe('warn');
  });

  test('does NOT flag a normal import', () => {
    const v = checkImports(parseCode(`import fs from 'fs';`), 'Test.tsx');
    expect(has(v, 'no-require-in-esm')).toBe(false);
  });
});

describe('no-unexpected-side-effect-import', () => {
  test('flags a bare side-effect import in a component file', () => {
    const v = checkImports(parseCode(`import 'some-polyfill';`), 'Test.tsx');
    expect(has(v, 'no-unexpected-side-effect-import')).toBe(true);
    expect(get(v, 'no-unexpected-side-effect-import').severity).toBe('warn');
  });

  test('does NOT flag a .css side-effect import', () => {
    const v = checkImports(parseCode(`import './styles.css';`), 'Test.tsx');
    expect(has(v, 'no-unexpected-side-effect-import')).toBe(false);
  });
});
