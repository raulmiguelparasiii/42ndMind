from pathlib import Path

path = Path('one-mind.js')
source = path.read_text()

anchor = """function isRelationalControlFact(fact) {\n  return relRefName(fact.subject) !== null && same(fact.relation, REL_ACTIVE) && typeof fact.object === 'boolean';\n}\n"""
if anchor not in source:
    raise SystemExit('relational control anchor not found')

helper = anchor + """\n// Query-relative occurrence completion is a generic consequence of preserving\n// relational contact, not a separate cognitive faculty. Present ordinary facts\n// are treated as the current partial relation. Earlier contact episodes that\n// contain that relation remain distinct alternatives; this read never promotes\n// their additional facts into current truth or relational authority.\nfunction cloneRelFactRecord(fact) {\n  return {\n    ...fact,\n    subject: cloneRelTerm(fact.subject),\n    relation: cloneRelTerm(fact.relation),\n    object: cloneRelTerm(fact.object),\n  };\n}\nfunction relationalOccurrenceFrontier(state, cueFacts, excludeEpisodeIndex = null) {\n  const ordinaryCue = (cueFacts || []).filter(fact => !isRelationalControlFact(fact));\n  const cuePatterns = ordinaryCue.map(normalizeRelPattern);\n  const cueKeys = new Set(ordinaryCue.map(relFactKey));\n  const candidates = [];\n\n  if (cuePatterns.length) {\n    for (let i = 0; i < state.knowledge.episodes.length; i++) {\n      if (i === excludeEpisodeIndex) continue;\n      const episode = state.knowledge.episodes[i];\n      const episodeFacts = (episode.facts || []).filter(fact => !isRelationalControlFact(fact));\n      const bindings = relPremiseBindings(cuePatterns, episodeFacts);\n      if (!bindings.length) continue;\n      candidates.push({\n        episode_id: String(episode.id || `relation-episode:${i + 1}`),\n        episode_index: i,\n        binding_count: bindings.length,\n        bindings: bindings.map(cloneRelTerm),\n        occurrence_facts: episodeFacts.map(cloneRelFactRecord),\n        completion_facts: episodeFacts.filter(fact => !cueKeys.has(relFactKey(fact))).map(cloneRelFactRecord),\n      });\n    }\n  }\n\n  return {\n    cue_facts: ordinaryCue.map(cloneRelFactRecord),\n    candidate_count: candidates.length,\n    unique_occurrence: candidates.length === 1,\n    candidates,\n  };\n}\n"""
source = source.replace(anchor, helper, 1)

old = """  state.knowledge.episodes.push({ facts: episodeFacts.map(fact => ({ ...fact })), rules: incomingRules.map(rule => rule.id) });\n  refreshRelationalKnowledge(state);\n}\n"""
if old not in source:
    raise SystemExit('episode ingestion anchor not found')
new = """  const episodeIndex = state.knowledge.episodes.length;\n  state.knowledge.episodes.push({\n    id: `relation-episode:${episodeNumber}`,\n    facts: episodeFacts.map(cloneRelFactRecord),\n    rules: incomingRules.map(rule => rule.id),\n  });\n  refreshRelationalKnowledge(state);\n  state.knowledge.current.occurrence_frontier = relationalOccurrenceFrontier(state, ordinaryFacts, episodeIndex);\n}\n"""
source = source.replace(old, new, 1)

for forbidden in ['memoryStore', 'memoryModule', 'function remember', 'function recollect', 'attentionController']:
    if forbidden in source:
        raise SystemExit(f'capability-specific authority appeared: {forbidden}')

path.write_text(source)
