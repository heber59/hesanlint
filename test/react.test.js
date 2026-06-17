import { checkReact } from '../src/rules/react/index.js';
import { parseCode } from './helpers.js';

const has = (violations, rule) => violations.some((v) => v.rule === rule);
const get = (violations, rule) => violations.find((v) => v.rule === rule);
const count = (violations, rule) => violations.filter((v) => v.rule === rule).length;

describe('missing-key-prop', () => {
  test('flags a simple .map without key', () => {
    const code = `const list = items.map(x => <Item />);`;
    const v = checkReact(parseCode(code), 'Test.tsx');
    expect(has(v, 'missing-key-prop')).toBe(true);
    expect(get(v, 'missing-key-prop').severity).toBe('error');
  });

  // Regression: getReturnedJSX rewrite must visit BOTH ternary branches.
  test('flags both branches of a ternary in .map without keys', () => {
    const code = `const list = items.map(x => cond ? <A /> : <B />);`;
    const v = checkReact(parseCode(code), 'Test.tsx');
    expect(count(v, 'missing-key-prop')).toBe(2);
  });

  // Regression: logical && in .map.
  test('flags && branch in .map without key', () => {
    const code = `const list = items.map(x => cond && <A />);`;
    const v = checkReact(parseCode(code), 'Test.tsx');
    expect(has(v, 'missing-key-prop')).toBe(true);
  });

  // Regression: .flatMap must be covered too.
  test('flags .flatMap without key', () => {
    const code = `const list = items.flatMap(x => <A />);`;
    const v = checkReact(parseCode(code), 'Test.tsx');
    expect(has(v, 'missing-key-prop')).toBe(true);
  });

  test('does NOT flag elements WITH keys', () => {
    const code = `const list = items.map(x => <Item key={x.id} />);`;
    const v = checkReact(parseCode(code), 'Test.tsx');
    expect(has(v, 'missing-key-prop')).toBe(false);
  });

  test('does NOT flag a ternary where both branches have keys', () => {
    const code = `const list = items.map(x => cond ? <A key={x.id} /> : <B key={x.id} />);`;
    const v = checkReact(parseCode(code), 'Test.tsx');
    expect(has(v, 'missing-key-prop')).toBe(false);
  });
});

describe('no-inline-function-prop', () => {
  test('flags an inline arrow on onClick', () => {
    const code = `const el = <button onClick={() => doThing()} />;`;
    const v = checkReact(parseCode(code), 'Test.tsx');
    expect(has(v, 'no-inline-function-prop')).toBe(true);
    expect(get(v, 'no-inline-function-prop').severity).toBe('warn');
  });

  test('does NOT flag a named handler reference', () => {
    const code = `const el = <button onClick={handleClick} />;`;
    const v = checkReact(parseCode(code), 'Test.tsx');
    expect(has(v, 'no-inline-function-prop')).toBe(false);
  });
});

describe('no-inline-style-object', () => {
  test('flags an inline style object', () => {
    const code = `const el = <div style={{ color: 'red' }} />;`;
    const v = checkReact(parseCode(code), 'Test.tsx');
    expect(has(v, 'no-inline-style-object')).toBe(true);
    expect(get(v, 'no-inline-style-object').severity).toBe('warn');
  });

  test('does NOT flag a style variable reference', () => {
    const code = `const el = <div style={styles} />;`;
    const v = checkReact(parseCode(code), 'Test.tsx');
    expect(has(v, 'no-inline-style-object')).toBe(false);
  });
});

describe('no-array-index-key', () => {
  test('flags key={i} where i is the map index param', () => {
    const code = `const list = items.map((item, i) => <Item key={i} />);`;
    const v = checkReact(parseCode(code), 'Test.tsx');
    expect(has(v, 'no-array-index-key')).toBe(true);
    expect(get(v, 'no-array-index-key').severity).toBe('warn');
  });

  test('does NOT flag a stable key', () => {
    const code = `const list = items.map((item, i) => <Item key={item.id} />);`;
    const v = checkReact(parseCode(code), 'Test.tsx');
    expect(has(v, 'no-array-index-key')).toBe(false);
  });
});

describe('tailwind-unsafe-class-concat', () => {
  test('flags string concatenation in className', () => {
    const code = `const el = <div className={'px-4 ' + cls} />;`;
    const v = checkReact(parseCode(code), 'Test.tsx');
    expect(has(v, 'tailwind-unsafe-class-concat')).toBe(true);
    expect(get(v, 'tailwind-unsafe-class-concat').severity).toBe('warn');
  });

  test('flags template literal with tailwind quasi in className', () => {
    const code = 'const el = <div className={`px-4 ${cls}`} />;';
    const v = checkReact(parseCode(code), 'Test.tsx');
    expect(has(v, 'tailwind-unsafe-class-concat')).toBe(true);
  });

  test('does NOT flag a static string className', () => {
    const code = `const el = <div className="px-4 py-2" />;`;
    const v = checkReact(parseCode(code), 'Test.tsx');
    expect(has(v, 'tailwind-unsafe-class-concat')).toBe(false);
  });
});

describe('styled-components-props-interpolation', () => {
  test('flags arrow props interpolation in styled.div', () => {
    const code = 'const B = styled.div`color: ${p => p.color};`;';
    const v = checkReact(parseCode(code), 'Test.tsx');
    expect(has(v, 'styled-components-props-interpolation')).toBe(true);
    expect(get(v, 'styled-components-props-interpolation').severity).toBe('warn');
  });

  test('does NOT flag a static styled template', () => {
    const code = 'const B = styled.div`color: red;`;';
    const v = checkReact(parseCode(code), 'Test.tsx');
    expect(has(v, 'styled-components-props-interpolation')).toBe(false);
  });
});
