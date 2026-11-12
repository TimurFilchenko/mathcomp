# MathComp

A lightweight math core for JavaScript: arithmetic, algebra, and elementary math. Takes an expression or equation — returns the answer. No graphs, no visualization, no dependencies.

## Installation

```bash
npm install mathcomp
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
- Exact fractions: `1/3 + 1/6 = 1/2`, no float errors
- Functions: `sqrt`, `abs`, `sin`, `cos`, `tan`, `ln`, `log`, `exp`, `floor`, `ceil`, `round`, `min`, `max`
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

Produces three files in `dist/`:

- `dist/mathcomp.js` — ESM
- `dist/mathcomp.min.js` — ESM, minified
- `dist/mathcomp.cjs` — CommonJS

## Tests

```bash
npm test
```

## Demo

Open `examples/index.html` in a browser.

## Project layout

```text
src/        source code (ES modules)
dist/       build output (ESM, ESM min, CJS)
examples/   browser demo
test/       automated tests (node --test)
```

## License

MIT © Madalbekov Muras
