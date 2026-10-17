from pathlib import Path

# Rerun note: semantic-grounding is intentionally not a gate here because the
# unchanged main branch already fails that same independent regression after PR #45.


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'missing expected text in {path}: {old[:100]!r}')
    p.write_text(text.replace(old, new, 1))


# 1. Canonical runtime: preserve exact occurrence history, but do not eagerly
# scan the lifetime and materialize a memory-shaped frontier on every contact.
p = Path('one-mind.js')
text = p.read_text()
start = text.index('// Query-relative occurrence completion is a generic consequence of preserving')
clone_start = text.index('function cloneRelFactRecord', start)
frontier_start = text.index('function relationalOccurrenceFrontier', clone_start)
apply_start = text.index('function applyRelationalControlFacts', frontier_start)
clone_block = text[clone_start:frontier_start]
replacement = (
    '// Structured-contact occurrences are retained exactly inside M. This helper\n'
    '// preserves nested relational terms when recording an occurrence; it does not\n'
    '// create a retrieval state, memory frontier, or second cognitive authority.\n'
    + clone_block
)
text = text[:start] + replacement + text[apply_start:]
old_ingest = """  const episodeIndex = state.knowledge.episodes.length;\n  state.knowledge.episodes.push({\n    id: `relation-episode:${episodeNumber}`,\n    facts: episodeFacts.map(cloneRelFactRecord),\n    rules: incomingRules.map(rule => rule.id),\n  });\n  refreshRelationalKnowledge(state);\n  state.knowledge.current.occurrence_frontier = relationalOccurrenceFrontier(state, ordinaryFacts, episodeIndex);\n"""
new_ingest = """  state.knowledge.episodes.push({\n    id: `relation-episode:${episodeNumber}`,\n    facts: episodeFacts.map(cloneRelFactRecord),\n    rules: incomingRules.map(rule => rule.id),\n  });\n  refreshRelationalKnowledge(state);\n"""
if old_ingest not in text:
    raise SystemExit('missing eager occurrence frontier ingest block')
text = text.replace(old_ingest, new_ingest, 1)
p.write_text(text)

# 2. Canonical formula documentation: persistence is necessary; a memory/retrieval
# projection is not part of the law and must be derived only when a relation needs it.
p = Path('ONE_RULE.md')
text = p.read_text()
start = text.index('## Occurrence-preserving relational completion')
end = text.index('## Numerical invariant', start)
new_section = """## Occurrence preservation without a memory operation\n\nReality-preserving recompression must preserve the distinction between an abstract relation and the separate occasions on which that relation occurred. Let:\n\n```text\nH_t = (e_1, e_2, ..., e_n)\n```\n\nbe the retained occurrence history already contained in the one mind `M_t`. The required invariant is only:\n\n```text\nreality-distinct occurrences remain reality-distinct in M_t\ne_i and e_j may instantiate the same anonymous relation without implying i = j\n```\n\nNothing in the developmental law therefore requires a separate operation called memory, remembering, recollection, retrieval, or recall. Past contact does not have to be fetched into the mind: it is already part of the continuing `M_t`.\n\nA later relation may make only part of that history materially relevant. A finite implementation may then derive a query-relative projection, for example:\n\n```text\nQ_R(M_t) = { e_i in H_t : R embeds consistently in e_i }\n```\n\nbut `Q_R` is not a new cognitive operator and is not persistent semantic state. It is an authority-free projection of information already in `M_t`. It must not add facts, activate or defeat rules, or alter the admissible truth set. If no present relation requires that distinction, there is no reason to compute the projection at all.\n\nThis corrects an over-specialization introduced by PR #45. That implementation eagerly scanned retained structured episodes after every structured contact and stored an `occurrence_frontier` in `knowledge.current`. The user correctly pointed out that the one formula already contains its retained history. The eager frontier was therefore not required by the cognition law and imposed unnecessary lifetime-dependent work. It has been removed; exact occurrence identity remains preserved in `M`.\n\nThe scaling consequence is important: stable relational structure should make relevant parts of the whole cheap to reach through local/incremental structure or rebuildable indexes, not force a full autobiographical scan on every contact. Such indexes are implementation accelerators only and cannot become truth or semantic authority.\n\n"""
text = text[:start] + new_section + text[end:]
text = text.replace(
    'GitHub Actions now verifies the original exact kernel, self-learning and refinement, recursive self-recompression, occurrence-aware relational completion, and the scaling stress suite.',
    'GitHub Actions now verifies the original exact kernel, self-learning and refinement, recursive self-recompression, exact occurrence preservation without an eager memory projection, and the scaling stress suite.'
)
old_bullets = """- present partial structured contact reopens every compatible earlier relational occurrence rather than selecting one by familiarity or recency;\n- additional present structure narrows that historical occurrence frontier through the existing relation matcher;\n- identical relational content can remain multiple distinct retained occurrences;\n- occurrence reaccess does not manufacture facts or change relational rule authority;\n"""
new_bullets = """- distinct structured reality contacts remain distinct retained occurrences inside the one `M`;\n- repeated identical relational content remains identical content across distinct occurrences;\n- canonical `C` does not eagerly materialize a memory/retrieval frontier on every structured contact;\n- historical/query projections, when needed, must remain derived views with no truth or rule authority;\n"""
if old_bullets not in text:
    raise SystemExit('missing PR45 verified-result bullets')
