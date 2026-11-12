class MathCompError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'MathCompError';
    this.code = code;
    this.details = details;
  }
}

const ErrorCode = Object.freeze({
  LEX_UNEXPECTED_CHAR: 'LEX_UNEXPECTED_CHAR',
  PARSE_UNEXPECTED_TOKEN: 'PARSE_UNEXPECTED_TOKEN',
  PARSE_UNEXPECTED_END: 'PARSE_UNEXPECTED_END',
  EVAL_UNKNOWN_VARIABLE: 'EVAL_UNKNOWN_VARIABLE',
  EVAL_UNKNOWN_FUNCTION: 'EVAL_UNKNOWN_FUNCTION',
  EVAL_UNKNOWN_OPERATOR: 'EVAL_UNKNOWN_OPERATOR',
  EVAL_UNKNOWN_NODE: 'EVAL_UNKNOWN_NODE',
  EVAL_DIVISION_BY_ZERO: 'EVAL_DIVISION_BY_ZERO',
  SOLVE_NO_EQUALS_SIGN: 'SOLVE_NO_EQUALS_SIGN',
  SOLVE_UNSUPPORTED: 'SOLVE_UNSUPPORTED',
  SOLVE_NO_REAL_ROOTS: 'SOLVE_NO_REAL_ROOTS',
  REGISTER_INVALID_FUNCTION: 'REGISTER_INVALID_FUNCTION',
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
});

function isMathCompError(value) {
  return value instanceof MathCompError;
}

function toErrorResult(error) {
  if (error instanceof MathCompError) {
    return { error: error.message, code: error.code, details: error.details };
  }
  return { error: error.message ?? String(error), code: ErrorCode.UNEXPECTED_ERROR };
}

function createRational(numerator, denominator = 1n) {
  let n = toBigInt(numerator);
  let d = toBigInt(denominator);
  if (d === 0n) {
    throw new MathCompError(ErrorCode.EVAL_DIVISION_BY_ZERO, 'Division by zero', {
      numerator: n.toString(),
      denominator: d.toString(),
    });
  }
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const divisor = gcd(n < 0n ? -n : n, d);
  return { numerator: n / divisor, denominator: d / divisor };
}

function add(left, right) {
  return createRational(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator
  );
}

function sub(left, right) {
  return createRational(
    left.numerator * right.denominator - right.numerator * left.denominator,
    left.denominator * right.denominator
  );
}

function mul(left, right) {
  return createRational(left.numerator * right.numerator, left.denominator * right.denominator);
}

function div(left, right) {
  if (right.numerator === 0n) {
    throw new MathCompError(ErrorCode.EVAL_DIVISION_BY_ZERO, 'Division by zero', {
      dividend: format(left),
      divisor: format(right),
    });
  }
  return createRational(left.numerator * right.denominator, left.denominator * right.numerator);
}

function neg(value) {
  return createRational(-value.numerator, value.denominator);
}

function pow(base, exponent) {
  if (!Number.isInteger(exponent)) {
    return fromNumber(Math.pow(toNumber(base), exponent));
  }
  if (exponent < 0) {
    return createRational(base.denominator ** BigInt(-exponent), base.numerator ** BigInt(-exponent));
  }
  return createRational(base.numerator ** BigInt(exponent), base.denominator ** BigInt(exponent));
}

function fromNumber(value) {
  if (!Number.isFinite(value)) {
    throw new MathCompError(ErrorCode.EVAL_UNKNOWN_NODE, `Cannot convert non-finite number: ${value}`);
  }
  if (Number.isInteger(value)) {
    return createRational(BigInt(value), 1n);
  }
  const { mantissa, exponent } = parseDecimal(String(value));
  if (exponent >= 0) {
    return createRational(BigInt(mantissa) * 10n ** BigInt(exponent), 1n);
  }
  const scale = 10n ** BigInt(-exponent);
  const scaledNumerator = BigInt(mantissa.replace('.', ''));
  return createRational(scaledNumerator, scale);
}

