import { watch } from 'chokidar';
import { relative } from 'path';
import { run } from './runner.js';
import chalk from 'chalk';

const IGNORED = ['**/node_modules/**', '**/.git/**', '**/.next/**', '**/dist/**', '**/.turbo/**'];

export async function startWatch(targetPath, options) {
  await runAndPrint(targetPath, options);

  console.log(chalk.dim('\nWatching for changes… (Ctrl+C to stop)'));

  let debounce = null;

  const watcher = watch(targetPath, {
    ignored: IGNORED,
    ignoreInitial: true,
    persistent: true,
  });

  const rerun = (changedPath) => {
    clearTimeout(debounce);
    debounce = setTimeout(async () => {
      process.stdout.write('\x1Bc'); // clear terminal
      const rel = relative(process.cwd(), changedPath);
      console.log(chalk.dim(`↺  ${rel}\n`));
      await runAndPrint(targetPath, options);
      console.log(chalk.dim('\nWatching for changes… (Ctrl+C to stop)'));
    }, 120);
  };

  watcher.on('change', rerun).on('add', rerun).on('unlink', rerun);
}

async function runAndPrint(targetPath, options) {
  await run(targetPath, options);
}
