'use strict';

// Zero-state provenance bridge for sourced surface contact.
//
// Raw surface induction may propose a world relation from a sentence form it has
// learned. When that sentence came from an explicitly identified source, the
// occurrence is testimony: preserve the proposed content as an ordinary M-owned
// claim occurrence and reopen any world-fact route born from this same sourced
// episode. Source identity carries no fixed reliability or truth weight here.

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function same(a, b) { return stable(a) === stable(b); }
function ref(id) { return { ref: String(id) }; }
function episodeNumber(id) {
  const n = Number(String(id).split(':').at(-1));
  return Number.isFinite(n) ? n : -1;
}

function sourceFrom(contact) {
  if (!contact || typeof contact !== 'object') return undefined;
  if (contact.surface && contact.surface.source !== undefined && contact.surface.source !== null)
    return contact.surface.source;
  if (contact.source !== undefined && contact.source !== null) return contact.source;
  return undefined;
}

function latestSurfaceEpisode(state) {
  let best = null;
  for (const fact of state.knowledge?.facts || []) {
    if (fact.relation !== 'ρ:input_raw' || typeof fact.subject !== 'string' ||
        !fact.subject.startsWith('sequence-contact:')) continue;
    if (!best || episodeNumber(fact.subject) > episodeNumber(best.id))
      best = { id: fact.subject, raw: fact.object };
  }
  return best;
}

function relationalUpdate(state, originalContact) {
  const source = sourceFrom(originalContact);
  if (source === undefined) return null;
  const episode = latestSurfaceEpisode(state);
  if (!episode) return null;

  const allFacts = state.knowledge?.facts || [];
  const proposals = allFacts.filter(f =>
    f.subject === episode.id && f.relation === 'ρ:proposes_relation' && f.object && typeof f.object === 'object' &&
    Object.prototype.hasOwnProperty.call(f.object, 'subject') &&
    Object.prototype.hasOwnProperty.call(f.object, 'relation') &&
    Object.prototype.hasOwnProperty.call(f.object, 'object'));
  if (!proposals.length) return null;

  const activeSurfaceRoutes = (state.knowledge?.rules || []).filter(rule =>
    rule.active !== false && rule.provenance?.kind === 'surface_induction');
  const supportedHere = new Set(allFacts
    .filter(f => f.subject === episode.id && f.relation === 'ρ:supports' && f.object?.ref !== undefined)
    .map(f => String(f.object.ref)));

  const facts = [];
  const ordered = proposals.slice().sort((a, b) => stable(a.object).localeCompare(stable(b.object)));
  for (let i = 0; i < ordered.length; i++) {
    const triple = ordered[i].object;
    const claimId = `sourced-claim:${episode.id}:${i + 1}`;
    const already = allFacts.some(f => f.subject === claimId && f.relation === 'ρ:kind' && f.object === 'sourced_claim_occurrence');
    if (!already) facts.push(
      [claimId, 'ρ:kind', 'sourced_claim_occurrence'],
      [claimId, 'ρ:epistemic_status', 'claim_with_provenance'],
      [claimId, 'ρ:claim_subject', triple.subject],
      [claimId, 'ρ:claim_relation', triple.relation],
      [claimId, 'ρ:claim_object', triple.object],
      [claimId, 'ρ:claimed_by', source],
      [claimId, 'ρ:source_episode', ref(episode.id)],
      [claimId, 'ρ:source_surface', episode.raw],
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
