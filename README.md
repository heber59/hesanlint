# hesanlint

version 0.1 just first iteration...

**Performance-first static analysis for React / Next.js.**  
Catches the bugs ESLint misses — infinite re-render loops, bundle killers, broken memoization — before they reach production.

```bash
npx hesanlint ./src --score
```

```
src/components/UserList.tsx
  ✖  12:0   Default import of "lodash" (~70kb) blocks tree-shaking.       [no-heavy-default-import]
             → import { debounce } from 'lodash/debounce'
  ✖  28:4   useEffect() dependency is an inline object — infinite loop.   [useeffect-object-dep]
             → Memoize with useMemo or extract outside the component.
  ✖  41:8   JSX element in .map() is missing a "key" prop.                [missing-key-prop]
  ⚠  55:2   Inline function on prop "onClick" — breaks React.memo.        [no-inline-function-prop]

4 errors, 1 warning in 23 files

Performance Score   62/100  ████████████░░░░░░░░
```

---

## Why this exists

ESLint catches syntax and style. It does not catch:

| Problem                                   | Impact                                | ESLint        |
| ----------------------------------------- | ------------------------------------- | ------------- |
| `import _ from 'lodash'`                  | +70kb in your bundle                  | not detected  |
| `useEffect(() => {}, [{ id }])`           | infinite re-render loop               | not detected  |
| `useState(heavyCompute())`                | recomputes every render               | not detected  |
| `async` callback in `useEffect`           | swallowed Promise, broken cleanup     | plugin only   |
| `${p => p.color}` in styled-component     | new CSS class per render, GC pressure | nothing       |
| `export * from 'external-pkg'`            | kills tree-shaking for consumers      | plugin only   |
| circular imports across 40 files          | build slowdowns, runtime bugs         | plugin only   |
| arrow vs declaration mixed across project | broken Fast Refresh, inconsistent DX  | per-file only |

hesanlint is a single `npx` command that flags all of the above, with a line-level fix hint for each one.

---

## Install

```bash
# run without installing
npx hesanlint ./src

# or add to your project
npm install --save-dev hesanlint
```

**Requires Node ≥ 18.** Works with `.js`, `.jsx`, `.ts`, `.tsx`.

---

## Quick start

```bash
# generate a config tailored to your stack
npx hesanlint init
# → detects TypeScript, Tailwind, styled-components, Next.js automatically

# lint with performance score
npx hesanlint ./src --score

# auto-fix safe violations (e.g. duplicate imports)
npx hesanlint ./src --fix

# watch mode for the dev loop
npx hesanlint ./src --watch

# filter to one rule family
npx hesanlint ./src --rule useeffect

# JSON output (for tooling)
npx hesanlint ./src --format json
```

---

## Rules

### Imports — bundle size

| Rule                               | Default | What it catches                                                 |
| ---------------------------------- | ------- | --------------------------------------------------------------- |
| `no-heavy-default-import`          | error   | `import _ from 'lodash'` — shows kb cost, suggests named import |
| `no-barrel-namespace-import`       | error   | `import * as Icons from 'react-icons'` — imports entire package |
| `no-duplicate-imports`             | warn    | same source imported twice — auto-fixable with `--fix`          |
| `no-large-barrel-import`           | warn    | 5+ specifiers from an `index` barrel file                       |
| `no-require-in-esm`                | warn    | `require()` inside an ES module — breaks static analysis        |
| `no-unexpected-side-effect-import` | warn    | bare `import 'lib'` outside entry points                        |

### Hooks — correctness

| Rule                                | Default | What it catches                                                                    |
| ----------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| `useeffect-async-callback`          | error   | `useEffect(async () => {})` — returns a Promise instead of a cleanup               |
| `useeffect-object-dep`              | error   | inline object/array in the deps array — new reference every render = infinite loop |
| `usememo-missing-deps`              | error   | `useMemo(fn)` with no deps array — recomputes every render                         |
| `hook-in-conditional`               | error   | hook called inside an `if`, loop, or ternary — violates Rules of Hooks             |
| `useeffect-missing-deps`            | warn    | `useEffect(fn)` with no deps array — runs after every render                       |
| `useeffect-empty-deps-complex-body` | warn    | empty `[]` + complex body — possible stale closure                                 |
| `usestate-lazy-init`                | warn    | `useState(expensiveCall())` — call runs on every render                            |
| `usememo-empty-deps`                | info    | `useMemo(fn, [])` — consider hoisting outside the component                        |

