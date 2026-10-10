from pathlib import Path
p = Path('one-mind.js')
s = p.read_text()
old = """  const kept = [];
  for (const key of [...groups.keys()].sort()) {
    const group = groups.get(key);
    const frontier = group.filter(pattern => !group.some(other =>
      other !== pattern &&
      other.predictive_code_bits <= pattern.predictive_code_bits + 1e-12 &&
      strictDependencySubset(patternDependencies.get(other), patternDependencies.get(pattern))
    ));
    const frontierSet = new Set(frontier);
    kept.push(...[...frontier, ...group.filter(pattern => !frontierSet.has(pattern))].slice(0, perConclusion));
  }
"""
new = """  // Retention and use answer different questions. `bits_saved` measures how much
  // of lived reality a relation actually compresses, so it governs which members
  // of an accessibility frontier deserve scarce storage. Predictive code length
  // remains the query-time authority in `predict()`. This separation prevents a
  // growing collection of narrow perfect-context rules from evicting a broader
  // relation that continues to receive confirming evidence.
  function retentionRank(a, b) {
    return b.bits_saved - a.bits_saved ||
      a.dependency_count - b.dependency_count ||
      a.predictive_code_bits - b.predictive_code_bits ||
      b.covered - a.covered ||
      conditionKey(a.conditions).localeCompare(conditionKey(b.conditions));
  }
  const kept = [];
  for (const key of [...groups.keys()].sort()) {
    const group = groups.get(key);
    const frontier = group.filter(pattern => !group.some(other =>
      other !== pattern &&
      other.predictive_code_bits <= pattern.predictive_code_bits + 1e-12 &&
      strictDependencySubset(patternDependencies.get(other), patternDependencies.get(pattern))
    ));
    const frontierSet = new Set(frontier);
    const preferred = frontier.slice().sort(retentionRank);
    const remainder = group.filter(pattern => !frontierSet.has(pattern)).sort(retentionRank);
    kept.push(...[...preferred, ...remainder].slice(0, perConclusion));
  }
"""
if s.count(old) != 1:
    raise SystemExit(f'expected one retention block, found {s.count(old)}')
p.write_text(s.replace(old, new))
