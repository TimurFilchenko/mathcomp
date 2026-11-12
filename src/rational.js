import { MathCompError, ErrorCode } from './errors.js';

export function createRational(numerator, denominator = 1) {
  if (denominator === 0) {
    throw new MathCompError(
      ErrorCode.EVAL_DIVISION_BY_ZERO,
      'Division by zero',
      { numerator, denominator }
    );
  }
  const sign = denominator < 0 ? -1 : 1;
  const signedNumerator = numerator * sign;
  const signedDenominator = denominator * sign;
  const divisor = gcd(Math.abs(signedNumerator), signedDenominator);
  return {
    numerator: signedNumerator / divisor,
    denominator: signedDenominator / divisor,
  };
}

export function add(left, right) {
  return createRational(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator
  );
}

export function sub(left, right) {
  return createRational(
    left.numerator * right.denominator - right.numerator * left.denominator,
    left.denominator * right.denominator
  );
}

export function mul(left, right) {
  return createRational(
    left.numerator * right.numerator,
    left.denominator * right.denominator
  );
}

export function div(left, right) {
  if (right.numerator === 0) {
    throw new MathCompError(
      ErrorCode.EVAL_DIVISION_BY_ZERO,
      'Division by zero',
      { dividend: left, divisor: right }
    );
  }
  return createRational(
    left.numerator * right.denominator,
    left.denominator * right.numerator
  );
}

export function neg(value) {
  return createRational(-value.numerator, value.denominator);
}

export function pow(base, exponent) {
  if (!Number.isInteger(exponent)) {
    return fromNumber(Math.pow(toNumber(base), exponent));
  }
  if (exponent < 0) {
    return createRational(
      base.denominator ** -exponent,
      base.numerator ** -exponent
    );
  }
  return createRational(
    base.numerator ** exponent,
    base.denominator ** exponent
  );
}

export function fromNumber(value) {
  if (!Number.isFinite(value)) {
    throw new MathCompError(
      ErrorCode.EVAL_UNKNOWN_NODE,
      `Cannot convert non-finite number: ${value}`
    );
  }
  if (Number.isInteger(value)) {
    return createRational(value, 1);
  }

  const { mantissa, exponent } = parseDecimal(String(value));

  if (exponent >= 0) {
    return createRational(
      Number(mantissa) * 10 ** exponent,
      1
    );
  }

  const scale = 10 ** -exponent;
  const scaledNumerator = Number(mantissa.replace('.', ''));
  return createRational(scaledNumerator, scale);
}

export function toNumber(value) {
  return value.numerator / value.denominator;
}

export function isZero(value) {
  return value.numerator === 0;
}

export function isInteger(value) {
  return value.denominator === 1;
}

export function equals(left, right) {
  return (
    left.numerator === right.numerator &&
    left.denominator === right.denominator
  );
}

export function compare(left, right) {
  return left.numerator * right.denominator - right.numerator * left.denominator;
}

export function format(value) {
  return value.denominator === 1
    ? String(value.numerator)
    : `${value.numerator}/${value.denominator}`;
}

function parseDecimal(text) {
  const normalized = text.toLowerCase();
  const eIndex = normalized.indexOf('e');

  if (eIndex === -1) {
    const dotIndex = text.indexOf('.');
    if (dotIndex === -1) {
      return { mantissa: text, exponent: 0 };
    }
    const fractionDigits = text.length - dotIndex - 1;
    return { mantissa: text, exponent: -fractionDigits };
  }

  const mantissaPart = text.slice(0, eIndex);
  const exponentPart = Number(text.slice(eIndex + 1));
  const dotIndex = mantissaPart.indexOf('.');
  const fractionDigits = dotIndex === -1 ? 0 : mantissaPart.length - dotIndex - 1;
  return {
    mantissa: mantissaPart,
    exponent: exponentPart - fractionDigits,
  };
}

function gcd(a, b) {
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a || 1;
}