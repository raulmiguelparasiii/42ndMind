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

function step(state, contact) {
  const episodeStart = state.knowledge?.episodes?.length || 0;

  Mind.C(state, contact);
  SurfaceAgency.record(state, contact);
  const social = SurfaceSocial.relationalUpdate(state, contact);
  if (social) Relational.C(state, social);
  const stabilized = ClaimStability.relationalUpdate(state);
  if (stabilized) Relational.C(state, stabilized);

  // Surface interpretation may contribute only an open relational cue. It is
  // deliberately separated from answer lookup/rendering so language cannot own
  // the judgment. The field is derived from canonical M plus exactly the
  // relation episodes created during this top-level contact.
  const query = SurfaceQuery.interpret(state, contact);
  let episodeEnd = state.knowledge?.episodes?.length || episodeStart;
  let field = AffectedField.derive(state, { episodeStart, episodeEnd, query });

  // Transitional expression transport still runs after the current relational
  // field has been determined. Whole-being settlement is read after transport so
  // a surface position that was actually completed in this same turn is not
  // falsely preserved as an unsolved constraint.
  if (!SurfaceDialogue.respond(state, contact)) TurnCompletion.respond(state, contact);

  // B(M)=1 is recomputed from the same M and live field on every step. Current
  // unresolved subsets with a grounded relational context are then re-entered as
  // ordinary canonical M formations. This is not a drive/priority object: it is
  // the unsolved constraint itself becoming part of the same being whose next
  // settlement must remain accountable to it.
  let being = WholeBeing.derive(state, field);
  const pressure = WholeBeing.relationalUpdate(state, being);
  if (pressure) {
    Relational.C(state, pressure);
    episodeEnd = state.knowledge?.episodes?.length || episodeEnd;
    field = AffectedField.derive(state, { episodeStart, episodeEnd, query });
    being = WholeBeing.derive(state, field);
  }

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
