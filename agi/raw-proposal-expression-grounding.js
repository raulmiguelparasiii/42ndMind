'use strict';

// Zero-state surface bridge after the canonical raw surface learner runs.
// Exact proposal endpoint expressions remain ordinary M facts. Separately, a raw
// construction may align with a uniquely known current M fact across diverse
// examples; that structure may later propose a new binding through the same
// surface_induction route anatomy. Neither path owns truth, grammar state, memory,
// or a semantic dictionary.

const Surface = require('./surface-template.js');
const SurfaceStructure = require('./surface-structure-grounding.js');

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function unique(xs) { const m = new Map(); for (const x of xs || []) m.set(stable(x), x); return [...m.values()]; }

function exactSpan(tokens, value) {
  if (!Array.isArray(tokens) || !['string', 'number', 'boolean'].includes(typeof value)) return undefined;
  const compact = Surface.compactTokens(tokens);
  const target = String(value);
  const hits = [];
  for (let start = 0; start < compact.length; start++) {
    for (let end = start + 1; end <= compact.length; end++) {
      const span = compact.slice(start, end);
      if (Surface.renderTokens(span) === target) hits.push(span);
    }
  }
  const variants = unique(hits);
  return variants.length === 1 ? variants[0] : undefined;
}

function structuralProposals(update, episodeId) {
  return (update?.relations?.facts || [])
    .filter(f => Array.isArray(f) && f.length === 3 && String(f[0]) === String(episodeId) &&
      f[1] === 'ρ:proposes_relation' && f[2] && typeof f[2] === 'object' &&
      Object.prototype.hasOwnProperty.call(f[2], 'subject') &&
      Object.prototype.hasOwnProperty.call(f[2], 'relation') &&
      Object.prototype.hasOwnProperty.call(f[2], 'object'))
    .map(f => ({ episode: String(f[0]), triple: f[2] }));
}

function relationalUpdate(state) {
  const structural = SurfaceStructure.relationalUpdate(state);
  const episode = SurfaceStructure.latestSurfaceEpisode(state);
  const facts = [...(structural?.relations?.facts || [])];
  const rules = [...(structural?.relations?.rules || [])];
  if (!episode) return facts.length || rules.length ? { relations: { facts, rules } } : null;

  // Existing proposals are retrieved from the append-synchronized zero-authority
  // projection. Proposals created by the structural update in this same call are
  // included directly because they have not entered canonical M yet.
  const proposals = unique([
    ...SurfaceStructure.proposalsForEpisode(state, episode.id),
    ...structuralProposals(structural, episode.id),
  ].map(row => row.triple));

  for (const proposal of proposals) {
    for (const [role, value] of [['subject', proposal.subject], ['object', proposal.object]]) {
      const tokens = exactSpan(episode.input_tokens, value);
      if (!tokens || SurfaceStructure.hasExpressionAttachment(state, value, episode.id, tokens)) continue;
      facts.push([value, 'ρ:surface_expression', {
        tokens,
        source_episode: episode.id,
        source_role: role,
        source: 'raw_surface_proposal_endpoint',
        exact_contact: true,
        semantic_authority: 'none',
      }]);
    }
  }
  if (!facts.length && !rules.length) return null;
  return { relations: { facts, ...(rules.length ? { rules } : {}) } };
}

module.exports = { relationalUpdate };