function toNumber(value) {
  return Number(value.numerator) / Number(value.denominator);
}

function isZero(value) {
  return value.numerator === 0n;
}

function format(value) {
  return value.denominator === 1n ? value.numerator.toString() : `${value.numerator}/${value.denominator}`;
}

function toBigInt(value) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new MathCompError(ErrorCode.EVAL_UNKNOWN_NODE, `Cannot convert non-finite number: ${value}`);
    }
    if (!Number.isInteger(value)) {
      throw new MathCompError(ErrorCode.EVAL_UNKNOWN_NODE, `Cannot convert non-integer number to BigInt: ${value}`);
    }
    return BigInt(value);
  }
  throw new MathCompError(ErrorCode.EVAL_UNKNOWN_NODE, `Cannot convert value of type ${typeof value} to BigInt`);
}

function parseDecimal(text) {
  const normalized = text.toLowerCase();
  const eIndex = normalized.indexOf('e');
  if (eIndex === -1) {
    const dotIndex = text.indexOf('.');
    if (dotIndex === -1) return { mantissa: text, exponent: 0 };
    const fractionDigits = text.length - dotIndex - 1;
    return { mantissa: text, exponent: -fractionDigits };
  }
  const mantissaPart = text.slice(0, eIndex);
  const exponentPart = Number(text.slice(eIndex + 1));
  const dotIndex = mantissaPart.indexOf('.');
  const fractionDigits = dotIndex === -1 ? 0 : mantissaPart.length - dotIndex - 1;
  return { mantissa: mantissaPart, exponent: exponentPart - fractionDigits };
}

function gcd(a, b) {
  while (b !== 0n) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a || 1n;
}

const TokenType = Object.freeze({
  NUMBER: 'NUMBER',
  IDENT: 'IDENT',
  OPERATOR: 'OPERATOR',
});

const NUMBER_PATTERN = /^\d+(\.\d+)?([eE][+-]?\d+)?/;
const IDENT_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*/;
const OPERATOR_CHARS = '+-*/^(),=';
const WHITESPACE = /\s/;

function tokenize(input) {
  const tokens = [];
  let position = 0;
  while (position < input.length) {
    const char = input[position];
    if (WHITESPACE.test(char)) { position += 1; continue; }
    const numberMatch = input.slice(position).match(NUMBER_PATTERN);
    if (numberMatch) {
      tokens.push({ type: TokenType.NUMBER, value: Number(numberMatch[0]), raw: numberMatch[0], position });
      position += numberMatch[0].length;
      continue;
    }
    const identMatch = input.slice(position).match(IDENT_PATTERN);
    if (identMatch) {
      tokens.push({ type: TokenType.IDENT, value: identMatch[0], position });
      position += identMatch[0].length;
      continue;
    }
    if (OPERATOR_CHARS.includes(char)) {
      tokens.push({ type: TokenType.OPERATOR, value: char, position });
      position += 1;
      continue;
    }
    throw new MathCompError(
      ErrorCode.LEX_UNEXPECTED_CHAR,
      `Unexpected character "${char}" at position ${position}`,
      { char, position }
    );
  }
  return tokens;
}

function parse(tokens) {
  const state = { tokens, position: 0 };
  const ast = parseExpression(state);
  if (!isAtEnd(state)) throw unexpectedToken(state);
  return ast;
}

function parseExpression(state) {
  let left = parseTerm(state);
  while (isOperator(state, '+') || isOperator(state, '-')) {
    const op = consume(state).value;
    const right = parseTerm(state);
    left = { type: 'binary', op, left, right };
  }
  return left;
}

function parseTerm(state) {
  let left = parseFactor(state);
  while (true) {
    if (isOperator(state, '*') || isOperator(state, '/')) {
      const op = consume(state).value;
      const right = parseFactor(state);
      left = { type: 'binary', op, left, right };
      continue;
    }
    if (startsImplicitFactor(state)) {
      const right = parseFactor(state);
      left = { type: 'binary', op: '*', left, right };
      continue;
    }
    break;
  }
  return left;
}

