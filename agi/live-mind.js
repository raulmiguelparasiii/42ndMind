'use strict';

// Public live composition while developmental dialogue is exercised.
// There is exactly one persistent M. The affected relational field and the
// whole-being constraint returned by step() are disposable reads over canonical
// M after this top-level contact has settled; neither is a second cognitive
// state or authority. Unresolved whole constraints themselves are ordinary M
// formations, so they can survive unrelated contact without a workspace.

const Mind = require('./mind.js');
const Relational = require('./mind-relational.js');
const SurfaceDialogue = require('./surface-dialogue.js');
const SurfaceAgency = require('./surface-agency.js');
const SurfaceSocial = require('./surface-social-grounding.js');
const ClaimStability = require('./claim-stability.js');
const TurnCompletion = require('./surface-turn-completion.js');
const SurfaceQuery = require('./surface-query.js');
const AffectedField = require('./affected-relational-field.js');
const WholeBeing = require('./whole-being.js');

function one(actionCount, concernCount = 1) { return Mind.one(actionCount, concernCount); }

function liveField(state, episodeStart, episodeEnd) {
  // Live participation comes from reality contact, grounded reference, actual
  // dependency, and unfinished consequence. Parser-derived query guesses are not
  // allowed to decide what becomes causally live. SurfaceQuery is retained only
  // as a diagnostic view while the transitional language path still exists.
  return AffectedField.derive(state, { episodeStart, episodeEnd });
}

function settleWhole(state, episodeStart, episodeEnd, field, maxPasses = 8) {
  let end = episodeEnd;
  let currentField = field;
  let being = WholeBeing.derive(state, currentField);

  for (let pass = 0; pass < maxPasses; pass++) {
    const pressure = WholeBeing.relationalUpdate(state, being);
    if (!pressure) break;

    const before = state.knowledge?.facts?.length || 0;
    Relational.C(state, { relations: pressure });
    const after = state.knowledge?.facts?.length || 0;
    end = state.knowledge?.episodes?.length || end;
    currentField = liveField(state, episodeStart, end);
    being = WholeBeing.derive(state, currentField);

    // relationalUpdate emits only canonical novelty. This is merely a defensive
    // bound against malformed future helpers; it is not a convergence evaluator.
    if (after === before) break;
  }

  return { field: currentField, being, episodeEnd: end };
}

function step(state, contact) {
  const episodeStart = state.knowledge?.episodes?.length || 0;

  // Reality enters the one canonical C first. That C now retains the contact as
  // a situated lived occurrence before temporal continuation, so live dialogue
  // does not own a second event model or a later attention/salience patch.
  Mind.C(state, contact);
  SurfaceAgency.record(state, contact);
  const social = SurfaceSocial.relationalUpdate(state, contact);
  if (social) Relational.C(state, social);
  const stabilized = ClaimStability.relationalUpdate(state);
  if (stabilized) Relational.C(state, stabilized);

  // Keep the old parser interpretation visible for diagnosis only. It no longer
  // roots the live relational state.
  const query = SurfaceQuery.interpret(state, contact);
  let episodeEnd = state.knowledge?.episodes?.length || episodeStart;
  let field = liveField(state, episodeStart, episodeEnd);

  // Let the contact reverberate through grounded reference, dependency, and the
  // whole-being constraint before any expression transport is attempted. Thus a
  // heard event affects the being first; speech, when it occurs, is downstream of
  // that changed being rather than a request/response routine preceding it.
  let settled = settleWhole(state, episodeStart, episodeEnd, field);
  field = settled.field;
  let being = settled.being;
  episodeEnd = settled.episodeEnd;

  // Transitional language transport. It still does not own semantic authority.
  // Any completion it produces is read back through B(M)=1 below so same-turn
  // resolution becomes part of the same canonical life instead of disappearing.
  if (!SurfaceDialogue.respond(state, contact)) TurnCompletion.respond(state, contact);

  settled = settleWhole(state, episodeStart, episodeEnd, field);
  field = settled.field;
  being = settled.being;

  if (being.whole !== 1 || field.whole !== 1) throw new Error('live settlement left the one-whole invariant');

  return {
    state,
    query,
    field,
    being,
    expression: state.current?.sequence?.expression ?? null,
  };
}

function C(state, contact) {
  step(state, contact);
  return state;
}

module.exports = { one, C, step };
