import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE_RULES = {
  'no-heavy-default-import': 'error',
  'no-barrel-namespace-import': 'error',
  'no-duplicate-imports': 'warn',
  'no-require-in-esm': 'warn',
  'no-large-barrel-import': 'warn',
  'no-unexpected-side-effect-import': 'warn',
  'no-anonymous-default-export': 'warn',
  'consistent-component-style': 'warn',
  'no-default-export-object': 'error',
  'no-wildcard-external-reexport': 'error',
  'useeffect-async-callback': 'error',
  'useeffect-object-dep': 'error',
  'usememo-missing-deps': 'error',
  'useeffect-missing-deps': 'warn',
  'useeffect-empty-deps-complex-body': 'warn',
  'usememo-empty-deps': 'info',
  'usestate-lazy-init': 'warn',
  'hook-in-conditional': 'error',
  'no-inline-function-prop': 'warn',
  'no-inline-style-object': 'warn',
  'missing-key-prop': 'error',
  'no-array-index-key': 'warn',
  'styled-components-props-interpolation': 'warn',
  'tailwind-unsafe-class-concat': 'warn',
  'no-dependency-cycle': 'error',
};

const BASE_IGNORE = ['**/*.stories.*', '**/*.test.*', '**/*.spec.*'];

export async function init(cwd) {
  const configPath = join(cwd, '.hesanlintrc.json');

  if (existsSync(configPath)) {
    console.error('hesanlint: .hesanlintrc.json already exists — delete it first to re-init.');
    return 1;
  }

  const hasTailwind =
    existsSync(join(cwd, 'tailwind.config.js')) ||
    existsSync(join(cwd, 'tailwind.config.ts')) ||
    existsSync(join(cwd, 'tailwind.config.mjs')) ||
    existsSync(join(cwd, 'tailwind.config.cjs'));

  const hasTS = existsSync(join(cwd, 'tsconfig.json'));

  let hasStyledComponents = false;
  let isNext = false;

  try {
    const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    hasStyledComponents = 'styled-components' in deps;
    isNext = 'next' in deps;
  } catch {}

  const rules = { ...BASE_RULES };
  const ignore = [...BASE_IGNORE];

  if (!hasTailwind) rules['tailwind-unsafe-class-concat'] = 'off';
  if (!hasStyledComponents) rules['styled-components-props-interpolation'] = 'off';

  if (isNext) {
    // Next.js pages/app-router files must use default exports
    ignore.push('**/pages/**', '**/app/**');
  }

  const config = { rules, ignore };
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');

  const detected = [
    hasTS && 'TypeScript',
    hasTailwind && 'Tailwind CSS',
    hasStyledComponents && 'styled-components',
    isNext && 'Next.js',
  ].filter(Boolean);

  console.log('Created .hesanlintrc.json');
  if (detected.length) console.log(`Detected: ${detected.join(', ')}`);
  if (!hasTailwind) console.log('tailwind-unsafe-class-concat → off  (no tailwind.config found)');
  if (!hasStyledComponents) console.log('styled-components-props-interpolation → off  (not in package.json)');
  if (isNext) console.log('pages/ and app/ added to ignore  (Next.js default exports are required there)');

  return 0;
}