text = text.replace(old_bullets, new_bullets, 1)
text = text.replace(
    'Occurrence-aware relational completion is part of the generic contact-preservation/completion machinery, not a named memory facility. The implementation still contains finite engineering search limits and a generic representation vocabulary for observed feature/value relations. Those are computational interfaces and bounds, not learned conclusions.',
    'Occurrence identity is part of generic reality preservation. No eager memory-shaped projection is part of the canonical law. The implementation still contains finite engineering search limits and a generic representation vocabulary for observed feature/value relations. Those are computational interfaces and bounds, not learned conclusions.'
)
p.write_text(text)

# 3. Canonical CI now guards the corrected invariant instead of the conceptually
# overstrong PR45 frontier requirement.
p = Path('.github/workflows/one-rule.yml')
text = p.read_text()
text = text.replace("      - 'relational-occurrence-completion.test.js'\n", "      - 'relational-history-preservation.test.js'\n")
text = text.replace('      - run: node relational-occurrence-completion.test.js\n', '      - run: node relational-history-preservation.test.js\n')
p.write_text(text)

# 4. Project memory: preserve the failure and prevent future context recovery from
# turning memory/attention candidate labels into implementation instructions.
p = Path('AGENTS.md')
text = p.read_text()
anchor = '\n## Frozen checkpoints\n'
correction = """\n11. **Canonical eager-history projection correction (2026-10-17).** PR #45 correctly preserved distinct structured occurrences but overreached by eagerly scanning `M.knowledge.episodes` after every structured contact and storing an `occurrence_frontier`. The user noticed the conceptual mistake: in the one-mind architecture, retained past contact is already inside `M`; a human-style retrieval step is not automatically required. A preserved falsification then showed the runtime still materialized that capability-shaped projection while the established canonical tests passed. The correction removed the eager frontier and lifetime scan while retaining exact occurrence identity/ordering. Future source/occurrence access must be derived only when a materially relevant relation requires it, preferably through local/incremental or rebuildable indexes with zero semantic/truth authority. **Persistence is fundamental; memory/retrieval is at most an emergent/query-relative description.**\n"""
if anchor not in text:
    raise SystemExit('missing AGENTS frozen-checkpoint anchor')
text = text.replace(anchor, correction + anchor, 1)
active_anchor = '- contains `M.knowledge`, a first-class relational substrate with subject/relation/object terms, variables, explicit relation references, generic schema matching, recursive closure, provenance, and relation-about-relation representation;\n'
active_add = active_anchor + '- preserves distinct structured-contact occurrences inside the one `M`, including repeated identical content as separate occurrences, without eagerly materializing a memory/retrieval frontier;\n'
if active_anchor not in text:
    raise SystemExit('missing AGENTS current-architecture anchor')
text = text.replace(active_anchor, active_add, 1)
text = text.replace(
    '7. **Scaling.** The 96-contact micro-world remains expensive. Stable handles should reduce repeated search while retaining grounding for correction. Optimize indexes/local/incremental completion without changing semantic authority.',
    '7. **Scaling.** The 96-contact micro-world remains expensive. Stable handles should reduce repeated search while retaining grounding for correction. Optimize indexes/local/incremental completion without changing semantic authority. Historical/source access must follow the same rule: do not scan the whole lifetime on every contact merely to imitate human retrieval.'
)
p.write_text(text)

