import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { MathCompError, ErrorCode } from './errors.js';
import {
  createRational,
  fromNumber,
  add,
  sub,
  mul,
  div,
  neg,
  pow,
  isZero,
  toNumber,
} from './rational.js';

export function solveEquation(input) {
  const parts = splitAtEquals(input);
  const leftAst = parse(tokenize(parts.left));
  const rightAst = parse(tokenize(parts.right));
  const difference = { type: 'binary', op: '-', left: leftAst, right: rightAst };
  const coefficients = collectCoefficients(difference);
  return solvePolynomial(coefficients);
}

function splitAtEquals(input) {
  const index = input.indexOf('=');
  if (index === -1) {
    throw new MathCompError(ErrorCode.SOLVE_NO_EQUALS_SIGN, 'Equation must contain "="');
  }
  return { left: input.slice(0, index), right: input.slice(index + 1) };
}

function collectCoefficients(node) {
  switch (node.type) {
    case 'number':
      return { variable: null, 0: fromNumber(node.value) };
    case 'variable':
      return { variable: node.name, 1: createRational(1), 0: createRational(0) };
    case 'unary':
      if (node.op === '-') return negateCoefficients(collectCoefficients(node.argument));
      return collectCoefficients(node.argument);
    case 'binary':
      return collectBinary(node);
    default:
      throw new MathCompError(ErrorCode.SOLVE_UNSUPPORTED, `Cannot solve equation with node type: ${node.type}`);
  }
}

function collectBinary(node) {
  if (node.op === '^') return collectPower(node);
  if (node.op === '+' || node.op === '-') {
    return combineCoefficients(collectCoefficients(node.left), collectCoefficients(node.right), node.op);
  }
  if (node.op === '*') {
    return multiplyCoefficients(collectCoefficients(node.left), collectCoefficients(node.right));
  }
  if (node.op === '/') {
    return divideCoefficients(collectCoefficients(node.left), collectCoefficients(node.right));
  }
  throw new MathCompError(ErrorCode.SOLVE_UNSUPPORTED, `Unsupported operator in equation: ${node.op}`);
}

function collectPower(node) {
  if (node.left.type !== 'variable') {
    throw new MathCompError(ErrorCode.SOLVE_UNSUPPORTED, 'Only variables can be raised to a power in equations');
  }
  if (node.right.type !== 'number' || !Number.isInteger(node.right.value) || node.right.value < 0) {
    throw new MathCompError(ErrorCode.SOLVE_UNSUPPORTED, 'Exponent must be a non-negative integer');
  }
  const degree = node.right.value;
  return { variable: node.left.name, [degree]: createRational(1), 0: createRational(0) };
}

function negateCoefficients(coefficients) {
  const result = { variable: coefficients.variable };
  for (const key of Object.keys(coefficients)) {
    if (key === 'variable') continue;
    result[key] = neg(coefficients[key]);
  }
  return result;
}

function resolveVariableCoefficient(left, right) {
  if (left.variable && right.variable && left.variable !== right.variable) {
    throw new MathCompError(ErrorCode.SOLVE_UNSUPPORTED, 'Equations with multiple variables are not supported');
  }
  return left.variable ?? right.variable;
}

function combineCoefficients(left, right, op) {
  const variable = resolveVariableCoefficient(left, right);
  const result = { variable };
  for (const degree of unionDegrees(left, right)) {
    const a = left[degree] ?? createRational(0);
    const b = right[degree] ?? createRational(0);
    result[degree] = op === '+' ? add(a, b) : sub(a, b);
  }
  return result;
}

function unionDegrees(left, right) {
  const degrees = new Set();
  for (const key of Object.keys(left)) if (key !== 'variable') degrees.add(key);
  for (const key of Object.keys(right)) if (key !== 'variable') degrees.add(key);
  return [...degrees];
}

function multiplyCoefficients(left, right) {
  const variable = resolveVariableCoefficient(left, right);
  const result = { variable };
  for (const leftDegree of Object.keys(left)) {
    if (leftDegree === 'variable') continue;
    for (const rightDegree of Object.keys(right)) {
      if (rightDegree === 'variable') continue;
      const product = mul(left[leftDegree], right[rightDegree]);
      const totalDegree = Number(leftDegree) + Number(rightDegree);
      result[totalDegree] = add(result[totalDegree] ?? createRational(0), product);
    }
  }
  return result;
}

function divideCoefficients(left, right) {
  if (right.variable) {
    throw new MathCompError(ErrorCode.SOLVE_UNSUPPORTED, 'Cannot divide by a variable in equations');
  }
  const divisor = right[0] ?? createRational(0);
  if (isZero(divisor)) {
    throw new MathCompError(ErrorCode.EVAL_DIVISION_BY_ZERO, 'Division by zero in equation');
  }
  const result = { variable: left.variable };
  for (const degree of Object.keys(left)) {
    if (degree === 'variable') continue;
    result[degree] = div(left[degree], divisor);
  }
  return result;
}

function solvePolynomial(coefficients) {
  const degrees = Object.keys(coefficients)
    .filter((key) => key !== 'variable')
    .map(Number)
    .sort((a, b) => b - a);
  const maxDegree = degrees[0] ?? 0;
  const variable = coefficients.variable ?? 'x';
  if (maxDegree === 0) return checkConstantEquation(coefficients[0] ?? createRational(0));
  if (maxDegree === 1) return solveLinear(coefficients, variable);
  if (maxDegree === 2) return solveQuadratic(coefficients, variable);
  throw new MathCompError(ErrorCode.SOLVE_UNSUPPORTED, `Cannot solve equations of degree ${maxDegree}`);
}

function checkConstantEquation(constant) {
  if (isZero(constant)) return { solutions: 'all' };
  return { solutions: [] };
}

function solveLinear(coefficients, variable) {
  const a = coefficients[1] ?? createRational(0);
  const b = coefficients[0] ?? createRational(0);
  if (isZero(a)) return checkConstantEquation(b);
  const solution = div(neg(b), a);
  return { solutions: [formatSolution(solution)] };
}

function solveQuadratic(coefficients, variable) {
  const a = coefficients[2] ?? createRational(0);
  const b = coefficients[1] ?? createRational(0);
  const c = coefficients[0] ?? createRational(0);
  if (isZero(a)) return solveLinear(coefficients, variable);
  const discriminant = sub(pow(b, 2), mul(createRational(4), mul(a, c)));
  const discriminantNumber = toNumber(discriminant);
  if (discriminantNumber < 0) return { solutions: [], note: 'No real roots' };
  if (discriminantNumber === 0) {
    const solution = div(neg(b), mul(createRational(2), a));
    return { solutions: [formatSolution(solution)] };
  }
  const root = Math.sqrt(discriminantNumber);
  const denominator = toNumber(mul(createRational(2), a));
  const first = (-toNumber(b) - root) / denominator;
  const second = (-toNumber(b) + root) / denominator;
  const sorted = [first, second].sort((x, y) => x - y);
  return { solutions: sorted.map((value) => formatSolution(fromNumber(value))) };
}

function formatSolution(value) {
  return value.denominator === 1n
    ? Number(value.numerator)
    : `${value.numerator}/${value.denominator}`;
}