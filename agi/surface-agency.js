'use strict';

// Speaker/addressee are physical/social facts of a surface contact, not language
// semantics. This helper owns no state and assigns no meaning to pronouns. It only
// attaches the actually supplied source/target identities to the already-retained
// sequence contact in canonical M, so later recurrence can discover deixis.

const Relational = require('./mind-relational.js');

function episodeNumber(id) {
  const n = Number(String(id).split(':').at(-1));
  return Number.isFinite(n) ? n : -1;
}
function latestSequenceId(state) {
  let best = null, bestN = -1;
  for (const f of state.knowledge?.facts || []) {
    if (f.relation !== 'ρ:input_raw') continue;
    if (typeof f.subject !== 'string' || !f.subject.startsWith('sequence-contact:')) continue;
    const n = episodeNumber(f.subject);
    if (n > bestN) { bestN = n; best = f.subject; }
  }
  return best;
}
function record(state, contact) {
  const surface = contact?.surface;
  if (!surface || typeof surface !== 'object') return false;
  const id = latestSequenceId(state);
  if (!id) return false;
  const facts = [];
  if (surface.source !== undefined && surface.source !== null && String(surface.source).length)
    facts.push([id, 'ρ:surface_source', String(surface.source)]);
  if (surface.target !== undefined && surface.target !== null && String(surface.target).length)
    facts.push([id, 'ρ:surface_target', String(surface.target)]);
  if (!facts.length) return false;
  Relational.C(state, { relations: { facts } });
  return true;
}

module.exports = { record };
