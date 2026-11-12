import { FUNCTIONS, applyPow } from './functions.js';
import { MathCompError, ErrorCode } from './errors.js';
import {
  fromNumber,
  add,
  sub,
  mul,
  div,
  neg,
  isZero,
} from './rational.js';

export function evaluateNode(node, variables = {}, functions = FUNCTIONS) {
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
  return typeof value === 'object' && value !== null && typeof value.numerator !== 'undefined'
    ? value
    : fromNumber(value);
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