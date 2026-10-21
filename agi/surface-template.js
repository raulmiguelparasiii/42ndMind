'use strict';

// Pure zero-state ordered-surface structure helpers. These functions own no
// memory, meaning, or truth.

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function same(a, b) { return stable(a) === stable(b); }
function unique(xs) { const out = new Map(); for (const x of xs || []) out.set(stable(x), x); return [...out.values()]; }

// Mechanical structural atoms only. Exact raw tokens remain stored in M. This
// prevents connector-bound lexical material such as a_b or a-b from being split
// into misleading LCS anchors during structural induction.
function compactTokens(tokens) {
  if (!Array.isArray(tokens)) return [];
  const connectors = new Set(['_', '-', '/', '\\']);
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = String(tokens[i]);
    if (connectors.has(token) && out.length && i + 1 < tokens.length) {
      out[out.length - 1] = String(out[out.length - 1]) + token + String(tokens[++i]);
    } else out.push(tokens[i]);
  }
  return out;
}

function lcs(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = same(a[i], b[j]) ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (same(a[i], b[j])) { out.push(a[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return out;
}
function commonAnchors(outputs) {
  if (!outputs.length) return [];
  let anchors = outputs[0].slice();
  for (let i = 1; i < outputs.length && anchors.length; i++) anchors = lcs(anchors, outputs[i]);
  return anchors;
}
function splitByAnchors(tokens, anchors) {
  const spans = [];
  let cursor = 0;
  for (const anchor of anchors) {
    let at = cursor;
    while (at < tokens.length && !same(tokens[at], anchor)) at++;
    if (at >= tokens.length) return null;
    spans.push(tokens.slice(cursor, at));
    cursor = at + 1;
  }
  spans.push(tokens.slice(cursor));
  return spans;
}
function buildTemplate(outputTokenLists) {
  const outputs = (outputTokenLists || []).filter(Array.isArray).map(x => x.slice());
  if (!outputs.length) return null;
  const anchors = commonAnchors(outputs);
  const splits = outputs.map(x => splitByAnchors(x, anchors));
  if (splits.some(x => !x)) return null;
  const template = [];
  let slot = 0;
  for (let region = 0; region <= anchors.length; region++) {
    const spans = splits.map(x => x[region]);
    const variants = unique(spans);
    if (variants.length === 1) for (const token of variants[0]) template.push({ constant: token });
    else template.push({ variable_slot: slot++ });
    if (region < anchors.length) template.push({ constant: anchors[region] });
  }
  return template;
}
function matchTemplate(tokens, template) {
  if (!Array.isArray(tokens) || !Array.isArray(template)) return null;
  const memo = new Map();
  function rec(pi, ti) {
    const key = `${pi}:${ti}`;
    if (memo.has(key)) return memo.get(key);
    if (pi === template.length) {
      const result = ti === tokens.length ? new Map() : null;
      memo.set(key, result); return result;
    }
    const part = template[pi];
    if (Object.prototype.hasOwnProperty.call(part, 'constant')) {
      if (ti >= tokens.length || !same(tokens[ti], part.constant)) { memo.set(key, null); return null; }
      const rest = rec(pi + 1, ti + 1); memo.set(key, rest); return rest;
    }
    if (!Object.prototype.hasOwnProperty.call(part, 'variable_slot')) { memo.set(key, null); return null; }
    for (let end = ti; end <= tokens.length; end++) {
      const rest = rec(pi + 1, end);
      if (!rest) continue;
      const result = new Map(rest);
      result.set(part.variable_slot, tokens.slice(ti, end));
      memo.set(key, result); return result;
    }
    memo.set(key, null); return null;
  }
  return rec(0, 0);
}
function inferOutputRoles(episodes, template) {
  if (!Array.isArray(template)) return [];
  const slots = unique(template.filter(x => Object.prototype.hasOwnProperty.call(x, 'variable_slot')).map(x => x.variable_slot));
  if (!slots.length) return [];
  const parsed = [];
  for (const e of episodes || []) {
    if (!Array.isArray(e.output_tokens)) continue;
    const spans = matchTemplate(e.output_tokens, template);
    if (spans) parsed.push({ e, spans });
  }
  const channelIndexes = unique(parsed.flatMap(({ e }) => [...e.channels.keys()]));
  const roles = [];
  for (const slot of slots) {
    const candidates = [];
    for (const channel of channelIndexes) {
      const mapping = new Map();
      let observations = 0, conflict = false;
      for (const { e, spans } of parsed) {
        if (!e.channels.has(channel) || !spans.has(slot)) continue;
        observations++;
        const key = stable(e.channels.get(channel));
        const phrase = spans.get(slot);
        if (mapping.has(key) && !same(mapping.get(key), phrase)) { conflict = true; break; }
        mapping.set(key, phrase);
      }
      if (conflict || observations < 2 || mapping.size < 2) continue;
      candidates.push({ slot, channel, observations, distinct_values: mapping.size, reuse: observations / mapping.size });
    }
    candidates.sort((a, b) => b.reuse - a.reuse || b.observations - a.observations || a.channel - b.channel);
    if (candidates.length) roles.push(candidates[0]);
  }
  return roles;
}
function phraseForChannelValue(episodes, template, channel, value, slot) {
  const phrases = [];
  for (const e of episodes || []) {
    if (!e.channels.has(channel) || !same(e.channels.get(channel), value) || !Array.isArray(e.output_tokens)) continue;
    const spans = matchTemplate(e.output_tokens, template);
    if (!spans || !spans.has(slot)) continue;
    phrases.push(spans.get(slot));
  }
  const variants = unique(phrases);
  return variants.length === 1 && phrases.length ? variants[0] : undefined;
}

// resolvePhrase is an optional zero-state callback. It lets a caller reuse an
// expression attachment that is already owned by M when the learned output form
// has never emitted a particular value before. The helper itself owns no lexicon.
function fillTemplate(template, neighbors, historical, channels, roles, resolvePhrase) {
  if (!Array.isArray(template)) return { tokens: null, unresolved: ['template'] };
  const roleBySlot = new Map((roles || []).map(r => [r.slot, r]));
  const tokens = [], unresolved = [];
  for (const part of template) {
    if (Object.prototype.hasOwnProperty.call(part, 'constant')) { tokens.push(part.constant); continue; }
    const slot = part.variable_slot;
    let phrase;
    const role = roleBySlot.get(slot);
    if (role && channels.has(role.channel)) {
      const value = channels.get(role.channel);
      phrase = phraseForChannelValue(neighbors, template, role.channel, value, slot);
      if (phrase === undefined) phrase = phraseForChannelValue(historical, template, role.channel, value, slot);
      if (phrase === undefined && typeof resolvePhrase === 'function') phrase = resolvePhrase(role.channel, value, slot);
    }
    if (phrase === undefined) {
      const candidates = [];
      for (const [channel, value] of channels) {
        let p = phraseForChannelValue(neighbors, template, channel, value, slot);
        if (p === undefined) p = phraseForChannelValue(historical, template, channel, value, slot);
        if (p === undefined && typeof resolvePhrase === 'function') p = resolvePhrase(channel, value, slot);
        if (p !== undefined) candidates.push(p);
      }
      const variants = unique(candidates);
      if (variants.length === 1) phrase = variants[0];
    }
    if (phrase === undefined) unresolved.push(slot); else tokens.push(...phrase);
  }
  return { tokens: unresolved.length ? null : tokens, unresolved };
}
function renderTokens(tokens) {
  if (!tokens) return null;
  let out = '';
  const tightBoth = new Set(['_', '-', '/', '\\']);
  const tightLeft = new Set(['?', '.', ',', '!', ';', ':', ')', ']', '}']);
  const tightRight = new Set(['(', '[', '{']);
  for (let i = 0; i < tokens.length; i++) {
    const token = String(tokens[i]);
    const prev = i ? String(tokens[i - 1]) : null;
    const needsSpace = i > 0 && !tightLeft.has(token) && !tightBoth.has(token) && !tightRight.has(prev) && !tightBoth.has(prev);
    out += (needsSpace ? ' ' : '') + token;
  }
  return out;
}

module.exports = { compactTokens, buildTemplate, matchTemplate, inferOutputRoles, phraseForChannelValue, fillTemplate, renderTokens };
