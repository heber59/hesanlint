import madge from 'madge';
import { resolve } from 'path';

export async function checkCycles(directory) {
  try {
    const result = await madge(resolve(directory), {
      fileExtensions: ['js', 'jsx', 'ts', 'tsx'],
      excludeRegExp: [/node_modules/, /\.d\.ts$/, /dist\//, /\.next\//],
    });

    return result.circular().map((cycle) => ({
      rule: 'no-dependency-cycle',
      severity: 'error',
      message: `Circular dependency: ${cycle.join(' → ')} → ${cycle[0]}`,
      line: 1,
      col: 0,
      file: resolve(directory, cycle[0]),
    }));
  } catch {
    return [];
  }
}
