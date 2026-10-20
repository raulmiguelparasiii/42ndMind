'use strict';

// Experimental blueprint-conformance wrapper around canonical one-mind.js.
// It owns NO independent cognitive state. The returned object is canonical M.
// The exported C is one developmental entrypoint: canonical C followed by one
// generic settling rule that canonical C currently omits from its MDL search:
// an explicitly present-but-unobserved channel may be completed when every
// sufficiently repeated lived observation of that same channel has one value.
// This is content-neutral (zero-entropy relational completion), not language
// knowledge. It exists here as a bounded falsification-driven extension before
// any canonical merge.

const Base = require('../one-mind.js');

function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function invariantValueAt(state, perceptIndex, minSupport = 4) {
  const values = [];
  for (const frame of state.contacts || []) {
    const cut = frame.length - state.concern_count;
    if (perceptIndex >= cut) continue;
    const value = frame[perceptIndex];
    if (value === null || value === undefined) continue;
    values.push(value);
  }
  if (values.length < minSupport) return { complete: false };
  const first = stable(values[0]);
  if (!values.every(v => stable(v) === first)) return { complete: false };
  return { complete: true, value: values[0], support: values.length };
}

function settleInvariantChannels(state, frame) {
  if (!frame || !state.current) return;
  const cut = frame.length - state.concern_count;
  const inferred = new Set(state.current.inferred || []);
  const completions = [];
  for (let i = 0; i < cut; i++) {
    if (frame[i] !== null) continue; // explicitly observed values remain authority.
    const feature = `p${i}`;
    if (Object.prototype.hasOwnProperty.call(state.current.completed, feature)) continue;
    const invariant = invariantValueAt(state, i);
    if (!invariant.complete) continue;
    state.current.completed[feature] = invariant.value;
    inferred.add(feature);
    completions.push({ feature, value: invariant.value, support: invariant.support, kind: 'zero_entropy_invariant' });
  }
  state.current.inferred = [...inferred].sort();
  state.current.invariant_completions = completions;
}

function one(actionCount, concernCount = 1) {
  return Base.one(actionCount, concernCount);
}

function C(state, realityContact) {
  Base.C(state, realityContact);
  let frame = null;
  if (Array.isArray(realityContact)) frame = realityContact;
  else if (realityContact && Array.isArray(realityContact.frame)) frame = realityContact.frame;
  if (frame) settleInvariantChannels(state, frame);
  return state;
}

module.exports = { one, C };
