from pathlib import Path

mind_path = Path('one-mind.js')
s = mind_path.read_text()

old = """    const conditionFeatureSets = condition.map(atom => domain(atom.feature));
    const conditionDependencies = new Set();
    for (const atom of condition) {
      for (const dependency of dependencies(atom.feature)) conditionDependencies.add(dependency);
    }
    // A learned handle may compress several prerequisites. That is legitimate
    // abstraction and is not penalized. But when two candidate relations have
    // equal predictive warrant, finite retention prefers the one whose antecedent
    // can be reconstructed from fewer independent base features. This prevents a
    // context-dependent alias from crowding out an equally warranted direct route.
    const dependencyCount = conditionDependencies.size;
"""
new = """    const conditionFeatureSets = condition.map(atom => domain(atom.feature));
    function baseRequirements(atom, trail = new Set()) {
      const symbol = byFeature.get(atom.feature);
      if (!symbol || atom.value !== true || trail.has(atom.feature)) return [{ ...atom }];
      const nextTrail = new Set(trail); nextTrail.add(atom.feature);
      return symbol.definition.flatMap(definitionAtom => baseRequirements(definitionAtom, nextTrail));
    }
    const requirementMap = new Map();
    for (const atom of condition) {
      for (const requirement of baseRequirements(atom)) requirementMap.set(atomKey(requirement), requirement);
    }
    const dependencyRequirements = [...requirementMap.values()].sort((a, b) => atomKey(a).localeCompare(atomKey(b)));
    const dependencyCount = new Set(dependencyRequirements.map(requirement => requirement.feature)).size;
"""
if s.count(old) != 1:
    raise SystemExit(f'expected one dependency block, found {s.count(old)}')
s = s.replace(old, new)

old = """        predictive_code_bits: -Math.log2(smoothed) + modelBits / eligible,
        dependency_count: dependencyCount,
        model_bits: modelBits,
"""
new = """        predictive_code_bits: -Math.log2(smoothed) + modelBits / eligible,
        dependency_count: dependencyCount,
        dependency_requirements: dependencyRequirements.map(requirement => ({ ...requirement })),
        model_bits: modelBits,
"""
if s.count(old) != 1:
    raise SystemExit(f'expected one pattern metadata block, found {s.count(old)}')
s = s.replace(old, new)

old = """  // Finite retention is conclusion-relative. Distinct warranted conclusions must
  // not erase one another merely because they occupy the same target channel,
  // and a conclusion may need several independently usable access routes. Prune
  // redundant descriptions within each (target, expected) referent instead.
  const perConclusion = Math.max(8, Math.ceil(Math.sqrt(samples.length)));
  const groups = new Map();
  for (const pattern of patterns) {
    const key = `${pattern.target}=>${stable(pattern.expected)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(pattern);
  }
  const kept = [];
  for (const key of [...groups.keys()].sort()) {
    kept.push(...groups.get(key).slice(0, perConclusion));
  }
"""
new = """  // Finite retention is conclusion-relative. A description is redundant only when
  // another route reaches the same conclusion with no worse predictive warrant
  // and requires a subset of the same grounded evidence. Routes that depend on
  // different evidence remain independently usable and must not erase one another.
  const perConclusion = Math.max(8, Math.ceil(Math.sqrt(samples.length)));
  const groups = new Map();
  for (const pattern of patterns) {
    const key = `${pattern.target}=>${stable(pattern.expected)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(pattern);
  }
  const kept = [];
  const ROUTE_EPSILON = 1e-9;
  function requirementKeys(pattern) {
    return new Set((pattern.dependency_requirements || pattern.conditions).map(atomKey));
  }
  function routeDominates(a, b) {
    if (a.predictive_code_bits > b.predictive_code_bits + ROUTE_EPSILON) return false;
    const aRequirements = requirementKeys(a);
    const bRequirements = requirementKeys(b);
    for (const requirement of aRequirements) if (!bRequirements.has(requirement)) return false;
    return a.predictive_code_bits < b.predictive_code_bits - ROUTE_EPSILON ||
      aRequirements.size < bRequirements.size;
  }
  for (const key of [...groups.keys()].sort()) {
    const candidates = groups.get(key);
    const frontier = candidates.filter(candidate => !candidates.some(other =>
      other !== candidate && routeDominates(other, candidate)
    ));
    const selected = frontier.slice(0, perConclusion);
    if (selected.length < perConclusion) {
      for (const candidate of candidates) {
        if (selected.includes(candidate)) continue;
        selected.push(candidate);
        if (selected.length >= perConclusion) break;
      }
    }
    kept.push(...selected);
  }
"""
if s.count(old) != 1:
    raise SystemExit(f'expected one retention block, found {s.count(old)}')
s = s.replace(old, new)
mind_path.write_text(s)

doc_path = Path('AGENTS.md')
doc = doc_path.read_text()
anchor = "9. The first compositional language-school run exposed dependency-blind finite retention: an equally predictive context-dependent `§` handle could crowd out a directly usable relation because tie ordering ignored what base information was needed to reconstruct the antecedent. A first attempted fix globally charged compressed relations for reconstruction cost; that broke legitimate compound semantic grounding and was rejected. The accepted fix leaves predictive/compression authority unchanged and uses ultimate dependency count **only as a tie-break among equal predictive candidates**. The unchanged language-school test then passed.\n"
addition = anchor + "10. The first continuous variable-length language life exposed **access-route collapse**: the same warranted meaning learned in several surface contexts could retain only one positional route because finite pruning treated alternate evidence paths as redundant. Diagnostics showed `star` and `helps` each had eight clean exposures in every relevant position while only one direct route survived. Retention now treats one route as redundant only when another has no worse predictive warrant and requires a subset of the same grounded evidence; distinct evidence routes remain independently retainable. This is generic and contains no language-specific semantics.\n"
if doc.count(anchor) != 1:
    raise SystemExit(f'expected one AGENTS correction anchor, found {doc.count(anchor)}')
doc_path.write_text(doc.replace(anchor, addition))
