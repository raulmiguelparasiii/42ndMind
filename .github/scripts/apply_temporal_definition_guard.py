from pathlib import Path

p = Path('one-mind.js')
s = p.read_text()

# A §t handle is definitionally the occurrence of one learned raw same-channel
# sequence. Its current value can only come from currentPerceptTemporalValues.
# Other learned relations may use that evaluated value, but they cannot create
# the occurrence itself when the defining raw channel/window is absent.

needle = '''  const byFeature = new Map(state.structure.symbols.map(s => [s.feature, s]));

  for (let pass = 0; pass < 12; pass++) {
'''
replacement = '''  const byFeature = new Map(state.structure.symbols.map(s => [s.feature, s]));
  const temporalFeatures = new Set((state.structure.temporal_symbols || []).map(symbol => symbol.feature));

  for (let pass = 0; pass < 12; pass++) {
'''
count = s.count(needle)
if count != 1:
    raise SystemExit(f'temporal definition guard: expected completeCurrent setup once, found {count}')
s = s.replace(needle, replacement, 1)

needle = '''      for (const atom of symbol.definition) {
        if (Object.prototype.hasOwnProperty.call(completed, atom.feature)) continue;
        completed[atom.feature] = atom.value;
'''
replacement = '''      for (const atom of symbol.definition) {
        if (Object.prototype.hasOwnProperty.call(completed, atom.feature)) continue;
        if (temporalFeatures.has(atom.feature)) continue;
        completed[atom.feature] = atom.value;
'''
count = s.count(needle)
if count != 1:
    raise SystemExit(f'temporal definition guard: expected one symbol decomposition loop, found {count}')
s = s.replace(needle, replacement, 1)

needle = '''    const prediction = predict(state.structure, completed);
    for (const [target, relation] of Object.entries(prediction.best_by_target)) {
      if (Object.prototype.hasOwnProperty.call(completed, target)) continue;
'''
replacement = '''    const prediction = predict(state.structure, completed);
    for (const [target, relation] of Object.entries(prediction.best_by_target)) {
      if (Object.prototype.hasOwnProperty.call(completed, target)) continue;
      if (temporalFeatures.has(target)) continue;
'''
count = s.count(needle)
if count != 1:
    raise SystemExit(f'temporal definition guard: expected one prediction loop, found {count}')
s = s.replace(needle, replacement, 1)

p.write_text(s)
