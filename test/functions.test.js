import { checkFunctions, extractComponentStyles } from '../src/rules/functions/index.js';
import { parseCode } from './helpers.js';

const has = (violations, rule) => violations.some((v) => v.rule === rule);
const get = (violations, rule) => violations.find((v) => v.rule === rule);

describe('no-anonymous-default-export', () => {
  test('flags an anonymous default function', () => {
    const v = checkFunctions(parseCode(`export default function () {}`), 'Test.tsx');
    expect(has(v, 'no-anonymous-default-export')).toBe(true);
    expect(get(v, 'no-anonymous-default-export').severity).toBe('warn');
  });

  test('flags an anonymous default arrow function', () => {
    const v = checkFunctions(parseCode(`export default () => {};`), 'Test.tsx');
    expect(has(v, 'no-anonymous-default-export')).toBe(true);
  });

  test('does NOT flag a named default function', () => {
    const v = checkFunctions(parseCode(`export default function Foo() {}`), 'Test.tsx');
    expect(has(v, 'no-anonymous-default-export')).toBe(false);
  });
});

describe('extractComponentStyles', () => {
  test('reports a const arrow component as style "arrow"', () => {
    const styles = extractComponentStyles(parseCode(`const Foo = () => <div />;`), 'Test.tsx');
    expect(styles).toContainEqual(expect.objectContaining({ style: 'arrow', name: 'Foo' }));
  });

  test('reports a function declaration component as style "declaration"', () => {
    const styles = extractComponentStyles(parseCode(`function Bar() { return <div />; }`), 'Test.tsx');
    expect(styles).toContainEqual(expect.objectContaining({ style: 'declaration', name: 'Bar' }));
  });

  test('ignores lowercase (non-component) names', () => {
    const styles = extractComponentStyles(parseCode(`const helper = () => 1; function util() {}`), 'Test.tsx');
    expect(styles).toEqual([]);
  });
});
