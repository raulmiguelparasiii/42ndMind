function C(state, realityContact) {
  if (!state || state.whole !== 1) throw new Error('C requires one whole mind');

  let frame = null;
  let relationalContact = null;
  if (Array.isArray(realityContact)) {
    frame = realityContact.slice();
  } else if (realityContact && typeof realityContact === 'object') {
    if (realityContact.frame !== undefined && realityContact.frame !== null) {
      if (!Array.isArray(realityContact.frame)) throw new Error('reality-contact frame must be an array');
      frame = realityContact.frame.slice();
    }
    if (realityContact.relations !== undefined && realityContact.relations !== null) {
      relationalContact = realityContact.relations;
    }
    if (!frame && !relationalContact) throw new Error('invalid reality-contact');
  } else throw new Error('invalid reality-contact');

  if (frame) {
    if (frame.length <= state.concern_count) throw new Error('invalid reality-contact');
    const cut = frame.length - state.concern_count;
    const percept = frame.slice(0, cut);
    const concern = frame.slice(cut);
    if (!percept.every(value => value === null || Number.isFinite(value))) {
      throw new Error('perceptual contact must be finite numeric values or null for unobserved channels');
    }
    if (!concern.every(Number.isFinite)) throw new Error('concern contact must be finite numeric magnitudes');

    if (state.previous_contact && state.motor != null) {
      const index = state.experiences.length;
      const experience = { before: state.previous_contact.slice(), action: state.motor, after: frame.slice() };
      state.experiences.push(experience);
      const sample = directSample(state, experience, index);

      if (state.experiences.length >= state.structure.next_recompression_at) state.structure = recompressWhole(state);
      else assimilateExperience(state, sample);
    }

    state.contacts.push(frame.slice());
    state.previous_contact = frame;
    state.current = completeCurrent(state, frame);
    const completion = groundedCompletion(state, frame);
    state.motor = completion == null ? spontaneousMotor(state) : completion;
  }

  if (relationalContact) ingestRelationalContact(state, relationalContact);
  return state;
}
