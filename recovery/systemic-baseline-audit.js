'use strict';

// Observational falsification of the frozen 2026-11-01 canonical runtime.
// This is an external diagnostic, never a cognitive authority.
// It deliberately preserves failures rather than repairing them in a toy world.
function audit(Mind) {
  const {one, C} = Mind;
  const clone = m => JSON.parse(JSON.stringify(m));
  const biases = m => m.motors.map(i => m.nodes[i].bias);
  const motorEdges = m => m.edges.filter(e => m.motors.includes(e.b))
    .map(e => [e.a, e.b, e.w, e.elig]);
  const receptors = m => m.receptors.map(i => m.nodes[i].s);
  const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);

  // Same initial individual, same past; one actual pressure changes in each
  // direction. Compare against unchanged pressure, at equal aggregate norm.
  const origin = one(2,16);
  C(origin,{sense:[0.25],pressure:[1,0]});
  const changed = clone(origin), unchanged = clone(origin);
  C(changed,{sense:[0.25],pressure:[0,1]});
  C(unchanged,{sense:[0.25],pressure:[1,0]});
  const consequenceCollision = {
    before: [1,0],
    changed: [0,1],
    unchanged: [1,0],
    distinctReceptorStates: !equal(receptors(changed),receptors(unchanged)),
    changedNeed: changed.need,
    unchangedNeed: unchanged.need,
    changedRelief: changed.relief,
    unchangedRelief: unchanged.relief,
    sameMotorBiasUpdate: equal(biases(changed),biases(unchanged)),
    sameIncomingMotorEdges: equal(motorEdges(changed),motorEdges(unchanged))
  };
  // A shorter sensory frame is not an observation of zero in its missing
  // channel. In the current runtime, pressure channels also shift left.
  const partial = one(2,16), explicit = one(2,16);
  C(partial,{sense:[0.25,0.75],pressure:[0]});
  C(explicit,{sense:[0.25,0.75],pressure:[0]});
  C(partial,{sense:[0.25],pressure:[0]});
  C(explicit,{sense:[0.25,0],pressure:[0]});
  const missingContact = {
    partialReceptors: receptors(partial),
    explicitZeroReceptors: receptors(explicit),
    identicalWholeState: equal(partial,explicit)
  };
  return {consequenceCollision,missingContact};
}

if (typeof require !== 'undefined' && require.main === module) {
  const result = audit(require('../one-mind.js'));
  console.log(JSON.stringify(result,null,2));
}
module.exports = audit;
