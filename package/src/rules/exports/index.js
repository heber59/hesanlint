import traverse from '@babel/traverse';

export function checkExports(ast, filePath) {
  const violations = [];

  if (!filePath.match(/\.[jt]sx?$/)) return violations;

  traverse.default(ast, {
    ExportDefaultDeclaration(nodePath) {
      const decl = nodePath.node.declaration;

      // export default { a, b } — object prevents tree-shaking entirely
      if (decl.type === 'ObjectExpression' && decl.properties.length > 0) {
        violations.push({
          rule: 'no-default-export-object',
          severity: 'error',
          message: `export default { ... } bundles everything as a single chunk — 0% tree-shaking for consumers.`,
          line: decl.loc?.start.line ?? 1,
          col: decl.loc?.start.column ?? 0,
          fix: 'Use named exports: export const a = ...; export const b = ...;',
        });
      }
    },

    ExportAllDeclaration(nodePath) {
      const source = nodePath.node.source.value;

      // export * from 'external-pkg' — re-exports entire package
      if (!source.startsWith('.')) {
        violations.push({
          rule: 'no-wildcard-external-reexport',
          severity: 'error',
          message: `export * from '${source}' re-exports the entire external package — consumers lose tree-shaking.`,
          line: nodePath.node.loc?.start.line ?? 1,
          col: nodePath.node.loc?.start.column ?? 0,
          fix: `Re-export only what you need: export { specificThing } from '${source}'`,
        });
      }
    },
  });

  return violations;
}
