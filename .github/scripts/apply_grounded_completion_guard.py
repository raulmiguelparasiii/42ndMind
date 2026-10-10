from pathlib import Path

p = Path('one-mind.js')
s = p.read_text()


def replace_once(old, new, label):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    s = s.replace(old, new, 1)


# A learned raw temporal relation is directly evaluable once its complete
# same-channel observation window exists. Represent both the warranted positive
# and warranted negative result in current cognition. Historical storage remains
# sparse; this does not author false facts into lifetime memory.
replace_once(
'''function currentPerceptTemporalValues(state) {
  const out = {};
  for (const symbol of state.structure?.temporal_symbols || []) {
    const match = /^p(\d+)$/.exec(symbol.channel || '');
    if (!match || !Array.isArray(symbol.expansion) || !symbol.expansion.length) continue;
    const channelIndex = Number(match[1]);
    const recent = [];
    for (let i = state.contacts.length - 1; i >= 0 && recent.length < symbol.expansion.length; i--) {
      const percept = splitContact(state, state.contacts[i]).percept;
      const value = percept[channelIndex];
      if (value === null || value === undefined) continue;
      recent.push(value);
    }
    recent.reverse();
    if (recent.length === symbol.expansion.length && same(recent, symbol.expansion)) {
      out[symbol.feature] = true;
    }
  }
  return out;
}
''',
'''function currentPerceptTemporalValues(state) {
  const out = {};
  for (const symbol of state.structure?.temporal_symbols || []) {
    const match = /^p(\d+)$/.exec(symbol.channel || '');
    if (!match || !Array.isArray(symbol.expansion) || !symbol.expansion.length) continue;
    const channelIndex = Number(match[1]);
    const recent = [];
    for (let i = state.contacts.length - 1; i >= 0 && recent.length < symbol.expansion.length; i--) {
      const percept = splitContact(state, state.contacts[i]).percept;
      const value = percept[channelIndex];
      if (value === null || value === undefined) continue;
      recent.push(value);
    }
    recent.reverse();
    if (recent.length !== symbol.expansion.length) continue;
    out[symbol.feature] = same(recent, symbol.expansion);
  }
  return out;
}
''',
    'current temporal evaluation',
)

# Structural descriptions are inspectable consequences of experience. They are
# not free-standing sensory facts that completion may manufacture and feed back
# into itself.
anchor = 'function completeCurrent(state, frame) {'
if s.count(anchor) != 1:
    raise SystemExit(f'completeCurrent anchor: expected one match, found {s.count(anchor)}')
helper = '''function compressionDescriptionFeature(feature) {
  return feature === 'relation_depth' || feature === 'relation_extent' || feature === 'relation_symbol';
}
function temporalEvidenceFeature(feature) {
  return /^§t\d+$/.test(feature);
}
function symbolDependsOnCompressionDescription(symbol, byFeature) {
  if (!symbol) return false;
  return [...symbolDependencies(symbol, byFeature)].some(compressionDescriptionFeature);
}

'''
s = s.replace(anchor, helper + anchor, 1)

replace_once(
'''    const orderedSymbols = state.structure.symbols.slice().sort((a, b) => b.depth - a.depth || a.feature.localeCompare(b.feature));
    for (const symbol of orderedSymbols) {
      if (completed[symbol.feature] !== true) continue;
      if (!symbolCompatible(symbol, true, completed, byFeature)) {
''',
'''    const orderedSymbols = state.structure.symbols.slice().sort((a, b) => b.depth - a.depth || a.feature.localeCompare(b.feature));
    for (const symbol of orderedSymbols) {
      if (completed[symbol.feature] !== true) continue;
      // A concept whose ultimate definition depends on compressor bookkeeping
      // cannot manufacture that bookkeeping into current reality.
      if (symbolDependsOnCompressionDescription(symbol, byFeature)) continue;
      if (!symbolCompatible(symbol, true, completed, byFeature)) {
''',
    'guard symbol decomposition',
)

replace_once(
'''    const prediction = predict(state.structure, completed);
    for (const [target, relation] of Object.entries(prediction.best_by_target)) {
      if (Object.prototype.hasOwnProperty.call(completed, target)) continue;
      const rival = prediction.active.find(other =>
''',
'''    const prediction = predict(state.structure, completed);
    for (const [target, relation] of Object.entries(prediction.best_by_target)) {
      if (Object.prototype.hasOwnProperty.call(completed, target)) continue;
      // A temporal symbol says what actually occurred on one physical channel.
      // It may support predictions once directly evaluated from that channel's
      // contact history, but completion cannot infer that history into existence.
      if (temporalEvidenceFeature(target)) continue;
      // Keep compressor-description metadata descriptive. It can summarize a
      // relation that exists, but it cannot be inferred as if it were sensory
      // evidence and then used to bootstrap unrelated empirical completion.
      if (compressionDescriptionFeature(target)) continue;
      const targetSymbol = byFeature.get(target);
      if (symbolDependsOnCompressionDescription(targetSymbol, byFeature)) continue;
      const rival = prediction.active.find(other =>
''',
    'guard predicted structural metadata',
)

p.write_text(s)
