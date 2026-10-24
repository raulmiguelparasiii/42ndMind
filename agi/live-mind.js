'use strict';

// Transitional public composition while the lived-dialogue bridge is exercised.
// There is still exactly one persistent M. SurfaceDialogue owns no state and only
// derives expression from canonical M after the existing C has settled contact.
const Mind = require('./mind.js');
const SurfaceDialogue = require('./surface-dialogue.js');

function one(actionCount, concernCount = 1) { return Mind.one(actionCount, concernCount); }
function C(state, contact) {
  Mind.C(state, contact);
  SurfaceDialogue.respond(state, contact);
  return state;
}

module.exports = { one, C };
