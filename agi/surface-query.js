'use strict';

// Learned surface interpretation only. This bridge may identify an open
// relational cue from lived dialogue structure, but it does not retrieve an
// answer, render a response, add truth, or own current cognition.

const Dialogue = require('./surface-dialogue.js');

function interpret(state, contact) {
  if (!contact || typeof contact !== 'object' || !contact.surface) return null;
  if (contact.surface.output !== undefined && contact.surface.output !== null) return null;
  const seq = state.current?.sequence;
  if (!seq || !Array.isArray(seq.input_tokens)) return null;
  const es = Dialogue.episodes(state);
  if (es.length < 2) return null;
  const resolved = Dialogue.resolveQuestion(state, es, seq);
  if (!resolved) return null;
  return {
    subject: resolved.subject,
    relation: resolved.relation,
    authority: 'learned_surface_cue_only',
  };
}

module.exports = { interpret };
