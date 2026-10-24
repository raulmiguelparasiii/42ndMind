'use strict';

// Zero-state provenance bridge for sourced surface contact.
//
// Raw surface induction may propose a world relation from a sentence form it has
// learned. When that sentence came from an explicitly identified source, the
// occurrence is testimony: preserve the proposed content as an ordinary M-owned
// claim occurrence and reopen any world-fact route born from this same sourced
// episode. Source identity carries no fixed reliability or truth weight here.

const SurfaceStructure = require('./surface-structure-grounding.js');

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function same(a, b) { return stable(a) === stable(b); }
function ref(id) { return { ref: String(id) }; }

function sourceFrom(contact) {
  if (!contact || typeof contact !== 'object') return undefined;
  if (contact.surface && contact.surface.source !== undefined && contact.surface.source !== null)
    return contact.surface.source;
  if (contact.source !== undefined && contact.source !== null) return contact.source;
  return undefined;
}

function relationalUpdate(state, originalContact) {
  const source = sourceFrom(originalContact);
  if (source === undefined) return null;
  const episode = SurfaceStructure.latestSurfaceEpisode(state);
  if (!episode) return null;

  const proposals = SurfaceStructure.proposalsForEpisode(state, episode.id)
    .map(row => row.triple)
    .sort((a, b) => stable(a).localeCompare(stable(b)));
  if (!proposals.length) return null;

  // Rules are current cognitive structure rather than lifetime occurrence history;
  // scanning them does not recreate the book/life fact stream.
  const activeSurfaceRoutes = (state.knowledge?.rules || []).filter(rule =>
    rule.active !== false && rule.provenance?.kind === 'surface_induction');
  const supportedHere = new Set(SurfaceStructure.supportsForEpisode(state, episode.id));

  const facts = [];
  for (let i = 0; i < proposals.length; i++) {
    const triple = proposals[i];
    const claimId = `sourced-claim:${episode.id}:${i + 1}`;
    facts.push(
      [claimId, 'ρ:kind', 'sourced_claim_occurrence'],
      [claimId, 'ρ:epistemic_status', 'claim_with_provenance'],
      [claimId, 'ρ:claim_subject', triple.subject],
      [claimId, 'ρ:claim_relation', triple.relation],
      [claimId, 'ρ:claim_object', triple.object],
      [claimId, 'ρ:claimed_by', source],
      [claimId, 'ρ:source_episode', ref(episode.id)],
      [claimId, 'ρ:source_surface', episode.input_raw],
      [episode.id, 'ρ:expressed_claim', ref(claimId)],
      ['self', 'ρ:encountered_claim', ref(claimId)],
    );

    // Only reopen a route whose own M support says this exact sourced episode
    // helped birth it. Do not defeat an independently existing route merely
    // because a book later repeats the same content.
    for (const rule of activeSurfaceRoutes) {
      if (!supportedHere.has(String(rule.id))) continue;
      if (!same(rule.provenance?.subject, triple.subject) ||
          !same(rule.provenance?.relation, triple.relation) ||
          !same(rule.provenance?.object, triple.object)) continue;
      facts.push([ref(rule.id), 'counterexample', {
        kind: 'sourced_testimony_not_direct_actuality',
        source,
        source_episode: episode.id,
      }]);
    }
  }

  return facts.length ? { relations: { facts } } : null;
}

module.exports = { relationalUpdate };