function parseFactor(state) {
  const base = parseUnary(state);
  if (isOperator(state, '^')) {
    consume(state);
    const exponent = parseFactor(state);
    return { type: 'binary', op: '^', left: base, right: exponent };
  }
  return base;
}

function parseUnary(state) {
  if (isOperator(state, '-')) {
    consume(state);
    return { type: 'unary', op: '-', argument: parseUnary(state) };
  }
  if (isOperator(state, '+')) {
    consume(state);
    return parseUnary(state);
  }
  return parsePrimary(state);
}

function parsePrimary(state) {
  if (isAtEnd(state)) {
    throw new MathCompError(ErrorCode.PARSE_UNEXPECTED_END, 'Expression ended unexpectedly');
  }
  const token = consume(state);
  if (token.type === TokenType.NUMBER) return { type: 'number', value: token.value };
  if (token.type === TokenType.IDENT) return parseIdentifier(state, token);
  if (token.type === TokenType.OPERATOR && token.value === '(') {
    const inner = parseExpression(state);
    expectOperator(state, ')');
    return inner;
  }
  throw unexpectedToken(state, token);
}

function parseIdentifier(state, token) {
  if (!isOperator(state, '(')) return { type: 'variable', name: token.value };
  consume(state);
  const args = [];
  if (!isOperator(state, ')')) {
    args.push(parseExpression(state));
    while (isOperator(state, ',')) {
      consume(state);
      args.push(parseExpression(state));
    }
  }
  expectOperator(state, ')');
  return { type: 'call', name: token.value, arguments: args };
}

function startsImplicitFactor(state) {
  const token = state.tokens[state.position];
  if (!token) return false;
  if (token.type === TokenType.NUMBER) return true;
  if (token.type === TokenType.IDENT) return true;
  return token.type === TokenType.OPERATOR && token.value === '(';
}

function isAtEnd(state) {
  return state.position >= state.tokens.length;
}

function isOperator(state, value) {
  const token = state.tokens[state.position];
  return token?.type === TokenType.OPERATOR && token.value === value;
}

function consume(state) {
  return state.tokens[state.position++];
}

function expectOperator(state, value) {
  if (!isOperator(state, value)) throw unexpectedToken(state);
  consume(state);
}

function unexpectedToken(state, token = state.tokens[state.position]) {
  if (!token) {
    throw new MathCompError(ErrorCode.PARSE_UNEXPECTED_END, 'Expression ended unexpectedly');
  }
  return new MathCompError(
    ErrorCode.PARSE_UNEXPECTED_TOKEN,
    `Unexpected token "${token.value}" at position ${token.position}`,
    { token, position: token.position }
  );
}

function nthRoot(value, degree) {
  const degreeNumber = toNumber(degree);
  if (!Number.isInteger(degreeNumber) || degreeNumber < 2) {
    throw new MathCompError(ErrorCode.EVAL_UNKNOWN_FUNCTION, `Root degree must be an integer >= 2, got ${degreeNumber}`);
  }
  const isEven = degreeNumber % 2 === 0;
  if (isEven && value.numerator < 0n) {
    throw new MathCompError(ErrorCode.SOLVE_NO_REAL_ROOTS, 'Cannot take an even root of a negative number', { value: value.numerator.toString(), degree: degreeNumber });
  }
  const exact = exactNthRoot(value, degreeNumber);
  if (exact) return exact;
  const sign = value.numerator < 0n ? -1 : 1;
  const magnitude = Math.abs(toNumber(value));
  const result = sign * Math.pow(magnitude, 1 / degreeNumber);
  if (!Number.isFinite(result)) {
    throw new MathCompError(ErrorCode.SOLVE_NO_REAL_ROOTS, 'Root result is not finite', { degree: degreeNumber });
  }
  return fromNumber(result);
}

