export class MathCompError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'MathCompError';
    this.code = code;
    this.details = details;
  }
}

export const ErrorCode = Object.freeze({
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

export function isMathCompError(value) {
  return value instanceof MathCompError;
}

export function toErrorResult(error) {
  if (error instanceof MathCompError) {
    return { error: error.message, code: error.code, details: error.details };
  }
  return { error: error.message ?? String(error), code: ErrorCode.UNEXPECTED_ERROR };
}
