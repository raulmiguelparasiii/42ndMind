from pathlib import Path

p = Path('one-mind.js')
s = p.read_text()

old = '''function currentPerceptTemporalValues(state) {
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
'''

new = '''function currentPerceptTemporalValues(state) {
  const out = {};
  if (!state.contacts.length) return out;
  const currentPercept = splitContact(state, state.contacts[state.contacts.length - 1]).percept;
  for (const symbol of state.structure?.temporal_symbols || []) {
    const match = /^p(\d+)$/.exec(symbol.channel || '');
    if (!match || !Array.isArray(symbol.expansion) || !symbol.expansion.length) continue;
    const channelIndex = Number(match[1]);
    // A temporal relation is current only if this physical channel was actually
    // contacted now. Null is undefined contact, so an older sequence must not be
    // carried forward and presented as a relation occurring at this moment.
    const currentValue = currentPercept[channelIndex];
    if (currentValue === null || currentValue === undefined) continue;
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
'''

count = s.count(old)
if count != 1:
    raise SystemExit(f'current temporal contact guard: expected one match, found {count}')

p.write_text(s.replace(old, new, 1))
