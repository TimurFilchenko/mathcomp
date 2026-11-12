import { MathCompError, ErrorCode } from './errors.js';
import {
  createRational,
  fromNumber,
  add,
  mul,
  isZero,
} from './rational.js';

export function simplifyExpression(ast) {
  const terms = collectTerms(ast, createRational(1));
  const merged = mergeLikeTerms(terms);
  return formatPolynomial(merged);
}

function collectTerms(node, multiplier) {
  switch (node.type) {
    case 'number':
      return [createTerm(mul(multiplier, fromNumber(node.value)), {})];
    case 'variable':
      return [createTerm(multiplier, { [node.name]: 1 })];
    case 'unary':
      return node.op === '-'
        ? collectTerms(node.argument, mul(multiplier, createRational(-1)))
        : collectTerms(node.argument, multiplier);
    case 'binary':
      return collectBinaryTerms(node, multiplier);
    case 'call':
      throw new MathCompError(ErrorCode.SOLVE_UNSUPPORTED, `Cannot simplify expressions with function calls: ${node.name}`);
    default:
      throw new MathCompError(ErrorCode.EVAL_UNKNOWN_NODE, `Unknown node type: ${node.type}`);
  }
}

function collectBinaryTerms(node, multiplier) {
  if (node.op === '+') {
    return [...collectTerms(node.left, multiplier), ...collectTerms(node.right, multiplier)];
  }
  if (node.op === '-') {
    return [...collectTerms(node.left, multiplier), ...collectTerms(node.right, mul(multiplier, createRational(-1)))];
  }
  if (node.op === '*') {
    return multiplyTermLists(collectTerms(node.left, createRational(1)), collectTerms(node.right, multiplier));
  }
  if (node.op === '^') {
    return collectPowerTerms(node, multiplier);
  }
  throw new MathCompError(ErrorCode.SOLVE_UNSUPPORTED, `Cannot simplify expressions with operator: ${node.op}`);
}

function collectPowerTerms(node, multiplier) {
  if (node.left.type !== 'variable') {
    throw new MathCompError(ErrorCode.SOLVE_UNSUPPORTED, 'Base of a power must be a variable');
  }
  if (node.right.type !== 'number' || !Number.isInteger(node.right.value) || node.right.value < 0) {
    throw new MathCompError(ErrorCode.SOLVE_UNSUPPORTED, 'Exponent must be a non-negative integer');
  }
  return [createTerm(multiplier, { [node.left.name]: node.right.value })];
}

function multiplyTermLists(leftTerms, rightTerms) {
  const product = [];
  for (const left of leftTerms) {
    for (const right of rightTerms) {
      product.push(createTerm(mul(left.coefficient, right.coefficient), mergePowers(left.powers, right.powers)));
    }
  }
  return product;
}

function mergePowers(left, right) {
  const result = { ...left };
  for (const [name, power] of Object.entries(right)) {
    result[name] = (result[name] ?? 0) + power;
  }
  return result;
}

function createTerm(coefficient, powers) {
  return { coefficient, powers };
}

function mergeLikeTerms(terms) {
  const groups = new Map();
  for (const term of terms) {
    const key = powersKey(term.powers);
    const existing = groups.get(key);
    groups.set(key, createTerm(existing ? add(existing.coefficient, term.coefficient) : term.coefficient, term.powers));
  }
  return [...groups.values()].filter((term) => !isZero(term.coefficient));
}

function powersKey(powers) {
  return Object.entries(powers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, power]) => `${name}^${power}`)
    .join('*');
}

function formatPolynomial(terms) {
  if (terms.length === 0) return '0';
  const sorted = [...terms].sort(compareTerms);
  return sorted.map(formatTerm).join(' + ').replace(/\+ -/g, '- ');
}

function compareTerms(left, right) {
  const leftDegree = totalDegree(left.powers);
  const rightDegree = totalDegree(right.powers);
  if (leftDegree !== rightDegree) return rightDegree - leftDegree;
  return powersKey(left.powers).localeCompare(powersKey(right.powers));
}

function totalDegree(powers) {
  return Object.values(powers).reduce((sum, power) => sum + power, 0);
}

function formatTerm(term) {
  const variables = formatPowers(term.powers);
  const coefficient = formatCoefficient(term.coefficient, variables);
  return `${coefficient}${variables}`;
}

function formatPowers(powers) {
  return Object.entries(powers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, power]) => (power === 1 ? name : `${name}^${power}`))
    .join('*');
}

function formatCoefficient(coefficient, variables) {
  const numerator = coefficient.numerator;
  const denominator = coefficient.denominator;
  if (variables === '') {
    return denominator === 1n ? numerator.toString() : `${numerator}/${denominator}`;
  }
  if (numerator === 1n && denominator === 1n) return '';
  if (numerator === -1n && denominator === 1n) return '-';
  return denominator === 1n ? numerator.toString() : `${numerator}/${denominator}`;
}