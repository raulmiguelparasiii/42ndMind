from pathlib import Path

p = Path('one-mind.js')
s = p.read_text()


def replace_once(old, new, label):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    s = s.replace(old, new, 1)


old_grounded = r'''function groundedCompletion(state, frame) {
  if (state.experiences.length < 4 || !state.structure.patterns.length) return null;
  const present = presentFeatures(state, frame);
  const purpose = { ...present.values };
  let open = 0;
  for (let i = 0; i < state.concern_count; i++) {
    if (present.contact.concern[i] > 0) { purpose[`relation_c${i}_order`] = LESS; open++; }
  }
  if (!open) return null;

  const completed = { ...purpose };
  for (let pass = 0; pass < 4; pass++) {
    const prediction = predict(state.structure, completed);
    let changed = false;
    for (const [target, relation] of Object.entries(prediction.best_by_target)) {
      if (Object.prototype.hasOwnProperty.call(completed, target)) continue;
      const rival = prediction.active.find(other =>
        other.target === target && !same(other.expected, relation.expected) &&
        Math.abs(other.predictive_code_bits - relation.predictive_code_bits) < 1e-9
      );
      if (rival) continue;
      completed[target] = relation.expected;
      changed = true;
    }
    if (!changed) break;
  }
  const action = completed.action;
  if (!Number.isInteger(action) || action < 0 || action >= state.action_count) return null;

  const consequences = predict(state.structure, { ...present.values, action }).best_by_target;
  for (let i = 0; i < state.concern_count; i++) {
    const evidence = consequences[`relation_c${i}_order`];
    if (evidence && evidence.expected === GREATER) return null;
  }
  return action;
}
'''

new_grounded = r'''function groundedContinuation(state, frame) {
  if (state.experiences.length < 4 || !state.structure.patterns.length) return null;
  const present = presentFeatures(state, frame);
  const purpose = { ...present.values };
  let open = 0;
  for (let i = 0; i < state.concern_count; i++) {
    if (present.contact.concern[i] > 0) { purpose[`relation_c${i}_order`] = LESS; open++; }
  }
  if (!open) return null;

  // Purpose is an open relation, not an observation. Complete it through the
  // same learned relational substrate without reclassifying the intended term
  // as factual contact.
  const completed = { ...purpose };
  const inferred = new Set();
  for (let pass = 0; pass < 4; pass++) {
    const prediction = predict(state.structure, completed);
    let changed = false;
    for (const [target, relation] of Object.entries(prediction.best_by_target)) {
      if (Object.prototype.hasOwnProperty.call(completed, target)) continue;
      const rival = prediction.active.find(other =>
        other.target === target && !same(other.expected, relation.expected) &&
        Math.abs(other.predictive_code_bits - relation.predictive_code_bits) < 1e-9
      );
      if (rival) continue;
      completed[target] = relation.expected;
      inferred.add(target);
      changed = true;
    }
    if (!changed) break;
  }
  const action = completed.action;
  if (!Number.isInteger(action) || action < 0 || action >= state.action_count) return null;

  const consequences = predict(state.structure, { ...present.values, action }).best_by_target;
  for (let i = 0; i < state.concern_count; i++) {
    const evidence = consequences[`relation_c${i}_order`];
    if (evidence && evidence.expected === GREATER) return null;
  }
  return {
    seed: purpose,
    completed,
    inferred: [...inferred].sort(),
    unresolved: [],
    action,
  };
}
'''
replace_once(old_grounded, new_grounded, 'grounded continuation')

old_motor = r'''    state.contacts.push(frame.slice());
    state.previous_contact = frame;
    state.current = completeCurrent(state, frame);
    const completion = groundedCompletion(state, frame);
    state.motor = completion == null ? spontaneousMotor(state) : completion;
'''

new_motor = r'''    state.contacts.push(frame.slice());
    state.previous_contact = frame;
    state.current = completeCurrent(state, frame);
    const continuation = groundedContinuation(state, frame);
    if (continuation) {
      state.current.continuation = {
        grounded: true,
        seed: continuation.seed,
        completed: continuation.completed,
        inferred: continuation.inferred,
        unresolved: continuation.unresolved,
      };
      state.motor = continuation.action;
    } else {
      state.motor = spontaneousMotor(state);
      state.current.continuation = {
        grounded: false,
        seed: null,
        completed: { action: state.motor },
        inferred: [],
        unresolved: [],
        source: 'physical_variation',
      };
    }
'''
replace_once(old_motor, new_motor, 'C outward continuation source')

p.write_text(s)
