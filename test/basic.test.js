import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MathComp, MathCompError, ErrorCode } from '../src/index.js';

const mc = new MathComp();

test('arithmetic: precedence and parentheses', () => {
  assert.deepEqual(mc.eval('2 + 3 * 4'), { value: 14 });
  assert.deepEqual(mc.eval('(2 + 3) * 4'), { value: 20 });
  assert.deepEqual(mc.eval('2 + 3 - 4'), { value: 1 });
  assert.deepEqual(mc.eval('10 / 2 / 5'), { value: 1 });
});

test('arithmetic: power is right-associative', () => {
  assert.deepEqual(mc.eval('2^3^2'), { value: 512 });
  assert.deepEqual(mc.eval('2^10'), { value: 1024 });
  assert.deepEqual(mc.eval('2^-2'), { value: '1/4' });
});

test('arithmetic: unary operators', () => {
  assert.deepEqual(mc.eval('-3 + 1'), { value: -2 });
  assert.deepEqual(mc.eval('-(2 + 3)'), { value: -5 });
  assert.deepEqual(mc.eval('+5'), { value: 5 });
  assert.deepEqual(mc.eval('--5'), { value: 5 });
});

test('fractions: exact results', () => {
  assert.deepEqual(mc.eval('1/3 + 1/6'), { value: '1/2' });
  assert.deepEqual(mc.eval('1/2 + 1/2'), { value: 1 });
  assert.deepEqual(mc.eval('2/3 * 3/4'), { value: '1/2' });
  assert.deepEqual(mc.eval('0.1 + 0.2'), { value: '3/10' });
});

test('functions: built-in', () => {
  assert.deepEqual(mc.eval('sqrt(16)'), { value: 4 });
  assert.deepEqual(mc.eval('sqrt(16) + 2^3'), { value: 12 });
  assert.deepEqual(mc.eval('abs(-5)'), { value: 5 });
  assert.deepEqual(mc.eval('min(3, 1, 2)'), { value: 1 });
  assert.deepEqual(mc.eval('max(3, 1, 2)'), { value: 3 });
  assert.deepEqual(mc.eval('floor(3.7)'), { value: 3 });
  assert.deepEqual(mc.eval('ceil(3.2)'), { value: 4 });
  assert.deepEqual(mc.eval('round(3.5)'), { value: 4 });
});

test('functions: sqrt of negative returns error', () => {
  const result = mc.eval('sqrt(-1)');
  assert.equal(result.code, ErrorCode.SOLVE_NO_REAL_ROOTS);
});

test('variables: substitution', () => {
  assert.deepEqual(mc.eval('2x + 3', { x: 5 }), { value: 13 });
  assert.deepEqual(mc.eval('x * y', { x: 2, y: 3 }), { value: 6 });
  assert.deepEqual(mc.eval('x^2', { x: 4 }), { value: 16 });
});

test('variables: unknown variable returns error', () => {
  const result = mc.eval('x + 1');
  assert.equal(result.code, ErrorCode.EVAL_UNKNOWN_VARIABLE);
});

test('implicit multiplication', () => {
  assert.deepEqual(mc.eval('2x', { x: 3 }), { value: 6 });
  assert.deepEqual(mc.eval('2(x + 1)', { x: 3 }), { value: 8 });
  assert.deepEqual(mc.eval('(x + 1)(x - 1)', { x: 3 }), { value: 8 });
});

test('solve: linear equation', () => {
  assert.deepEqual(mc.solve('2x + 3 = 11'), { solutions: [4] });
  assert.deepEqual(mc.solve('x - 5 = 0'), { solutions: [5] });
  assert.deepEqual(mc.solve('2x = 1'), { solutions: ['1/2'] });
  assert.deepEqual(mc.solve('3x + 1 = 3x + 1'), { solutions: 'all' });
  assert.deepEqual(mc.solve('3x + 1 = 3x + 2'), { solutions: [] });
});

test('solve: quadratic equation', () => {
  assert.deepEqual(mc.solve('x^2 - 5x + 6 = 0'), { solutions: [2, 3] });
  assert.deepEqual(mc.solve('x^2 = 4'), { solutions: [-2, 2] });
  assert.deepEqual(
    mc.solve('x^2 + 1 = 0'),
    { solutions: [], note: 'No real roots' }
  );
  assert.deepEqual(mc.solve('x^2 = 0'), { solutions: [0] });
});

test('solve: missing equals sign', () => {
  const result = mc.solve('2x + 3');
  assert.equal(result.code, ErrorCode.SOLVE_NO_EQUALS_SIGN);
});

test('simplify: like terms', () => {
  assert.deepEqual(mc.simplify('2x + 3x - x'), { value: '4x' });
  assert.deepEqual(mc.simplify('x + x + x'), { value: '3x' });
  assert.deepEqual(mc.simplify('2x - 2x'), { value: '0' });
});

test('simplify: distribute', () => {
  assert.deepEqual(mc.simplify('2(x + 3)'), { value: '2x + 6' });
  assert.deepEqual(mc.simplify('x*x'), { value: 'x^2' });
  assert.deepEqual(mc.simplify('x^2 + 3x + 2 + x^2'), { value: '2x^2 + 3x + 2' });
});

test('registerFunction: extends instance', () => {
  const local = new MathComp();
  local.registerFunction('cube', (n) => n ** 3);
  assert.deepEqual(local.eval('cube(3)'), { value: 27 });
  assert.equal(mc.eval('cube(3)').code, ErrorCode.EVAL_UNKNOWN_FUNCTION);
});

test('registerFunction: rejects bad input', () => {
  assert.throws(() => mc.registerFunction('', () => 1), MathCompError);
  assert.throws(() => mc.registerFunction('bad', 'not a function'), MathCompError);
});

test('errors: division by zero', () => {
  const result = mc.eval('1/0');
  assert.equal(result.code, ErrorCode.EVAL_DIVISION_BY_ZERO);
});

test('errors: unexpected end', () => {
  const result = mc.eval('2 +');
  assert.equal(result.code, ErrorCode.PARSE_UNEXPECTED_END);
});

test('errors: unexpected character', () => {
  const result = mc.eval('2 @ 3');
  assert.equal(result.code, ErrorCode.LEX_UNEXPECTED_CHAR);
});

test('errors: unknown function', () => {
  const result = mc.eval('foo(1)');
  assert.equal(result.code, ErrorCode.EVAL_UNKNOWN_FUNCTION);
});

test('errors: empty input', () => {
  const result = mc.eval('');
  assert.equal(result.code, ErrorCode.PARSE_UNEXPECTED_END);
});
