import {
  createRational,
  fromNumber,
  toNumber,
  pow as rationalPow,
} from './rational.js';
import { MathCompError, ErrorCode } from './errors.js';

export const FUNCTIONS = {
  sqrt: (value) => nthRoot(value, createRational(2)),
  cbrt: (value) => nthRoot(value, createRational(3)),
  root: (degree, value) => nthRoot(value, degree),
  abs: (value) => createRational(
    value.numerator < 0n ? -value.numerator : value.numerator,
    value.denominator
  ),
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

function nthRoot(value, degree) {
  const degreeNumber = toNumber(degree);
  if (!Number.isInteger(degreeNumber) || degreeNumber < 2) {
    throw new MathCompError(
      ErrorCode.EVAL_UNKNOWN_FUNCTION,
      `Root degree must be an integer >= 2, got ${degreeNumber}`
    );
  }

  const isEven = degreeNumber % 2 === 0;
  if (isEven && value.numerator < 0n) {
    throw new MathCompError(
      ErrorCode.SOLVE_NO_REAL_ROOTS,
      `Cannot take an even root of a negative number`,
      { value: value.numerator.toString(), degree: degreeNumber }
    );
  }

  const exact = exactNthRoot(value, degreeNumber);
  if (exact) return exact;

  const sign = value.numerator < 0n ? -1 : 1;
  const magnitude = Math.abs(toNumber(value));
  const result = sign * Math.pow(magnitude, 1 / degreeNumber);
  if (!Number.isFinite(result)) {
    throw new MathCompError(
      ErrorCode.SOLVE_NO_REAL_ROOTS,
      'Root result is not finite',
      { degree: degreeNumber }
    );
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
    throw new MathCompError(
      ErrorCode.EVAL_UNKNOWN_OPERATOR,
      'Logarithm is undefined for non-positive numbers',
      { value: value.numerator.toString() }
    );
  }
  return fromNumber(implementation(toNumber(value)));
}

function extreme(values, isBetter) {
  if (values.length === 0) {
    throw new MathCompError(
      ErrorCode.EVAL_UNKNOWN_FUNCTION,
      'min/max requires at least one argument'
    );
  }
  return values.reduce((best, current) =>
    isBetter(toNumber(best), toNumber(current)) ? best : current
  );
}

function applyPow(base, exponent) {
  if (exponent.denominator !== 1n) {
    return fromNumber(Math.pow(toNumber(base), toNumber(exponent)));
  }
  return rationalPow(base, Number(exponent.numerator));
}