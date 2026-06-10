import { Command } from 'commander';
import { createRequire } from 'module';
import { run } from './runner.js';
import { init } from './init.js';
import { startWatch } from './watch.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const program = new Command();

program
  .name('hesanlint')
  .description('Performance-first linter for React/Next.js')
  .version(version)
  .argument('[path]', 'file or directory to lint', '.')
  .option('--ci', 'CI mode: GitHub Actions annotations + exit 1 on errors')
  .option('--score', 'show performance score (0–100)')
  .option('--format <format>', 'output format: terminal | json', 'terminal')
  .option('--rule <rule>', 'run only rules whose name contains this string')
  .option('--ignore <pattern>', 'additional glob pattern to ignore')
  .option('--fix', 'auto-apply safe fixes (e.g. duplicate imports)')
  .option('--watch', 're-lint on every file change')
  .action(async (path, options) => {
    if (options.watch) {
      await startWatch(path, options);
      return;
    }
    const exitCode = await run(path, options);
    process.exit(exitCode);
  });

program
  .command('init')
  .description('Create .hesanlintrc.json tailored to your project')
  .action(async () => {
    const exitCode = await init(process.cwd());
    process.exit(exitCode);
  });

program.parse();
