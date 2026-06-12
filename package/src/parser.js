import { parse } from '@babel/parser';
import { readFileSync } from 'fs';

export function parseFile(filePath) {
  const code = readFileSync(filePath, 'utf8');

  const isTS = filePath.endsWith('.ts') || filePath.endsWith('.tsx');

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
