(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FortySecondMindExact = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function bigAbs(value) { return value < 0n ? -value : value; }

  function bigGcd(a, b) {
    let x = bigAbs(a);
    let y = bigAbs(b);
    while (y !== 0n) { const t = x % y; x = y; y = t; }
    return x || 1n;
  }

  class Rational {
    constructor(numerator, denominator) {
      let n = BigInt(numerator);
      let d = denominator == null ? 1n : BigInt(denominator);
      if (d === 0n) throw new Error('division by zero');
      if (d < 0n) { n = -n; d = -d; }
      const g = bigGcd(n, d);
      this.n = n / g;
      this.d = d / g;
      Object.freeze(this);
    }
    static zero() { return new Rational(0n, 1n); }
    static one() { return new Rational(1n, 1n); }
    static from(value) {
      if (value instanceof Rational) return value;
      if (typeof value === 'bigint') return new Rational(value, 1n);
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) throw new Error('non-finite arithmetic result');
        return Rational.parse(String(value));
      }
      return Rational.parse(String(value));
    }
    static parse(source) {
      const text = String(source).trim();
      const match = text.match(/^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/);
      if (!match) throw new Error('number expected');
      const sign = match[1] === '-' ? -1n : 1n;
      const whole = match[2] || '0';
      const fraction = match[3] != null ? match[3] : (match[4] || '');
      const exponent = Number(match[5] || 0);
      if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 10000) throw new Error('numeric exponent out of range');
      const digits = (whole + fraction).replace(/^0+(?=\d)/, '') || '0';
      let n = sign * BigInt(digits);
      let d = 10n ** BigInt(fraction.length);
      if (exponent > 0) n *= 10n ** BigInt(exponent);
      else if (exponent < 0) d *= 10n ** BigInt(-exponent);
      return new Rational(n, d);
    }
    add(other) { const r = Rational.from(other); return new Rational(this.n * r.d + r.n * this.d, this.d * r.d); }
    sub(other) { const r = Rational.from(other); return new Rational(this.n * r.d - r.n * this.d, this.d * r.d); }
    mul(other) { const r = Rational.from(other); return new Rational(this.n * r.n, this.d * r.d); }
    div(other) { const r = Rational.from(other); if (r.n === 0n) throw new Error('division by zero'); return new Rational(this.n * r.d, this.d * r.n); }
    neg() { return new Rational(-this.n, this.d); }
    abs() { return new Rational(bigAbs(this.n), this.d); }
    pow(exponent) {
      const e = Number(exponent);
      if (!Number.isSafeInteger(e) || Math.abs(e) > 4096) throw new Error('integer exponent required');
      if (e === 0) return Rational.one();
      if (e > 0) return new Rational(this.n ** BigInt(e), this.d ** BigInt(e));
      if (this.n === 0n) throw new Error('division by zero');
      return new Rational(this.d ** BigInt(-e), this.n ** BigInt(-e));
    }
    compare(other) { const r = Rational.from(other); const delta = this.n * r.d - r.n * this.d; return delta < 0n ? -1 : delta > 0n ? 1 : 0; }
    isZero() { return this.n === 0n; }
    isInteger() { return this.d === 1n; }
    toString() { return this.d === 1n ? String(this.n) : `${this.n}/${this.d}`; }
    toDecimal() {
      let d = this.d;
      let twos = 0;
      let fives = 0;
      while (d % 2n === 0n) { d /= 2n; twos += 1; }
      while (d % 5n === 0n) { d /= 5n; fives += 1; }
      if (d !== 1n) return this.toString();
      const places = Math.max(twos, fives);
      const scaled = this.n * (2n ** BigInt(places - twos)) * (5n ** BigInt(places - fives));
      const sign = scaled < 0n ? '-' : '';
      const digits = String(bigAbs(scaled)).padStart(places + 1, '0');
      if (places === 0) return sign + digits;
      const whole = digits.slice(0, -places) || '0';
      const frac = digits.slice(-places).replace(/0+$/, '');
      return frac ? `${sign}${whole}.${frac}` : `${sign}${whole}`;
    }
    toJSON() { return this.toString(); }
  }

  class ArithmeticParser {
    constructor(source) {
      this.source = String(source).replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
      this.i = 0;
    }

    peek() { return this.source[this.i] || ''; }
    skip() { while (/\s/.test(this.peek())) this.i += 1; }
    consume(char) {
      this.skip();
      if (this.source.slice(this.i, this.i + char.length) === char) {
        this.i += char.length;
        return true;
      }
      return false;
    }

    parse() {
      const value = this.expression();
      this.skip();
      if (this.i !== this.source.length) throw new Error('unsupported arithmetic syntax');
      return value;
    }

    expression() {
      let value = this.term();
      for (;;) {
        if (this.consume('+')) value = value.add(this.term());
        else if (this.consume('-')) value = value.sub(this.term());
        else break;
      }
      return value;
    }

    term() {
      let value = this.power();
      for (;;) {
        if (this.consume('*')) value = value.mul(this.power());
        else if (this.consume('/')) value = value.div(this.power());
        else if (this.consume('%')) {
          const d = this.power();
          if (!value.isInteger() || !d.isInteger()) throw new Error('modulo requires integers');
          if (d.n === 0n) throw new Error('division by zero');
          value = new Rational(value.n % d.n, 1n);
        } else break;
      }
      return value;
    }

    power() {
      let value = this.unary();
      if (this.consume('^')) {
        const exponent = this.power();
        if (!exponent.isInteger()) throw new Error('integer exponent required');
        value = value.pow(Number(exponent.n));
      }
      return value;
    }

    unary() {
      if (this.consume('+')) return this.unary();
      if (this.consume('-')) return this.unary().neg();
      return this.primary();
    }

    primary() {
      this.skip();
      if (this.consume('(')) {
        const value = this.expression();
        if (!this.consume(')')) throw new Error('missing closing parenthesis');
        return value;
      }
      const match = this.source.slice(this.i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
      if (!match) throw new Error('number expected');
      this.i += match[0].length;
      return Rational.parse(match[0]);
    }
  }

  function arithmeticValue(source) {
    return new ArithmeticParser(source).parse();
  }

  function findTopLevelComparator(text) {
    const ops = ['<=', '>=', '!=', '==', '<', '>', '='];
    let depth = 0;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (ch === '(') depth += 1;
      if (ch === ')') depth -= 1;
      if (depth !== 0) continue;
      for (const op of ops) {
        if (text.slice(i, i + op.length) === op) return { index: i, op };
      }
    }
    return null;
  }

  function evaluateArithmeticStatement(text) {
    const cmp = findTopLevelComparator(text);
    if (!cmp) throw new Error('comparison required');
    const leftText = text.slice(0, cmp.index).trim();
    const rightText = text.slice(cmp.index + cmp.op.length).trim();
    const left = arithmeticValue(leftText);
    const right = arithmeticValue(rightText);
    const order = left.compare(right);
    let aligned = false;
    if (cmp.op === '=' || cmp.op === '==') aligned = order === 0;
    else if (cmp.op === '!=') aligned = order !== 0;
    else if (cmp.op === '<') aligned = order < 0;
    else if (cmp.op === '>') aligned = order > 0;
    else if (cmp.op === '<=') aligned = order <= 0;
    else if (cmp.op === '>=') aligned = order >= 0;
    return {
      align: aligned ? 1 : 0,
      left,
      right,
      operator: cmp.op,
      leftText,
      rightText,
      normalized: `${leftText} ${cmp.op} ${rightText}`,
      proof: `${leftText} = ${formatNumber(left)}; ${rightText} = ${formatNumber(right)}`,
      correctPath: aligned
        ? `${leftText} ${cmp.op} ${rightText}`
        : `${formatNumber(left)} ${cmp.op === '=' || cmp.op === '==' ? '≠' : negateComparator(cmp.op)} ${formatNumber(right)}`
    };
  }

  function formatNumber(value) {
    const rational = Rational.from(value);
    return rational.toDecimal();
  }

  function negateComparator(op) {
    return ({ '<': '≥', '>': '≤', '<=': '>', '>=': '<', '!=': '=', '=': '≠', '==': '≠' })[op] || '≠';
  }

  return Object.freeze({ Rational, findTopLevelComparator, evaluateArithmeticStatement, formatNumber });
});