### Functions & exports — consistency + tree-shaking

| Rule                            | Default | What it catches                                                            |
| ------------------------------- | ------- | -------------------------------------------------------------------------- |
| `no-anonymous-default-export`   | warn    | `export default function()` — breaks React Fast Refresh                    |
| `consistent-component-style`    | warn    | **project-wide**: majority vote across all files, flags the minority style |
| `no-default-export-object`      | error   | `export default { a, b }` — 0% tree-shaking for consumers                  |
| `no-wildcard-external-reexport` | error   | `export * from 'external-pkg'` — re-exports the whole package              |

### React — render performance

| Rule                                    | Default | What it catches                                                                                          |
| --------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `missing-key-prop`                      | error   | JSX element in `.map()` without a `key`                                                                  |
| `no-inline-function-prop`               | warn    | `onClick={() => …}` — new reference every render, breaks `React.memo`                                    |
| `no-inline-style-object`                | warn    | `style={{ … }}` — same problem                                                                           |
| `no-array-index-key`                    | warn    | `key={n}` where `n` is the `.map()` index parameter (tracks the actual param name, not a hardcoded list) |
| `tailwind-unsafe-class-concat`          | warn    | `className={'px-4 ' + cls}` — dynamic class names are purged by Tailwind JIT                             |
| `styled-components-props-interpolation` | warn    | `${p => p.color}` — generates a new CSS class on every prop change                                       |

### Architecture

| Rule                  | Default | What it catches                                                                         |
| --------------------- | ------- | --------------------------------------------------------------------------------------- |
| `no-dependency-cycle` | error   | circular imports across the whole project (via [madge](https://github.com/pahen/madge)) |

---

## GitHub Actions

Drop this in `.github/workflows/hesanlint.yml` and every PR gets inline annotations and a score in the Job Summary:

```yaml
- name: Run hesanlint
  run: npx hesanlint ./src --ci --score
```

`--ci` mode emits `::error file=…,line=…::` annotations that GitHub renders as inline PR comments. It also writes a markdown summary table to the Job Summary page. Exit code is `1` if any `error`-level violations are found, blocking the merge.

---

## Configuration

`hesanlint init` writes `.hesanlintrc.json` for you. Edit it to tune any rule:

```json
{
  "rules": {
    "no-inline-function-prop": "off",
    "no-heavy-default-import": "error",
    "tailwind-unsafe-class-concat": "warn"
  },
  "ignore": ["**/*.stories.*", "**/*.test.*", "**/pages/**"]
}
```

Severity levels: `"error"` · `"warn"` · `"info"` · `"off"`

---

## How it works

hesanlint parses every file into a Babel AST (supports JS, JSX, TS, TSX, decorators) and runs rule checkers as AST visitors — the same model ESLint uses, but with rules written specifically for React performance patterns.

The `consistent-component-style` rule is intentionally cross-file: it counts arrow functions vs function declarations across the whole project and flags files that diverge from the majority. ESLint's equivalent (`react/function-component-definition`) only enforces within a single file.

Circular dependency detection delegates to [madge](https://github.com/pahen/madge), which builds a full import graph rather than checking file-by-file.

---

## CLI reference

```
hesanlint [path] [options]

Arguments:
  path                    file or directory to lint (default: .)

Options:
  --ci                    GitHub Actions mode: annotations + exit 1 on errors
  --score                 show 0–100 performance score
  --fix                   auto-apply safe fixes
  --watch                 re-lint on file changes
  --format <terminal|json>  output format (default: terminal)
  --rule <string>         run only rules whose name contains this string
  --ignore <pattern>      extra glob to ignore

Commands:
  init                    create .hesanlintrc.json for your project
```

---

## License

MIT

