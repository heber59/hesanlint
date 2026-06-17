import { checkHooks } from '../src/rules/hooks/index.js';
import { parseCode } from './helpers.js';

const has = (violations, rule) => violations.some((v) => v.rule === rule);
const get = (violations, rule) => violations.find((v) => v.rule === rule);

describe('useeffect-missing-deps', () => {
  test('flags useEffect with no dependency array', () => {
    const v = checkHooks(parseCode(`useEffect(() => { doThing(); });`), 'Test.tsx');
    expect(has(v, 'useeffect-missing-deps')).toBe(true);
    expect(get(v, 'useeffect-missing-deps').severity).toBe('warn');
  });

  test('does NOT flag useEffect with a deps array', () => {
    const v = checkHooks(parseCode(`useEffect(() => { doThing(); }, []);`), 'Test.tsx');
    expect(has(v, 'useeffect-missing-deps')).toBe(false);
  });
});

describe('useeffect-object-dep', () => {
  test('flags inline object literal in deps array', () => {
    const v = checkHooks(parseCode(`useEffect(() => {}, [{ a: 1 }]);`), 'Test.tsx');
    expect(has(v, 'useeffect-object-dep')).toBe(true);
    expect(get(v, 'useeffect-object-dep').severity).toBe('error');
  });

  test('does NOT flag a plain identifier dep', () => {
    const v = checkHooks(parseCode(`useEffect(() => {}, [count]);`), 'Test.tsx');
    expect(has(v, 'useeffect-object-dep')).toBe(false);
  });
});

describe('useeffect-async-callback', () => {
  test('flags an async callback', () => {
    const v = checkHooks(parseCode(`useEffect(async () => { await x(); }, []);`), 'Test.tsx');
    expect(has(v, 'useeffect-async-callback')).toBe(true);
    expect(get(v, 'useeffect-async-callback').severity).toBe('error');
  });

  test('does NOT flag a sync callback', () => {
    const v = checkHooks(parseCode(`useEffect(() => { x(); }, []);`), 'Test.tsx');
    expect(has(v, 'useeffect-async-callback')).toBe(false);
  });
});

describe('usememo-missing-deps', () => {
  test('flags useMemo with no deps array', () => {
    const v = checkHooks(parseCode(`const x = useMemo(() => compute());`), 'Test.tsx');
    expect(has(v, 'usememo-missing-deps')).toBe(true);
    expect(get(v, 'usememo-missing-deps').severity).toBe('error');
  });

  test('does NOT flag useMemo with a deps array', () => {
    const v = checkHooks(parseCode(`const x = useMemo(() => compute(), [a]);`), 'Test.tsx');
    expect(has(v, 'usememo-missing-deps')).toBe(false);
  });
});

describe('usestate-lazy-init', () => {
  test('flags useState with an expensive function call initializer', () => {
    const v = checkHooks(parseCode(`const [s, set] = useState(expensiveCompute());`), 'Test.tsx');
    expect(has(v, 'usestate-lazy-init')).toBe(true);
    expect(get(v, 'usestate-lazy-init').severity).toBe('warn');
  });

  // Regression: CHEAP_CALLEES allowlist must suppress these.
  test('does NOT flag useState(Boolean(x))', () => {
    const v = checkHooks(parseCode(`const [s, set] = useState(Boolean(x));`), 'Test.tsx');
    expect(has(v, 'usestate-lazy-init')).toBe(false);
  });

  test('does NOT flag useState(Number(x))', () => {
    const v = checkHooks(parseCode(`const [s, set] = useState(Number(x));`), 'Test.tsx');
    expect(has(v, 'usestate-lazy-init')).toBe(false);
  });

  test('does NOT flag useState with a plain value', () => {
    const v = checkHooks(parseCode(`const [s, set] = useState(0);`), 'Test.tsx');
    expect(has(v, 'usestate-lazy-init')).toBe(false);
  });
});

describe('hook-in-conditional', () => {
  test('flags a hook called inside an if statement', () => {
    const code = `function C() { if (cond) { useEffect(() => {}, []); } }`;
    const v = checkHooks(parseCode(code), 'Test.tsx');
    expect(has(v, 'hook-in-conditional')).toBe(true);
    expect(get(v, 'hook-in-conditional').severity).toBe('error');
  });

  test('does NOT flag a hook at the top level of a component', () => {
    const code = `function C() { useEffect(() => {}, []); }`;
    const v = checkHooks(parseCode(code), 'Test.tsx');
    expect(has(v, 'hook-in-conditional')).toBe(false);
  });
});

describe('early-return guard', () => {
  test('returns nothing for a non-react .ts file without a react import', () => {
    const v = checkHooks(parseCode(`useEffect(() => {});`, 'Test.ts'), 'Test.ts');
    expect(v).toEqual([]);
  });
});
