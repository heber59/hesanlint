import { parse } from '@babel/parser';

// Parse a CODE STRING into a Babel AST using the same plugins as src/parser.js,
// so tests don't need temp files on disk. The filename only controls the TS vs
// flow plugin choice (mirrors parseFile's isTS check).
export function parseCode(code, filename = 'Test.tsx') {
  const isTS =
    filename.endsWith('.ts') || filename.endsWith('.tsx');

  return parse(code, {
    sourceType: 'module',
    strictMode: false,
    plugins: [
      'jsx',
      isTS ? 'typescript' : 'flow',
      'decorators-legacy',
      'classProperties',
      'optionalChaining',
      'nullishCoalescingOperator',
      'dynamicImport',
      'importAssertions',
    ],
  });
}