function exactNthRoot(value, degree) {
  const sign = value.numerator < 0n ? -1n : 1n;
  const numeratorMagnitude = value.numerator < 0n ? -value.numerator : value.numerator;
  const denominatorMagnitude = value.denominator;
  const numeratorRoot = roundNthRoot(Number(numeratorMagnitude), degree);
  const denominatorRoot = roundNthRoot(Number(denominatorMagnitude), degree);
  if (
    numeratorRoot !== null &&
    denominatorRoot !== null &&
    BigInt(numeratorRoot) ** BigInt(degree) === numeratorMagnitude &&
    BigInt(denominatorRoot) ** BigInt(degree) === denominatorMagnitude
  ) {
    return createRational(sign * BigInt(numeratorRoot), BigInt(denominatorRoot));
  }
  return null;
}

function roundNthRoot(value, degree) {
  if (!Number.isFinite(value)) return null;
  const result = Math.round(Math.pow(value, 1 / degree));
  return Number.isFinite(result) ? result : null;
}

function logarithm(value, implementation) {
  if (value.numerator <= 0n) {
    throw new MathCompError(ErrorCode.EVAL_UNKNOWN_OPERATOR, 'Logarithm is undefined for non-positive numbers', { value: value.numerator.toString() });
  }
  return fromNumber(implementation(toNumber(value)));
}

function extreme(values, isBetter) {
  if (values.length === 0) {
    throw new MathCompError(ErrorCode.EVAL_UNKNOWN_FUNCTION, 'min/max requires at least one argument');
  }
  return values.reduce((best, current) => (isBetter(toNumber(best), toNumber(current)) ? best : current));
}

function applyPow(base, exponent) {
  if (exponent.denominator !== 1n) {
    return fromNumber(Math.pow(toNumber(base), toNumber(exponent)));
  }
  return pow(base, Number(exponent.numerator));
}

const FUNCTIONS = {
  sqrt: (value) => nthRoot(value, createRational(2)),
  cbrt: (value) => nthRoot(value, createRational(3)),
  root: (degree, value) => nthRoot(value, degree),
  abs: (value) => createRational(value.numerator < 0n ? -value.numerator : value.numerator, value.denominator),
  sin: (value) => fromNumber(Math.sin(toNumber(value))),
  cos: (value) => fromNumber(Math.cos(toNumber(value))),
  tan: (value) => fromNumber(Math.tan(toNumber(value))),
  ln: (value) => logarithm(value, Math.log),
  log: (value) => logarithm(value, Math.log10),
  exp: (value) => fromNumber(Math.exp(toNumber(value))),
  floor: (value) => fromNumber(Math.floor(toNumber(value))),
  ceil: (value) => fromNumber(Math.ceil(toNumber(value))),
  round: (value) => fromNumber(Math.round(toNumber(value))),
  min: (...values) => extreme(values, (a, b) => a <= b),
  max: (...values) => extreme(values, (a, b) => a >= b),
  pow: (base, exponent) => applyPow(base, exponent),
};

function evaluateNode(node, variables = {}, functions = FUNCTIONS) {
  switch (node.type) {
    case 'number': return fromNumber(node.value);
    case 'variable': return resolveVariable(node.name, variables);
    case 'unary': return evaluateUnary(node, variables, functions);
    case 'binary': return evaluateBinary(node, variables, functions);
    case 'call': return evaluateCall(node, variables, functions);
    default:
      throw new MathCompError(ErrorCode.EVAL_UNKNOWN_NODE, `Unknown node type: ${node.type}`);
  }
}

function resolveVariable(name, variables) {
  if (!Object.hasOwn(variables, name)) {
    throw new MathCompError(ErrorCode.EVAL_UNKNOWN_VARIABLE, `Unknown variable: ${name}`, { name });
  }
  const value = variables[name];
  return typeof value === 'object' && value !== null && typeof value.numerator !== 'undefined' ? value : fromNumber(value);
}

