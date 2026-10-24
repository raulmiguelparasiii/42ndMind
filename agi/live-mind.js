'use strict';

// Transitional public composition while the lived-dialogue bridge is exercised.
// There is still exactly one persistent M. The helpers own no state: dialogue is
// read from canonical M and source/target facts are written back into that same M.
const Mind = require('./mind.js');
const SurfaceDialogue = require('./surface-dialogue.js');
const SurfaceAgency = require('./surface-agency.js');

function one(actionCount, concernCount = 1) { return Mind.one(actionCount, concernCount); }
function C(state, contact) {
  Mind.C(state, contact);
  SurfaceDialogue.respond(state, contact);
  SurfaceAgency.record(state, contact);
  return state;
}

module.exports = { one, C };
