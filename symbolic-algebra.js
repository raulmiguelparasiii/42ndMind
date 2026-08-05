(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./exact.js'));
  else root.FortySecondMindAlgebra = factory(root.FortySecondMindExact);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Exact) {
  'use strict';
  if (!Exact) throw new Error('exact.js must load before symbolic-algebra.js');
  const { Rational, findTopLevelComparator } = Exact;
  function canonicalize(value) { if (Array.isArray(value)) return value.map(canonicalize); if (value && typeof value === 'object') { const out = {}; Object.keys(value).sort().forEach((key) => { out[key] = canonicalize(value[key]); }); return out; } return value; }
  function stableStringify(value) { return JSON.stringify(canonicalize(value)); }

  function numberNode(value) { return { type: 'number', value: Rational.from(value) }; }
  function symbolNode(name) { return { type: 'symbol', name: String(name) }; }

  function expandImplicitProducts(source, knownSymbols) {
    const known = new Set(knownSymbols || []);
    let text = String(source).replace(/²/g, '^2').replace(/³/g, '^3');
    text = text.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (token) => {
      if (known.has(token)) return token;
      if (/^[a-z]{2,3}$/.test(token)) return token.split('').join('*');
      return token;
    });
    return text
      .replace(/(\d|\))(?=[A-Za-z_(])/g, '$1*')
      .replace(/([A-Za-z_]|\))(?=\()/g, '$1*');
  }

  class SymbolicParser {
    constructor(source, knownSymbols) {
      this.source = expandImplicitProducts(String(source).replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/'), knownSymbols).trim();
      this.i = 0;
    }
    peek() { return this.source[this.i] || ''; }
    skip() { while (/\s/.test(this.peek())) this.i += 1; }
    consume(text) {
      this.skip();
      if (this.source.slice(this.i, this.i + text.length) === text) { this.i += text.length; return true; }
      return false;
    }
    parse() {
      const node = this.expression();
      this.skip();
      if (this.i !== this.source.length) throw new Error(`unsupported symbolic syntax near: ${this.source.slice(this.i)}`);
      return simplifyExpr(node);
    }
    expression() {
      let node = this.term();
      for (;;) {
        if (this.consume('+')) node = { type: 'add', terms: [node, this.term()] };
        else if (this.consume('-')) node = { type: 'add', terms: [node, { type: 'mul', factors: [numberNode(-1), this.term()] }] };
        else break;
      }
      return node;
    }
    term() {
      let node = this.power();
      for (;;) {
        if (this.consume('*')) node = { type: 'mul', factors: [node, this.power()] };
        else if (this.consume('/')) node = { type: 'mul', factors: [node, { type: 'pow', base: this.power(), exponent: -1 }] };
        else break;
      }
      return node;
    }
    power() {
      let node = this.unary();
      if (this.consume('^')) {
        const exponentNode = this.unary();
        if (exponentNode.type !== 'number' || !exponentNode.value.isInteger()) throw new Error('symbolic powers currently require an integer exponent');
        const exponent = Number(exponentNode.value.n);
        if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 128) throw new Error('symbolic exponent out of range');
        node = { type: 'pow', base: node, exponent };
      }
      return node;
    }
    unary() {
      if (this.consume('+')) return this.unary();
      if (this.consume('-')) return { type: 'mul', factors: [numberNode(-1), this.unary()] };
      return this.primary();
    }
    primary() {
      this.skip();
      if (this.consume('(')) {
        const node = this.expression();
        if (!this.consume(')')) throw new Error('missing closing parenthesis');
        return node;
      }
      const number = this.source.slice(this.i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
      if (number) { this.i += number[0].length; return numberNode(Rational.parse(number[0])); }
      const identifier = this.source.slice(this.i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (identifier) { this.i += identifier[0].length; return symbolNode(identifier[0]); }
      throw new Error('number, symbol, or parenthesized expression expected');
    }
  }

  function parseSymbolicExpression(source, knownSymbols) { return new SymbolicParser(source, knownSymbols).parse(); }

  function expressionPrecedence(node) {
    if (node.type === 'add') return 1;
    if (node.type === 'mul') return 2;
    if (node.type === 'pow') return 3;
    return 4;
  }

  function expressionText(node, parentPrecedence) {
    const parent = parentPrecedence || 0;
    let text;
    if (node.type === 'number') text = node.value.toDecimal();
    else if (node.type === 'symbol') text = node.name;
    else if (node.type === 'add') text = node.terms.map((term) => expressionText(term, 1)).join(' + ').replace(/\+ -/g, '- ');
    else if (node.type === 'mul') text = node.factors.map((factor) => expressionText(factor, 2)).join('*');
    else if (node.type === 'pow') text = `${expressionText(node.base, 3)}^${node.exponent}`;
    else throw new Error('unknown symbolic node');
    return expressionPrecedence(node) < parent ? `(${text})` : text;
  }

  function expressionKey(node) {
    if (node.type === 'number') return `N:${node.value.toString()}`;
    if (node.type === 'symbol') return `S:${node.name}`;
    if (node.type === 'add') return `A:${node.terms.map(expressionKey).join('|')}`;
    if (node.type === 'mul') return `M:${node.factors.map(expressionKey).join('|')}`;
    if (node.type === 'pow') return `P:${expressionKey(node.base)}:${node.exponent}`;
    return stableStringify(node);
  }

  function simplifyExpr(node) {
    if (!node || node.type === 'number' || node.type === 'symbol') return node;
    if (node.type === 'pow') {
      const base = simplifyExpr(node.base);
      const exponent = Number(node.exponent);
      if (exponent === 0) return numberNode(1);
      if (exponent === 1) return base;
      if (base.type === 'number') return numberNode(base.value.pow(exponent));
      if (base.type === 'pow') return simplifyExpr({ type: 'pow', base: base.base, exponent: base.exponent * exponent });
      return { type: 'pow', base, exponent };
    }
    if (node.type === 'mul') {
      const flat = [];
      node.factors.map(simplifyExpr).forEach((factor) => {
        if (factor.type === 'mul') flat.push(...factor.factors);
        else flat.push(factor);
      });
      let coefficient = Rational.one();
      const powers = new Map();
      flat.forEach((factor) => {
        if (factor.type === 'number') { coefficient = coefficient.mul(factor.value); return; }
        const base = factor.type === 'pow' ? factor.base : factor;
        const exponent = factor.type === 'pow' ? factor.exponent : 1;
        const key = expressionKey(base);
        const current = powers.get(key) || { base, exponent: 0 };
        current.exponent += exponent;
        powers.set(key, current);
      });
      if (coefficient.isZero()) return numberNode(0);
      const factors = [];
      if (coefficient.compare(1) !== 0 || powers.size === 0) factors.push(numberNode(coefficient));
      Array.from(powers.values())
        .filter((entry) => entry.exponent !== 0)
        .sort((a, b) => expressionKey(a.base).localeCompare(expressionKey(b.base)))
        .forEach((entry) => factors.push(entry.exponent === 1 ? entry.base : { type: 'pow', base: entry.base, exponent: entry.exponent }));
      if (!factors.length) return numberNode(1);
      if (factors.length === 1) return factors[0];
      return { type: 'mul', factors };
    }
    if (node.type === 'add') {
      const flat = [];
      node.terms.map(simplifyExpr).forEach((term) => {
        if (term.type === 'add') flat.push(...term.terms);
        else flat.push(term);
      });
      const groups = new Map();
      flat.forEach((term) => {
        let coefficient = Rational.one();
        let body = null;
        if (term.type === 'number') coefficient = term.value;
        else if (term.type === 'mul' && term.factors[0] && term.factors[0].type === 'number') {
          coefficient = term.factors[0].value;
          body = term.factors.length === 2 ? term.factors[1] : { type: 'mul', factors: term.factors.slice(1) };
        } else body = term;
        const key = body ? expressionKey(body) : 'CONST';
        const current = groups.get(key) || { body, coefficient: Rational.zero() };
        current.coefficient = current.coefficient.add(coefficient);
        groups.set(key, current);
      });
      const terms = [];
      Array.from(groups.values())
        .filter((entry) => !entry.coefficient.isZero())
        .sort((a, b) => (a.body ? expressionKey(a.body) : '').localeCompare(b.body ? expressionKey(b.body) : ''))
        .forEach((entry) => {
          if (!entry.body) terms.push(numberNode(entry.coefficient));
          else if (entry.coefficient.compare(1) === 0) terms.push(entry.body);
          else terms.push(simplifyExpr({ type: 'mul', factors: [numberNode(entry.coefficient), entry.body] }));
        });
      if (!terms.length) return numberNode(0);
      if (terms.length === 1) return terms[0];
      return { type: 'add', terms };
    }
    throw new Error('unknown symbolic node');
  }

  function expressionSymbols(node, out) {
    const set = out || new Set();
    if (!node) return set;
    if (node.type === 'symbol') set.add(node.name);
    if (node.type === 'add') node.terms.forEach((x) => expressionSymbols(x, set));
    if (node.type === 'mul') node.factors.forEach((x) => expressionSymbols(x, set));
    if (node.type === 'pow') expressionSymbols(node.base, set);
    return set;
  }

  function parseSymbolicRelation(source, knownSymbols) {
    const text = String(source).trim();
    const cmp = findTopLevelComparator(text);
    if (!cmp) throw new Error('symbolic relation requires =, !=, <, >, <=, or >=');
    const leftText = text.slice(0, cmp.index).trim();
    const rightText = text.slice(cmp.index + cmp.op.length).trim();
    if (!leftText || !rightText) throw new Error('both sides of the relation are required');
    return { left: parseSymbolicExpression(leftText, knownSymbols), right: parseSymbolicExpression(rightText, knownSymbols), operator: cmp.op === '==' ? '=' : cmp.op };
  }

  function relationText(relation) { return `${expressionText(relation.left)} ${relation.operator} ${expressionText(relation.right)}`; }

  function reverseOperator(operator) {
    return ({ '=': '=', '!=': '!=', '<': '>', '>': '<', '<=': '>=', '>=': '<=' })[operator];
  }

  function negateRelationOperator(operator) {
    return ({ '=': '!=', '!=': '=', '<': '>=', '>': '<=', '<=': '>', '>=': '<' })[operator];
  }

  function relationKey(relation) { return `${expressionKey(relation.left)}${relation.operator}${expressionKey(relation.right)}`; }
  function reversedRelationKey(relation) { return `${expressionKey(relation.right)}${reverseOperator(relation.operator)}${expressionKey(relation.left)}`; }

  return Object.freeze({ numberNode, parseSymbolicExpression, parseSymbolicRelation, expressionText, expressionKey, simplifyExpr, expressionSymbols, relationText, relationKey, reversedRelationKey, reverseOperator, negateRelationOperator });
});
