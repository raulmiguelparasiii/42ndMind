'use strict';

// Public live composition while developmental dialogue is exercised.
// There is exactly one persistent M. The affected relational field and the
// whole-being constraint returned by step() are disposable reads over canonical
// M after this top-level contact has settled; neither is written into M or owns
// cognitive authority.

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
  // the judgment. The field is then derived from canonical M plus exactly the
  // relation episodes created during this top-level contact.
  const query = SurfaceQuery.interpret(state, contact);
  const episodeEnd = state.knowledge?.episodes?.length || episodeStart;
  const field = AffectedField.derive(state, { episodeStart, episodeEnd, query });

  // B(M)=1 is recomputed from the same M and this same live field on every step.
  // A deviation never becomes a second state or a priority score: it remains an
  // unresolved residual of this one being until the underlying M relation or
  // embodied concern is actually settled.
  const being = WholeBeing.derive(state, field);
  if (being.whole !== 1 || field.whole !== 1) throw new Error('live settlement left the one-whole invariant');

  // Transitional expression transport. Existing renderers still operate after
  // the current field has been determined. They may fail to express a warranted
  // relation; such failure does not change the field, the being constraint, or
  // canonical M.
  if (!SurfaceDialogue.respond(state, contact)) TurnCompletion.respond(state, contact);

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
