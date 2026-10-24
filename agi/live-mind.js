'use strict';

// Public live composition while developmental dialogue is exercised.
// There is exactly one persistent M. The affected relational field returned by
// step() is a disposable read over canonical M after this top-level contact has
// settled; it is never written into M and owns no cognitive authority.

const Mind = require('./mind.js');
const Relational = require('./mind-relational.js');
const SurfaceDialogue = require('./surface-dialogue.js');
const SurfaceAgency = require('./surface-agency.js');
const SurfaceSocial = require('./surface-social-grounding.js');
const ClaimStability = require('./claim-stability.js');
const TurnCompletion = require('./surface-turn-completion.js');
const SurfaceQuery = require('./surface-query.js');
const AffectedField = require('./affected-relational-field.js');

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

  // Expression is downstream of the already-derived live relation when the
  // individual has learned that this surface contact is asking for one. A mere
  // referential cue can make a relation live without licensing an utterance; this
  // prevents novel forms from being answered by blindly restating the cue.
  if (!SurfaceDialogue.respond(state, contact, query ? field : null)) TurnCompletion.respond(state, contact);

  return {
    state,
    query,
    field,
    expression: state.current?.sequence?.expression ?? null,
  };
}

function C(state, contact) {
  step(state, contact);
  return state;
}

module.exports = { one, C, step };
