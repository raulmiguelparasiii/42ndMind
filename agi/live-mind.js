'use strict';

// Public live composition while the developmental dialogue bridge is exercised.
// There is still exactly one persistent M. Helpers own no cognitive state: actual
// speaker/addressee facts enter canonical M, raw social assertions may become
// sourced claims in that same M, conflicting inductions are stabilized by their
// support in M, and expression is a disposable readout afterward.
const Mind = require('./mind.js');
const Relational = require('./mind-relational.js');
const SurfaceDialogue = require('./surface-dialogue.js');
const SurfaceAgency = require('./surface-agency.js');
const SurfaceSocial = require('./surface-social-grounding.js');
const ClaimStability = require('./claim-stability.js');
const TurnCompletion = require('./surface-turn-completion.js');

function one(actionCount, concernCount = 1) { return Mind.one(actionCount, concernCount); }
function C(state, contact) {
  Mind.C(state, contact);
  SurfaceAgency.record(state, contact);
  const social = SurfaceSocial.relationalUpdate(state, contact);
  if (social) Relational.C(state, social);
  const stabilized = ClaimStability.relationalUpdate(state);
  if (stabilized) Relational.C(state, stabilized);
  if (!SurfaceDialogue.respond(state, contact)) TurnCompletion.respond(state, contact);
  return state;
}

module.exports = { one, C };
