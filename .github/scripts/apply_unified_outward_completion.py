from pathlib import Path

p = Path('one-mind.js')
s = p.read_text()


def replace_once(old, new, label):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    s = s.replace(old, new, 1)


old_complete = r'''function completeCurrent(state, frame) {
  const present = presentFeatures(state, frame);
  let completed = { ...present.values };
  const inferred = new Set();
  const unresolved = new Set();
  const byFeature = new Map(state.structure.symbols.map(s => [s.feature, s]));

  for (let pass = 0; pass < 12; pass++) {
    let changed = false;
    const expanded = expandPartial(completed, state.structure.symbols);
    for (const [feature, value] of Object.entries(expanded)) {
      if (Object.prototype.hasOwnProperty.call(completed, feature)) continue;
      completed[feature] = value;
      inferred.add(feature);
      changed = true;
    }

    const orderedSymbols = state.structure.symbols.slice().sort((a, b) => b.depth - a.depth || a.feature.localeCompare(b.feature));
    for (const symbol of orderedSymbols) {
      if (completed[symbol.feature] !== true) continue;
      if (!symbolCompatible(symbol, true, completed, byFeature)) {
        unresolved.add(symbol.feature);
        continue;
      }
      for (const atom of symbol.definition) {
        if (Object.prototype.hasOwnProperty.call(completed, atom.feature)) continue;
        completed[atom.feature] = atom.value;
        inferred.add(atom.feature);
        changed = true;
      }
    }

    const prediction = predict(state.structure, completed);
    for (const [target, relation] of Object.entries(prediction.best_by_target)) {
      if (Object.prototype.hasOwnProperty.call(completed, target)) continue;
      const rival = prediction.active.find(other =>
        other.target === target && !same(other.expected, relation.expected) &&
        Math.abs(other.predictive_code_bits - relation.predictive_code_bits) < 1e-9
      );
      if (rival) {
        unresolved.add(target);
        continue;
      }
      const symbol = byFeature.get(target);
      if (!symbolCompatible(symbol, relation.expected, completed, byFeature)) {
        unresolved.add(target);
        continue;
      }
      completed[target] = relation.expected;
      inferred.add(target);
      changed = true;
    }
    if (!changed) break;
  }

  return {
    observed: { ...present.values },
    completed,
    inferred: [...inferred].sort(),
    unresolved: [...unresolved].filter(feature => !Object.prototype.hasOwnProperty.call(completed, feature)).sort(),
  };
}
'''

new_complete = r'''function completeRelationalValues(state, seedValues, maxPasses = 12) {
  let completed = { ...seedValues };
  const inferred = new Set();
  const unresolved = new Set();
  const byFeature = new Map(state.structure.symbols.map(s => [s.feature, s]));

  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false;
    const expanded = expandPartial(completed, state.structure.symbols);
    for (const [feature, value] of Object.entries(expanded)) {
      if (Object.prototype.hasOwnProperty.call(completed, feature)) continue;
      completed[feature] = value;
      inferred.add(feature);
      changed = true;
    }

    const orderedSymbols = state.structure.symbols.slice().sort((a, b) => b.depth - a.depth || a.feature.localeCompare(b.feature));
    for (const symbol of orderedSymbols) {
      if (completed[symbol.feature] !== true) continue;
      if (!symbolCompatible(symbol, true, completed, byFeature)) {
        unresolved.add(symbol.feature);
        continue;
      }
      for (const atom of symbol.definition) {
        if (Object.prototype.hasOwnProperty.call(completed, atom.feature)) continue;
        completed[atom.feature] = atom.value;
        inferred.add(atom.feature);
        changed = true;
      }
    }

    const prediction = predict(state.structure, completed);
    for (const [target, relation] of Object.entries(prediction.best_by_target)) {
      if (Object.prototype.hasOwnProperty.call(completed, target)) continue;
      const rival = prediction.active.find(other =>
        other.target === target && !same(other.expected, relation.expected) &&
        Math.abs(other.predictive_code_bits - relation.predictive_code_bits) < 1e-9
      );
      if (rival) {
        unresolved.add(target);
        continue;
      }
      const symbol = byFeature.get(target);
      if (!symbolCompatible(symbol, relation.expected, completed, byFeature)) {
        unresolved.add(target);
        continue;
      }
      completed[target] = relation.expected;
      inferred.add(target);
      changed = true;
    }
    if (!changed) break;
  }

  return {
    completed,
    inferred: [...inferred].sort(),
    unresolved: [...unresolved].filter(feature => !Object.prototype.hasOwnProperty.call(completed, feature)).sort(),
  };
}

function completeCurrent(state, frame) {
  const present = presentFeatures(state, frame);
  return {
    observed: { ...present.values },
    ...completeRelationalValues(state, present.values),
  };
}
'''
replace_once(old_complete, new_complete, 'general relational completion')

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
  const intent = { ...present.values };
  let open = 0;
  for (let i = 0; i < state.concern_count; i++) {
    if (present.contact.concern[i] > 0) {
      intent[`relation_c${i}_order`] = LESS;
      open++;
    }
  }
  if (!open) return null;

  // Intention is an open relation. The missing outward term is recovered by the
  // same generic completion used for ordinary comprehension and recollection.
  const completion = completeRelationalValues(state, intent, 4);
  const action = completion.completed.action;
  if (!Number.isInteger(action) || action < 0 || action >= state.action_count) return null;

  // A candidate continuation is checked through that same relation completion,
  // rather than by a second decision/prediction procedure.
  const consequence = completeRelationalValues(state, { ...present.values, action }, 4).completed;
  for (let i = 0; i < state.concern_count; i++) {
    if (consequence[`relation_c${i}_order`] === GREATER) return null;
  }
  return {
    seed: intent,
    completed: completion.completed,
    inferred: completion.inferred,
    unresolved: completion.unresolved,
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
        inferred: ['action'],
        unresolved: [],
      };
    }
'''
replace_once(old_motor, new_motor, 'C outward continuation')

p.write_text(s)
