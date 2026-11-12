import { TokenType } from './lexer.js';
import { MathCompError, ErrorCode } from './errors.js';

export function parse(tokens) {
  const state = { tokens, position: 0 };
  const ast = parseExpression(state);

  if (!isAtEnd(state)) {
    throw unexpectedToken(state);
  }
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
    throw new MathCompError(
      ErrorCode.PARSE_UNEXPECTED_END,
      'Expression ended unexpectedly'
    );
  }

  const token = consume(state);

  if (token.type === TokenType.NUMBER) {
    return { type: 'number', value: token.value };
  }

  if (token.type === TokenType.IDENT) {
    return parseIdentifier(state, token);
  }

  if (token.type === TokenType.OPERATOR && token.value === '(') {
    const inner = parseExpression(state);
    expectOperator(state, ')');
    return inner;
  }

  throw unexpectedToken(state, token);
}

function parseIdentifier(state, token) {
  if (!isOperator(state, '(')) {
    return { type: 'variable', name: token.value };
  }

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
    throw new MathCompError(
      ErrorCode.PARSE_UNEXPECTED_END,
      'Expression ended unexpectedly'
    );
  }
  return new MathCompError(
    ErrorCode.PARSE_UNEXPECTED_TOKEN,
    `Unexpected token "${token.value}" at position ${token.position}`,
    { token, position: token.position }
  );
}