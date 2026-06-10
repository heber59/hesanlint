import traverse from '@babel/traverse';

export function checkHooks(ast, filePath) {
  const violations = [];

  const isReactFile = filePath.match(/\.[jt]sx$/) || hasReactImport(ast);
  if (!isReactFile) return violations;

  traverse.default(ast, {
    CallExpression(nodePath) {
      const node = nodePath.node;
      const hookName = getHookName(node.callee);
      if (!hookName) return;

      // ── useEffect / useLayoutEffect ────────────────────────────────────────

      if (hookName === 'useEffect' || hookName === 'useLayoutEffect') {
        const callback = node.arguments[0];
        const depsArg = node.arguments[1];

        // No dependency array at all
        if (node.arguments.length === 1) {
          violations.push({
            rule: 'useeffect-missing-deps',
            severity: 'warn',
            message: `${hookName}() has no dependency array — runs after every render. Add [] or specific deps.`,
            line: node.loc?.start.line ?? 1,
            col: node.loc?.start.column ?? 0,
            fix: 'Add a dependency array as the second argument.',
          });
        }

        // Empty deps [] but complex body — possible stale closure
        if (
          depsArg?.type === 'ArrayExpression' &&
          depsArg.elements.length === 0 &&
          callback?.type === 'ArrowFunctionExpression' &&
          callback.body?.type === 'BlockStatement' &&
          callback.body.body.length > 3
        ) {
          violations.push({
            rule: 'useeffect-empty-deps-complex-body',
            severity: 'warn',
            message: `${hookName}() has empty deps [] but a complex body (${callback.body.body.length} statements). Verify no stale closure over props/state.`,
            line: node.loc?.start.line ?? 1,
            col: node.loc?.start.column ?? 0,
          });
        }

        // Object/array literal in deps — always-new reference → infinite loop
        if (depsArg?.type === 'ArrayExpression') {
          for (const dep of depsArg.elements) {
            if (dep?.type === 'ObjectExpression' || dep?.type === 'ArrayExpression') {
              violations.push({
                rule: 'useeffect-object-dep',
                severity: 'error',
                message: `${hookName}() dependency is an inline ${dep.type === 'ObjectExpression' ? 'object' : 'array'} — creates a new reference every render, causing an infinite loop.`,
                line: dep.loc?.start.line ?? 1,
                col: dep.loc?.start.column ?? 0,
                fix: 'Memoize with useMemo or extract the value outside the component.',
              });
            }
          }
        }

        // async callback — returns Promise instead of cleanup function
        if (callback?.async) {
          violations.push({
            rule: 'useeffect-async-callback',
            severity: 'error',
            message: `${hookName}() callback must not be async — the return value must be a cleanup function, not a Promise.`,
            line: callback.loc?.start.line ?? 1,
            col: callback.loc?.start.column ?? 0,
            fix: 'Define an inner async function and call it: useEffect(() => { const run = async () => {}; run(); }, [])',
          });
        }
      }

      // ── useMemo / useCallback ──────────────────────────────────────────────

      if (hookName === 'useMemo' || hookName === 'useCallback') {
        const depsArg = node.arguments[1];

        if (!depsArg) {
          violations.push({
            rule: 'usememo-missing-deps',
            severity: 'error',
            message: `${hookName}() has no dependency array — recomputes every render, providing zero memoization benefit.`,
            line: node.loc?.start.line ?? 1,
            col: node.loc?.start.column ?? 0,
            fix: 'Add a dependency array.',
          });
        }

        if (
          hookName === 'useMemo' &&
          depsArg?.type === 'ArrayExpression' &&
          depsArg.elements.length === 0
        ) {
          violations.push({
            rule: 'usememo-empty-deps',
            severity: 'info',
            message: `useMemo() with [] computes once — consider moving the value outside the component instead.`,
            line: node.loc?.start.line ?? 1,
            col: node.loc?.start.column ?? 0,
          });
        }
      }

      // ── useState with expensive initializer ───────────────────────────────

      if (hookName === 'useState') {
        const init = node.arguments[0];
        if (
          init?.type === 'CallExpression' ||
          (init?.type === 'ArrayExpression' && init.elements.length > 5)
        ) {
          violations.push({
            rule: 'usestate-lazy-init',
            severity: 'warn',
            message: `useState() initializer is a function call or large array — this runs on every render. Use lazy initialization.`,
            line: node.loc?.start.line ?? 1,
            col: node.loc?.start.column ?? 0,
            fix: 'Wrap in a function: useState(() => expensiveComputation())',
          });
        }
      }

      // ── Hook inside conditional or loop ───────────────────────────────────

      if (isInsideConditionalOrLoop(nodePath)) {
        violations.push({
          rule: 'hook-in-conditional',
          severity: 'error',
          message: `${hookName}() is called inside a conditional or loop — violates Rules of Hooks.`,
          line: node.loc?.start.line ?? 1,
          col: node.loc?.start.column ?? 0,
          fix: 'Move the hook to the top level of the component.',
        });
      }
    },
  });

  return violations;
}

function getHookName(callee) {
  if (callee.type === 'Identifier' && callee.name?.startsWith('use')) {
    return callee.name;
  }
  if (
    callee.type === 'MemberExpression' &&
    callee.object?.name === 'React' &&
    callee.property?.name?.startsWith('use')
  ) {
    return callee.property.name;
  }
  return null;
}

function isInsideConditionalOrLoop(nodePath) {
  let current = nodePath.parentPath;
  while (current) {
    const t = current.node.type;
    if (
      t === 'IfStatement' ||
      t === 'ConditionalExpression' ||
      t === 'LogicalExpression' ||
      t === 'SwitchStatement' ||
      t === 'ForStatement' ||
      t === 'ForInStatement' ||
      t === 'ForOfStatement' ||
      t === 'WhileStatement' ||
      t === 'DoWhileStatement'
    ) return true;
    if (
      t === 'FunctionDeclaration' ||
      t === 'ArrowFunctionExpression' ||
      t === 'FunctionExpression'
    ) break;
    current = current.parentPath;
  }
  return false;
}

function hasReactImport(ast) {
  let found = false;
  traverse.default(ast, {
    ImportDeclaration(p) {
      if (p.node.source.value === 'react') found = true;
    },
  });
  return found;
}