# 5. Universal Language continuity: later source-history work remains valid as
# bounded read/proposal machinery, but cognitive labels are not an implementation roadmap.
p = Path('UNIVERSAL_LANGUAGE_TRACK.md')
text = p.read_text()
anchor = '\n## 21. Current frontier\n'
insert = """\n### 20a. Subsequent source-history work and the persistence correction\n\nPRs #36-#44 extended the same one-ledger read/proposal architecture with occurrence/source resolution, ambiguous surface frontiers, cue accessibility, source coherence, binding-consistent whole-source checks, proposal-only cross-occurrence recurrence, and recurrence-guided proposal scaffolding. These results remain useful bounded tests of relational persistence, provenance, ambiguity, co-reference, and candidate formation. They do **not** establish that the runtime needs a human-style memory faculty.\n\nA later canonical bridge (PR #45) exposed the key distinction more sharply. The canonical mind already retains structured occurrences inside `M`. PR #45 initially added an eager `occurrence_frontier` scan after every structured contact. The user noticed that this made a human access limitation look like a requirement of the formula. A preserved falsification confirmed that the eager projection was an additional runtime behavior rather than a prerequisite of existing cognition. The canonical correction therefore keeps occurrence identity/history but removes the automatic frontier.\n\nKeep the following distinction explicit going forward:\n\n```text\nretained reality contact / distinct occurrence identity = part of the one state\nquery-relative historical/source projection            = derived only when needed\nmemory / remember / recollect / attention / focus      = external semantic hypotheses, not runtime faculties\n```\n\nThe seven cognitive candidate graphs from PR #34 remain falsifiable semantic candidates for what human words may denote. They are **not an implementation checklist**. If one of those words appears to expose a useful result, first strip away the label and ask what content-neutral relational invariant is actually required. Only a preserved failure of the generic substrate licenses a generic change.\n\nThis correction also sharpens the compute direction: do not repeatedly scan the whole retained lifetime to simulate retrieval. Stable relations, local connected structure, and rebuildable/query-relative indexes may accelerate access, but those are implementation representations of the same `U`/`M`, never additional semantic or epistemic authority.\n\n"""
if anchor not in text:
    raise SystemExit('missing ULT current-frontier anchor')
text = text.replace(anchor, insert + anchor, 1)
old_direction = """Immediate next technical direction: use the ordinary live `F`/oracle path to expose these seven candidate spaces to varied natural-language and operational cases while keeping semantic labels outside the pure runtime. Drive discrimination through independent structural/behavioral contact, especially cases that separate retention from retrieval, remembering from recollection, acquisition from retrieval, current selection from persistent focus, and attention from broad target-directed intent. Let failures weaken/split the candidates. Do not introduce a separate memory database, attention controller, focus state, or copied semantic/status authority unless the one-formula path is first falsified.\n"""
new_direction = """Immediate technical direction: treat the seven cognitive words only as external falsifiable semantic surfaces, not as capabilities to implement. Continue improving the universal relational substrate, stabilization/correction, recursive reduction, source/provenance structure, and scaling. When a cognitive-looking behavior appears, ask which general relation already present in the one whole produces it; add generic machinery only after a preserved falsification shows the substrate cannot express the required reality distinction. Do not introduce a memory database, retrieval state, attention controller, focus state, or copied semantic/status authority merely because human cognition uses those words.\n"""
if old_direction not in text:
    raise SystemExit('missing ULT immediate-direction paragraph')
text = text.replace(old_direction, new_direction, 1)
text = text.replace(
    'retained historical contact != currently warranted truth\n',
    'retained historical contact != currently warranted truth\nretained history != a required memory faculty\nquery-relative historical projection != a required persistent cognitive state\n'
)
p.write_text(text)

# 6. Retire the overstrong PR45 test and temporary falsification/apply machinery.
old_test = Path('relational-occurrence-completion.test.js')
if not old_test.exists():
    raise SystemExit('missing old occurrence-frontier test')
old_test.unlink()
for transient in [
    Path('.github/workflows/falsify-eager-memory-projection.yml'),
    Path('.github/workflows/apply-persistence-not-memory.yml'),
    Path('.github/scripts/apply_persistence_not_memory.py'),
]:
    if transient.exists():
        transient.unlink()
