import traverse from '@babel/traverse';

const TAILWIND_CLASS_PREFIX = /^(p[xy]?-|m[xy]?-|text-|bg-|border-|flex|grid|w-|h-|rounded|shadow|font-|leading-|tracking-|gap-|space-|items-|justify-)/;

export function checkReact(ast, filePath) {
  const violations = [];

  const isReactFile = filePath.match(/\.[jt]sx$/) || hasReactImport(ast);
  if (!isReactFile) return violations;

  traverse.default(ast, {
    JSXAttribute(nodePath) {
      const attrName = nodePath.node.name?.name;
      const value = nodePath.node.value;

      if (!value || value.type !== 'JSXExpressionContainer') return;
      const expr = value.expression;

      // no-inline-function-prop: onClick={() => ...}
      if (
        (expr.type === 'ArrowFunctionExpression' || expr.type === 'FunctionExpression') &&
        attrName !== 'ref' &&
        attrName !== 'children'
      ) {
        violations.push({
          rule: 'no-inline-function-prop',
          severity: 'warn',
          message: `Inline function on prop "${attrName}" creates a new reference every render — breaks React.memo and causes unnecessary re-renders.`,
          line: expr.loc?.start.line ?? 1,
          col: expr.loc?.start.column ?? 0,
          fix: 'Extract to useCallback or a named handler defined outside JSX.',
        });
      }

      // no-inline-style-object: style={{ color: 'red' }}
      if (attrName === 'style' && expr.type === 'ObjectExpression') {
        violations.push({
          rule: 'no-inline-style-object',
          severity: 'warn',
          message: `style={{ ... }} creates a new object reference every render — breaks React.memo.`,
          line: expr.loc?.start.line ?? 1,
          col: expr.loc?.start.column ?? 0,
          fix: 'Extract to a module-level constant or useMemo: const style = useMemo(() => ({ ... }), [deps])',
        });
      }

      // tailwind-unsafe-class-concat: className={'px-4 ' + cls}
      if (attrName === 'className' && expr.type === 'BinaryExpression' && expr.operator === '+') {
        const leftVal = expr.left.type === 'StringLiteral' ? expr.left.value : null;
        if (leftVal && TAILWIND_CLASS_PREFIX.test(leftVal.trim())) {
          violations.push({
            rule: 'tailwind-unsafe-class-concat',
            severity: 'warn',
            message: `String concatenation for className breaks Tailwind JIT — dynamic class names are not statically analyzable and will be purged.`,
            line: expr.loc?.start.line ?? 1,
            col: expr.loc?.start.column ?? 0,
            fix: 'Use clsx() or cn(): className={clsx("px-4", cls)}',
          });
        }
      }
    },

    // missing-key-prop + no-array-index-key (map-aware)
    CallExpression(nodePath) {
      const node = nodePath.node;

      if (
        node.callee.type !== 'MemberExpression' ||
        node.callee.property.name !== 'map'
      ) return;

      const callback = node.arguments[0];
      if (
        !callback ||
        (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression')
      ) return;

      // Track the index parameter name (second param of the map callback)
      const indexParam = callback.params[1]?.name ?? null;

      for (const jsxEl of getReturnedJSX(callback.body)) {
        const keyAttr = jsxEl.openingElement?.attributes?.find(
          (a) => a.type === 'JSXAttribute' && a.name?.name === 'key'
        );

        if (!keyAttr) {
          violations.push({
            rule: 'missing-key-prop',
            severity: 'error',
            message: `JSX element returned from .map() is missing a "key" prop — causes O(n²) reconciliation.`,
            line: jsxEl.loc?.start.line ?? 1,
            col: jsxEl.loc?.start.column ?? 0,
            fix: 'Add a unique key: key={item.id}',
          });
          continue;
        }

        // no-array-index-key: check if key value is the index param
        if (!indexParam) continue;
        const keyExpr = keyAttr.value?.type === 'JSXExpressionContainer'
          ? keyAttr.value.expression
          : null;
        if (keyExpr?.type === 'Identifier' && keyExpr.name === indexParam) {
          violations.push({
            rule: 'no-array-index-key',
            severity: 'warn',
            message: `key={${indexParam}} uses array index — breaks reconciliation when the list is reordered or filtered.`,
            line: keyExpr.loc?.start.line ?? 1,
            col: keyExpr.loc?.start.column ?? 0,
            fix: 'Use a stable unique identifier from your data: key={item.id}',
          });
        }
      }
    },

    // styled-components-props-interpolation: styled.div`${p => p.color}`
    TaggedTemplateExpression(nodePath) {
      const tag = nodePath.node.tag;

      const isStyledTag =
        (tag.type === 'MemberExpression' && tag.object?.name === 'styled') ||
        (tag.type === 'CallExpression' &&
          (tag.callee?.name === 'styled' || tag.callee?.object?.name === 'styled'));

      if (!isStyledTag) return;

      for (const expr of nodePath.node.quasi.expressions) {
        if (expr.type === 'ArrowFunctionExpression' || expr.type === 'FunctionExpression') {
          violations.push({
            rule: 'styled-components-props-interpolation',
            severity: 'warn',
            message: `Props interpolation \${p => ...} in styled-component generates a new CSS class on every prop change — high GC pressure.`,
            line: expr.loc?.start.line ?? 1,
            col: expr.loc?.start.column ?? 0,
            fix: 'Use CSS custom properties instead: color: var(--my-color); set via style prop.',
          });
        }
      }
    },
  });

  return violations;
}

function getReturnedJSX(body) {
  if (body?.type === 'JSXElement' || body?.type === 'JSXFragment') {
    return [body];
  }
  if (body?.type === 'BlockStatement') {
    return body.body
      .filter(
        (s) =>
          s.type === 'ReturnStatement' &&
          (s.argument?.type === 'JSXElement' || s.argument?.type === 'JSXFragment')
      )
      .map((s) => s.argument);
  }
  return [];
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
