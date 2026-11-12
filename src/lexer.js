import { MathCompError, ErrorCode } from './errors.js';

export const TokenType = Object.freeze({
  NUMBER: 'NUMBER',
  IDENT: 'IDENT',
  OPERATOR: 'OPERATOR',
});

const NUMBER_PATTERN = /^\d+(\.\d+)?([eE][+-]?\d+)?/;
const IDENT_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*/;
const OPERATOR_CHARS = '+-*/^(),=';
const WHITESPACE = /\s/;

export function tokenize(input) {
  const tokens = [];
  let position = 0;

  while (position < input.length) {
    const char = input[position];

    if (WHITESPACE.test(char)) {
      position += 1;
      continue;
    }

    const numberMatch = input.slice(position).match(NUMBER_PATTERN);
    if (numberMatch) {
      tokens.push({
        type: TokenType.NUMBER,
        value: Number(numberMatch[0]),
        raw: numberMatch[0],
        position,
      });
      position += numberMatch[0].length;
      continue;
    }

    const identMatch = input.slice(position).match(IDENT_PATTERN);
    if (identMatch) {
      tokens.push({
        type: TokenType.IDENT,
        value: identMatch[0],
        position,
      });
      position += identMatch[0].length;
      continue;
    }

    if (OPERATOR_CHARS.includes(char)) {
      tokens.push({
        type: TokenType.OPERATOR,
        value: char,
        position,
      });
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