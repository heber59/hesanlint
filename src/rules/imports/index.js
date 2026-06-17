import traverse from '@babel/traverse';

const HEAVY_DEFAULT_PACKAGES = new Map([
  ['lodash', { named: 'lodash/{fn}', estimatedKb: 70 }],
  ['lodash-es', { named: 'lodash-es/{fn}', estimatedKb: 40 }],
  ['ramda', { named: 'ramda', estimatedKb: 45 }],
  ['rxjs', { named: 'rxjs', estimatedKb: 50 }],
  ['date-fns', { named: 'date-fns/{fn}', estimatedKb: 20 }],
  ['moment', { named: 'dayjs (replace!) or date-fns/{fn}', estimatedKb: 230 }],
  ['antd', { named: 'antd/{Component}', estimatedKb: 500 }],
  ['@mui/material', { named: '@mui/material/{Component}', estimatedKb: 300 }],
]);

const KNOWN_BARREL_PACKAGES = new Set([
  'react-icons',
  '@heroicons/react',
  'lucide-react',
]);

export function checkImports(ast, filePath) {
  const violations = [];
  const seenSources = new Map();

  traverse.default(ast, {
    ImportDeclaration(nodePath) {
      const node = nodePath.node;
      const source = node.source.value;
      const line = node.loc?.start.line ?? 1;
      const col = node.loc?.start.column ?? 0;

      // no-duplicate-imports
      if (seenSources.has(source)) {
        violations.push({
          rule: 'no-duplicate-imports',
          severity: 'warn',
          message: `Duplicate import from "${source}" — merge both into one import statement.`,
          line,
          col,
          autofix: { type: 'merge-import', firstLine: seenSources.get(source), dupLine: line },
          fix: 'Merge specifiers into the first import of this source.',
        });
      } else {
        seenSources.set(source, line);
      }

      // no-heavy-default-import: import _ from 'lodash'
      const heavy = HEAVY_DEFAULT_PACKAGES.get(source);
      if (heavy) {
        const hasDefaultOrNamespace = node.specifiers.some(
          (s) =>
            s.type === 'ImportDefaultSpecifier' ||
            s.type === 'ImportNamespaceSpecifier'
        );
        if (hasDefaultOrNamespace) {
          violations.push({
            rule: 'no-heavy-default-import',
            severity: 'error',
            message: `Default/namespace import of "${source}" pulls the whole package (~${heavy.estimatedKb}kb published, approximate) and blocks tree-shaking. Use: import { fn } from '${heavy.named}'`,
            line,
            col,
            fix: `Replace with named imports: import { specificFunction } from '${heavy.named}'`,
          });
        }
      }

      // no-barrel-namespace-import: import * as Icons from 'react-icons'
      if (KNOWN_BARREL_PACKAGES.has(source)) {
        const hasNamespace = node.specifiers.some(
          (s) => s.type === 'ImportNamespaceSpecifier'
        );
        if (hasNamespace) {
          violations.push({
            rule: 'no-barrel-namespace-import',
            severity: 'error',
            message: `Namespace import from barrel package "${source}" imports everything. Use named imports: import { Icon } from '${source}/...'`,
            line,
            col,
          });
        }
      }

      // no-large-barrel-import: import { a, b, c, ... } from './components/index'
      const isInternalBarrel =
        source.startsWith('.') &&
        (source.endsWith('/index') ||
          source.endsWith('/index.js') ||
          source.endsWith('/index.ts'));

      if (isInternalBarrel && node.specifiers.length > 5) {
        violations.push({
          rule: 'no-large-barrel-import',
          severity: 'warn',
          message: `Importing ${node.specifiers.length} items from barrel "${source}". Large barrel imports slow bundler tree-shaking analysis.`,
          line,
          col,
          fix: 'Import directly from the source file of each specifier.',
        });
      }

      // no-unexpected-side-effect-import: import 'some-lib' in a component file
      const isSideEffect = node.specifiers.length === 0;
      const isCssLike =
        source.endsWith('.css') ||
        source.endsWith('.scss') ||
        source.endsWith('.sass') ||
        source.startsWith('reflect-metadata');
      const isEntryFile = filePath.match(/\/(app|_app|layout|main|index)\.[jt]sx?$/);

      if (isSideEffect && !isCssLike && !isEntryFile) {
        violations.push({
          rule: 'no-unexpected-side-effect-import',
          severity: 'warn',
          message: `Side-effect import "${source}" in a component file. Move to an entry point or verify it's intentional.`,
          line,
          col,
        });
      }
    },

    // no-require-in-esm: require('something') inside ES module
    CallExpression(nodePath) {
      const node = nodePath.node;
      if (
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require' &&
        node.arguments[0]?.type === 'StringLiteral'
      ) {
        violations.push({
          rule: 'no-require-in-esm',
          severity: 'warn',
          message: `require("${node.arguments[0].value}") in an ES module — use import for consistent static analysis.`,
          line: node.loc?.start.line ?? 1,
          col: node.loc?.start.column ?? 0,
        });
      }
    },
  });

  return violations;
}
