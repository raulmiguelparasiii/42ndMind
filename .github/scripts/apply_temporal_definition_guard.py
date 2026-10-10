from pathlib import Path

p = Path('one-mind.js')
s = p.read_text()

old = '''function completeCurrent(state, frame) {
  const present = presentFeatures(state, frame);
  let completed = { ...present.values };
'''
new = '''function completeCurrent(state, frame) {
  const present = presentFeatures(state, frame);
  let completed = { ...present.values };
'''
# This script is applied after the raw temporal patch, where completeCurrent
# already inserts directly evaluated temporal values. We only need to prevent
# empirical prediction from inventing a temporal occurrence whose defining raw
# sequence was not currently observed/evaluable.
if old not in s and 'const temporal = currentPerceptTemporalValues(state);' not in s:
    raise SystemExit('temporal definition guard: staged raw temporal completeCurrent not found')

needle = '''    const prediction = predict(state.structure, completed);
    for (const [target, relation] of Object.entries(prediction.best_by_target)) {
      if (Object.prototype.hasOwnProperty.call(completed, target)) continue;
'''
replacement = '''    const prediction = predict(state.structure, completed);
    const temporalFeatures = new Set((state.structure.temporal_symbols || []).map(symbol => symbol.feature));
    for (const [target, relation] of Object.entries(prediction.best_by_target)) {
      if (Object.prototype.hasOwnProperty.call(completed, target)) continue;
      // A §t handle denotes occurrence of its defining raw same-channel sequence.
      // Its truth is obtained by evaluating that sequence against current contact.
      // If the channel/window is undefined now, correlation with other features
      // cannot make the occurrence itself true or false.
      if (temporalFeatures.has(target)) continue;
'''
count = s.count(needle)
if count != 1:
    raise SystemExit(f'temporal definition guard: expected one prediction loop, found {count}')

p.write_text(s.replace(needle, replacement, 1))
