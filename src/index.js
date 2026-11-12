import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { evaluateNode } from './evaluator.js';
import { solveEquation } from './solver.js';
import { simplifyExpression } from './simplifier.js';
import { FUNCTIONS } from './functions.js';
import { MathCompError, ErrorCode, isMathCompError, toErrorResult } from './errors.js';
import { format } from './rational.js';

export class MathComp {
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

export { MathCompError, ErrorCode, isMathCompError };
export default MathComp;