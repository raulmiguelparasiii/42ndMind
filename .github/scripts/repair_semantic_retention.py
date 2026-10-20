from pathlib import Path

p=Path('one-mind.js')
s=p.read_text()

old='  const patterns = [];\n  const patternDependencies = new Map();\n'
new='  const patterns = [];\n'
if s.count(old)!=1: raise SystemExit(f'patternDependencies declaration count={s.count(old)}')
s=s.replace(old,new,1)

old='''    const conditionFeatureSets = condition.map(atom => domain(atom.feature));
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
'''
new='''    const conditionFeatureSets = condition.map(atom => domain(atom.feature));
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
    const dependencyRequirements = [...requirementMap.values()].sort((a,b)=>atomKey(a).localeCompare(atomKey(b)));
    const dependencyCount = new Set(dependencyRequirements.map(requirement => requirement.feature)).size;
'''
if s.count(old)!=1: raise SystemExit(f'dependency block count={s.count(old)}')
s=s.replace(old,new,1)

old='''        dependency_count: dependencyCount,
        model_bits: modelBits,
        active: true,
      };
      patterns.push(pattern);
      patternDependencies.set(pattern, new Set(conditionDependencies));
'''
new='''        dependency_count: dependencyCount,
        dependency_requirements: dependencyRequirements.map(requirement => ({ ...requirement })),
        model_bits: modelBits,
        active: true,
      };
      patterns.push(pattern);
'''
if s.count(old)!=1: raise SystemExit(f'pattern metadata block count={s.count(old)}')
s=s.replace(old,new,1)

old='''  // Finite retention is conclusion-relative. Distinct warranted conclusions must
  // not erase one another merely because they occupy the same target channel.
  // Within one conclusion, first preserve the accessibility frontier: a route is
  // redundant only when an equally good-or-better route reaches the same result
  // from a strict subset of its underlying base evidence. Incomparable evidence
  // routes remain available even when one surface/context is more common.
  const perConclusion = Math.max(8, Math.ceil(Math.sqrt(samples.length)));
  const groups = new Map();
  for (const pattern of patterns) {
    const key = `${pattern.target}=>${stable(pattern.expected)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(pattern);
  }
  function strictDependencySubset(a, b) {
    if (!a || !b || a.size >= b.size) return false;
    for (const feature of a) if (!b.has(feature)) return false;
    return true;
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
    kept.push(...[...frontier, ...group.filter(pattern => !frontierSet.has(pattern))].slice(0, perConclusion));
  }
'''
new='''  // Finite retention is conclusion-relative. A description is redundant only when
  // another route reaches the same conclusion with no worse predictive warrant
  // and requires a subset of the same recursively grounded evidence. Distinct
  // grounded access routes therefore remain independently usable without giving
  // compressed surface aliases semantic priority.
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
  function routeDominates(a,b) {
    if (a.predictive_code_bits > b.predictive_code_bits + ROUTE_EPSILON) return false;
    const ar=requirementKeys(a), br=requirementKeys(b);
    for (const requirement of ar) if (!br.has(requirement)) return false;
    return a.predictive_code_bits < b.predictive_code_bits - ROUTE_EPSILON || ar.size < br.size;
  }
  for (const key of [...groups.keys()].sort()) {
    const candidates=groups.get(key);
    const frontier=candidates.filter(candidate => !candidates.some(other => other!==candidate && routeDominates(other,candidate)));
    const selected=frontier.slice(0,perConclusion);
    if (selected.length < perConclusion) {
      for (const candidate of candidates) {
        if (selected.includes(candidate)) continue;
        selected.push(candidate);
        if (selected.length >= perConclusion) break;
      }
    }
    kept.push(...selected);
  }
'''
if s.count(old)!=1: raise SystemExit(f'retention block count={s.count(old)}')
s=s.replace(old,new,1)

p.write_text(s)
print('semantic retention candidate applied')
