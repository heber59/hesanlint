import traverse from '@babel/traverse';

export function checkFunctions(ast, filePath) {
  const violations = [];

  if (!filePath.match(/\.[jt]sx?$/)) return violations;

  traverse.default(ast, {
    ExportDefaultDeclaration(nodePath) {
      const decl = nodePath.node.declaration;

      const isAnonymousFn =
        (decl.type === 'FunctionDeclaration' && !decl.id) ||
        ((decl.type === 'ArrowFunctionExpression' || decl.type === 'FunctionExpression') && !decl.id);

      if (isAnonymousFn) {
        violations.push({
          rule: 'no-anonymous-default-export',
          severity: 'warn',
          message: 'Anonymous default export breaks React Fast Refresh and shows "anonymous" in stack traces.',
          line: decl.loc?.start.line ?? 1,
          col: decl.loc?.start.column ?? 0,
          fix: 'Name the export: export default function MyComponent() {} or const MyComponent = () => {}; export default MyComponent;',
        });
      }
    },
  });

  return violations;
}

/**
 * Returns component style metadata for project-wide consistency analysis.
 * Called separately from checkFunctions so the runner can aggregate across files.
 */
export function extractComponentStyles(ast, filePath) {
  if (!filePath.match(/\.[jt]sx?$/)) return [];

  const styles = [];

  traverse.default(ast, {
    FunctionDeclaration(nodePath) {
      const name = nodePath.node.id?.name;
      if (name && /^[A-Z]/.test(name)) {
        styles.push({ style: 'declaration', name, line: nodePath.node.loc?.start.line ?? 1 });
      }
    },

    VariableDeclaration(nodePath) {
      for (const declarator of nodePath.node.declarations) {
        const name = declarator.id?.name;
        if (!name || !/^[A-Z]/.test(name)) continue;
        if (
          declarator.init?.type === 'ArrowFunctionExpression' ||
          declarator.init?.type === 'FunctionExpression'
        ) {
          styles.push({ style: 'arrow', name, line: nodePath.node.loc?.start.line ?? 1 });
        }
      }
    },
  });

  return styles;
}
