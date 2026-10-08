'use strict';

// Order-native form of the same developmental law:
//
//   M(t+1) = C(M(t) ⊕ R(t+1))
//
// ⊕ is not a temporal faculty: it is the already-given succession of updates.
// C seeks a shorter exact description of that ordered history. Repeated adjacent
// structure becomes a reusable symbol only when the symbol + residual stream is
// shorter than the uncompressed history. Learned symbols can themselves occur in
// later learned descriptions, so the same compression law recursively builds
// longer ordered structure. Decoding must reconstruct the exact original order.

function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function baseToken(event) {
  return `e:${stable(event)}`;
}

function nonOverlappingOccurrences(sequence, pair) {
  let count = 0;
  for (let i = 0; i < sequence.length - 1;) {
    if (sequence[i] === pair[0] && sequence[i + 1] === pair[1]) {
      count++;
      i += 2;
    } else i++;
  }
  return count;
}

function replacePair(sequence, pair, symbol) {
  const out = [];
  for (let i = 0; i < sequence.length;) {
    if (i + 1 < sequence.length && sequence[i] === pair[0] && sequence[i + 1] === pair[1]) {
      out.push(symbol);
      i += 2;
    } else {
      out.push(sequence[i]);
      i++;
    }
  }
  return out;
}

function expandToken(token, bySymbol, trail = new Set()) {
  const rule = bySymbol.get(token);
  if (!rule) return [token];
  if (trail.has(token)) throw new Error(`cyclic learned description: ${token}`);
  const next = new Set(trail); next.add(token);
  return rule.expansion.flatMap(part => expandToken(part, bySymbol, next));
}

function decodedTokens(state) {
  const bySymbol = new Map(state.rules.map(rule => [rule.symbol, rule]));
  return state.encoded_stream.flatMap(token => expandToken(token, bySymbol));
}

function decode(state) {
  return decodedTokens(state).map(token => {
    if (!token.startsWith('e:')) throw new Error(`unknown base token: ${token}`);
    return JSON.parse(token.slice(2));
  });
}

function fullExpansion(rule, rules) {
  const bySymbol = new Map(rules.map(r => [r.symbol, r]));
  return rule.expansion.flatMap(token => expandToken(token, bySymbol)).map(token => JSON.parse(token.slice(2)));
}

function descriptionLength(encodedLength, ruleCount) {
  // Unit code used by the finite proof-of-concept. Every binary rule pays three
  // units: one symbol declaration + its two right-hand-side tokens.
  return encodedLength + ruleCount * 3;
}

function bestPair(sequence, ruleCount) {
  const pairs = new Map();
  for (let i = 0; i < sequence.length - 1; i++) {
    const pair = [sequence[i], sequence[i + 1]];
    const key = stable(pair);
    if (!pairs.has(key)) pairs.set(key, pair);
  }

  let best = null;
  for (const pair of pairs.values()) {
    const occurrences = nonOverlappingOccurrences(sequence, pair);
    if (occurrences < 2) continue;
    const before = descriptionLength(sequence.length, ruleCount);
    const after = descriptionLength(sequence.length - occurrences, ruleCount + 1);
    const savings = before - after;
    if (!(savings > 0)) continue;
    const candidate = { pair, occurrences, savings };
    if (!best || candidate.savings > best.savings ||
        (candidate.savings === best.savings && candidate.occurrences > best.occurrences) ||
        (candidate.savings === best.savings && candidate.occurrences === best.occurrences && stable(candidate.pair) < stable(best.pair))) {
      best = candidate;
    }
  }
  return best;
}

function one() {
  return {
    whole: 1,
    raw_stream: [],
    encoded_stream: [],
    rules: [],
    generation: 0,
    formula: 'M(t+1)=C(M(t)⊕R(t+1)); C exactly recompresses ordered update history',
    description_length: 0,
  };
}

function recompress(prior, newExperiences, options = {}) {
  const state = prior || one();
  const incoming = Array.isArray(newExperiences) ? newExperiences : [newExperiences];
  const rawStream = [...state.raw_stream, ...incoming];
  let sequence = rawStream.map(baseToken);
  const rules = [];
  const maxRules = options.maxRules || 128;

  for (let i = 0; i < maxRules; i++) {
    const winner = bestPair(sequence, rules.length);
    if (!winner) break;
    const symbol = `§q${rules.length + 1}`;
    const bySymbol = new Map(rules.map(rule => [rule.symbol, rule]));
    const depth = 1 + winner.pair.reduce((m, token) => Math.max(m, bySymbol.get(token)?.depth || 0), 0);
    const rule = {
      symbol,
      expansion: winner.pair.slice(),
      depth,
      occurrences_at_birth: winner.occurrences,
      bits_saved_units: winner.savings,
    };
    rules.push(rule);
    sequence = replacePair(sequence, winner.pair, symbol);
  }

  const out = {
    whole: 1,
    raw_stream: rawStream,
    encoded_stream: sequence,
    rules,
    generation: state.generation + 1,
    formula: state.formula,
    description_length: descriptionLength(sequence.length, rules.length),
  };

  // Reality-preservation invariant: learned order may compress history but can
  // never rewrite it. Every recompression must decode to the exact update stream.
  if (stable(decode(out)) !== stable(rawStream)) throw new Error('ordered recompression failed exact reconstruction');
  return out;
}

function learnedExpansions(state) {
  return state.rules.map(rule => ({
    symbol: rule.symbol,
    depth: rule.depth,
    expansion: fullExpansion(rule, state.rules),
    occurrences_at_birth: rule.occurrences_at_birth,
    savings: rule.bits_saved_units,
  }));
}

module.exports = { one, recompress, decode, learnedExpansions };
