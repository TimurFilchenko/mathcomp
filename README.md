# MathComp

A lightweight math core for JavaScript: arithmetic, algebra, and elementary math. Takes an expression or equation — returns the answer. Exact BigInt fractions, no graphs, no dependencies.

> **Status:** not published to npm. Use directly from GitHub or via jsDelivr.

## Installation

### Via jsDelivr (browser)

```html
<script type="module">
  import { MathComp } from 'https://cdn.jsdelivr.net/gh/TimurFilchenko/mathcomp@main/dist/mathcomp.mjs';
  const mc = new MathComp();
  console.log(mc.eval('2 + 3 * 4'));
</script>
```

### From GitHub (Node)

```bash
npm install github:TimurFilchenko/mathcomp
```

### Local (from source)

```js
import { MathComp } from './src/index.js';
```

## Quick start

```js
import { MathComp } from 'mathcomp';

const mc = new MathComp();

mc.eval('2 + 3 * 4');
// { value: 14 }

mc.eval('1/3 + 1/6');
// { value: '1/2' }

mc.eval('sqrt(16) + 2^3');
// { value: 12 }

mc.eval('2x + 3', { x: 5 });
// { value: 13 }

mc.solve('2x + 3 = 11');
// { solutions: [4] }

mc.solve('x^2 - 5x + 6 = 0');
// { solutions: [2, 3] }

mc.simplify('2x + 3x - x');
// { value: '4x' }

mc.registerFunction('cube', (n) => n ** 3);
mc.eval('cube(3)');
// { value: 27 }
```

## Features

- Arithmetic: operator precedence, parentheses, powers, roots, percentages
- Exact BigInt fractions: `24^24` and `1/3 + 1/6` without floating-point errors
- Roots of any degree: `sqrt`, `cbrt`, `root(n, x)`
- Functions: `sqrt`, `cbrt`, `root`, `abs`, `sin`, `cos`, `tan`, `ln`, `log`, `exp`, `floor`, `ceil`, `round`, `min`, `max`, `pow`
- Variables: `mc.eval('2x + 3', { x: 5 })`
- Linear equations: `mc.solve('2x + 3 = 11')`
- Quadratic equations: `mc.solve('x^2 - 5x + 6 = 0')`
- Combining like terms: `mc.simplify('2x + 3x - x')`
- Custom functions: `mc.registerFunction(name, fn)`

## Result format

Success:

```js
{ value: ... }        // eval, simplify
{ solutions: [...] }  // solve
```

Errors are returned as objects, not thrown:

```js
mc.eval('2 +');
// { error: 'Expression ended unexpectedly', code: 'PARSE_UNEXPECTED_END' }

mc.eval('1/0');
// { error: 'Division by zero', code: 'EVAL_DIVISION_BY_ZERO' }
```

Check `result.error` — if it's absent, the call succeeded.

## Build

```bash
npm install
npm run build
```

Produces files in `dist/`:

- `dist/mathcomp.js` — ESM
- `dist/mathcomp.min.js` — ESM, minified
- `dist/mathcomp.mjs` — ESM (explicit module)
- `dist/mathcomp.cjs` — CommonJS

## Tests

```bash
npm test
```

## Demo

Open `examples/index.html` in a browser, or try the online demo:

```text
https://TimurFilchenko.github.io/mathcomp/examples/index.html
```

## Project layout

```text
src/        source code (ES modules)
dist/       build output (ESM, ESM min, ESM .mjs, CJS)
examples/   browser demo (MathLive input + MathJax output)
test/       automated tests (node --test)
```

## License

MIT © Madalbekov Muras
