'use strict';

// Zero-state S-boundary segmentation for long ordered text contact.
// It decides only physical surface boundaries from punctuation/newlines. It owns
// no memory, grammar, semantics, proposition structure, truth, or response policy.
// The exact unsplit contact is retained in canonical M before every segment is
// sent through the same public developmental C.

function segmentText(raw) {
  const text = String(raw ?? '');
  if (!text.trim()) return [];
  const out = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const terminal = ch === '.' || ch === '?' || ch === '!' || ch === '\n';
    if (!terminal) continue;

    // Keep runs such as "?!" in the same mechanical segment.
    let end = i + 1;
    while (end < text.length && (text[end] === '.' || text[end] === '?' || text[end] === '!')) end++;
    const piece = text.slice(start, end).trim();
    if (piece) out.push(piece);
    start = end;
    i = end - 1;
  }
  const tail = text.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

function copyContact(contact) {
  const out = { ...contact, surface: { ...contact.surface } };
  if (contact.relations) out.relations = contact.relations;
  return out;
}

function expand(state, realityContact) {
  if (!realityContact || Array.isArray(realityContact) || typeof realityContact !== 'object') return null;
  const surface = realityContact.surface;
  if (!surface || typeof surface.input !== 'string' || surface._ordered_segment === true) return null;

  // Structured semantic contact already declares how the whole contact is bound;
  // do not reinterpret or repartition it here. This adapter is for raw surface
  // contact only.
  if (realityContact.relations || Array.isArray(surface.channels) || Array.isArray(realityContact.frame)) return null;

  const inputs = segmentText(surface.input);
  if (inputs.length < 2) return null;

  const outputs = surface.output === undefined || surface.output === null
    ? [] : segmentText(surface.output);
  if (outputs.length > 1 && outputs.length !== inputs.length) return null;

  const serial = (state?.knowledge?.episodes?.length || 0) + 1;
  const containerId = `ordered-surface-container:${serial}`;
  const containerFacts = [
    [containerId, 'ρ:kind', 'ordered_surface_container'],
    [containerId, 'ρ:input_raw', String(surface.input)],
    [containerId, 'ρ:segment_count', inputs.length],
    ['self', 'ρ:experienced', containerId],
  ];
  for (let i = 0; i < inputs.length; i++) {
    containerFacts.push([containerId, 'ρ:contains_surface_segment', { index: i, input: inputs[i] }]);
  }

  const contacts = inputs.map((input, i) => {
    const next = copyContact(realityContact);
    delete next.relations;
    delete next.frame;
    next.surface.input = input;
    next.surface._ordered_segment = true;
    if (outputs.length === inputs.length) next.surface.output = outputs[i];
    else if (outputs.length === 1 && i === inputs.length - 1) next.surface.output = outputs[0];
    else delete next.surface.output;
    return next;
  });

  return {
    container: { relations: { facts: containerFacts } },
    contacts,
    exact_input: String(surface.input),
    segment_count: inputs.length,
  };
}

module.exports = { segmentText, expand };