function evaluateUnary(node, variables, functions) {
  const value = evaluateNode(node.argument, variables, functions);
  return node.op === '-' ? neg(value) : value;
}

function evaluateBinary(node, variables, functions) {
  const left = evaluateNode(node.left, variables, functions);
  const right = evaluateNode(node.right, variables, functions);
  return applyBinaryOperator(node.op, left, right);
}

function applyBinaryOperator(op, left, right) {
  switch (op) {
    case '+': return add(left, right);
    case '-': return sub(left, right);
    case '*': return mul(left, right);
    case '/': return divideOrThrow(left, right);
    case '^': return applyPow(left, right);
    default:
      throw new MathCompError(ErrorCode.EVAL_UNKNOWN_OPERATOR, `Unknown operator: ${op}`, { op });
  }
}

function divideOrThrow(dividend, divisor) {
  if (isZero(divisor)) {
    throw new MathCompError(ErrorCode.EVAL_DIVISION_BY_ZERO, 'Division by zero');
  }
  return div(dividend, divisor);
}

function evaluateCall(node, variables, functions) {
  const fn = functions[node.name];
  if (!fn) {
    throw new MathCompError(ErrorCode.EVAL_UNKNOWN_FUNCTION, `Unknown function: ${node.name}`, { name: node.name });
  }
  const argumentValues = node.arguments.map((argument) => evaluateNode(argument, variables, functions));
  return fn(...argumentValues);
}

function collectTerms(node, multiplier) {
  switch (node.type) {
    case 'number': return [createTerm(mul(multiplier, fromNumber(node.value)), {})];
    case 'variable': return [createTerm(multiplier, { [node.name]: 1 })];
    case 'unary':
      return node.op === '-'
        ? collectTerms(node.argument, mul(multiplier, createRational(-1)))
        : collectTerms(node.argument, multiplier);
    case 'binary': return collectBinaryTerms(node, multiplier);
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

function simplifyExpression(ast) {
  const terms = collectTerms(ast, createRational(1));
  const merged = mergeLikeTerms(terms);
  return formatPolynomial(merged);
}

function solveEquation(input) {
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
    case 'number': return { variable: null, 0: fromNumber(node.value) };
    case 'variable': return { variable: node.name, 1: createRational(1), 0: createRational(0) };
    case 'unary':
      if (node.op === '-') return negateCoefficients(collectCoefficients(node.argument));
      return collectCoefficients(node.argument);
    case 'binary': return collectBinary(node);
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
  return value.denominator === 1n ? Number(value.numerator) : `${value.numerator}/${value.denominator}`;
}

class MathComp {
  constructor() {
    this.functions = { ...FUNCTIONS };
  }

  eval(input, variables = {}) {
    return this.attempt(() => {
      const ast = parse(tokenize(String(input)));
      const result = evaluateNode(ast, variables, this.functions);
      return { value: formatResult(result) };
    });
  }

  solve(input) {
    return this.attempt(() => solveEquation(String(input)));
  }

  simplify(input) {
    return this.attempt(() => {
      const ast = parse(tokenize(String(input)));
      return { value: simplifyExpression(ast) };
    });
  }

  registerFunction(name, fn) {
    if (typeof name !== 'string' || name.length === 0) {
      throw new MathCompError(ErrorCode.REGISTER_INVALID_FUNCTION, 'Function name must be a non-empty string');
    }
    if (typeof fn !== 'function') {
      throw new MathCompError(ErrorCode.REGISTER_INVALID_FUNCTION, `registerFunction expects a function, got ${typeof fn}`, { name });
    }
    this.functions[name] = fn;
    return this;
  }

  attempt(operation) {
    try {
      return operation();
    } catch (error) {
      return toErrorResult(error);
    }
  }
}

function formatResult(value) {
  return value.denominator === 1n ? Number(value.numerator) : format(value);
}

export { MathComp, MathCompError, ErrorCode, isMathCompError };
export default MathComp;
