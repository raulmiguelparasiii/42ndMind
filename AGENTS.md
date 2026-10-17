# 42ndMind project memory

Read this fully before changing the project.

## Goal and one law

Build one developing artificial mind from one compact reality-governed law, not a collection of cognitive modules:

```text
M_(t+1) = C(M_t ⊕ R_(t+1))
```

`M` is one whole (`whole=1`): everything this individual currently contains/understands, including learned relational structure and current continuation. `R` is new reality-contact. `C` is the content-neutral developmental transformation that preserves contact, discovers/reuses/compresses relations, completes warranted missing terms, and reopens structure under counterevidence.

Working interpretation:

> Cognition is continuous completion, correction, and recompression of open relations with reality.

## Hard boundary: no cheating C

`C` is **how the mind changes**. `M` is **what the mind knows/becomes**.

Do not put capability-specific knowledge into `C` because the mind “needs” it. No English semantics, OneLogic solver, Stone evaluator, planner, reward policy, source weights, goals, curiosity routine, semantic scene labels, or world-specific survival rule may become hidden cognitive authority in `C`.

Stone, formal OneLogic, English, mathematics, books, source knowledge, etc. should live as **corrigible structured knowledge inside `M`**. They may give `M_0` a leg up, but later reality must still be able to refine or defeat them.

The active cognitive runtime remains one self-contained file, `one-mind.js`, exposing only:

```text
one(...)
C(M,R)
```

Historical/helper files must not become live cognitive authorities.

Never add a separate planner/action policy, Q-learning, tree search, reward maximization, hidden future simulator, semantic dictionary, language module, success replay, Pareto selector, scalar utility, or hand-written faculty for memory/concepts/empathy/causality/categories/curiosity/etc.

When a test fails, preserve the failure. Change generic relation/representation machinery only when the failure exposes a generic structural defect.

## Reality interface

The mind law is not its receptors/actuators:

```text
W --S--> R --C(M⊕R)--> M' --A--> W'
```

`S` is inward transduction only. `A` is outward actuation/expression only. Neither decides meaning or truth.

The test embodiment may supply distinct perceptual channels, finite motor possibilities, and explicitly magnitude-valued interoceptive pressure channels. Arbitrary percept codes remain categorical. Only supplied magnitudes warrant ordinal relations such as less/same/greater.

Perceptual contact may be partial: `null` means that perceptual channel was not contacted. It is undefined, not false. Concern channels remain explicit finite magnitudes.

`C` now also accepts structured relational contact through the same `R` boundary. This is additional representational form, not a second cognition path.

## Stone / Epistemic Octahedron

Stone is the reality-relative structure of judgment, not a reward space:

- `+x` Empathy / `-x` Practicality
- `+z` Wisdom / `-z` Knowledge
- `+y` Answerability / `-y` Insulation
- top `(0,1,0)` Maturity/full Answerability
- bottom `(0,-1,0)` Collapse/full Insulation
- equator `y=0` prejudice structurally

Stone signs are orientations of cognition toward reality, never outcome valence. Do not map bodily improvement/worsening to Stone coordinates or assign a numerical stance merely because the axes are known.

Knowledge = warranted actuality/contact. Wisdom is expected to be closely related to OneLogic: what may legitimately be preserved, concluded, rejected, left unresolved, investigated, or re-represented. Empathy/Practicality concern materially relevant concern and real finite constraint, but must not become modules or scalar utilities.

Stone now exists inside `M.knowledge` as inspectable structured seed facts plus a few operational relational schemas where the current substrate can express them honestly. Maturity and collapse are currently represented as relation-completion schemas, not hidden evaluators in `C`.

## OneLogic / 42ndLogic

Do not confuse the first-principles prose summary with the formal system.

Summary:

> Preserve possibilities reality has not defeated; eliminate exactly what warranted contact defeats; assert only what survivors force; seek discriminating contact when unresolved; revise/expand representation when actuality no longer fits. Undefined is not false.

The separate `raulmiguelparasiii/42ndLogic` repo formalizes live possibility set `K`, strict categorical consequence, sharp update `U*`, actuality preservation, query-relative representation, model-class expansion, objective deviation, and counterexample defeat.

Notation warning: 42ndMind's `C(M⊕R)` is the whole developmental transformation. Formal OneLogic also uses `C(K)` for categorical consequence. They are not the same operator.

Formal OneLogic is now represented inside `M` as first-class structured knowledge, but only partly operationalized because the present relational substrate does not yet natively express arbitrary live possibility sets, set intersection/update, quantification, or full proposition structure.

Current status:

- T1-T10 theorem claims are present as structured, referencable facts in `M`.
- T7 model-class expansion and T10 counterexample defeat have operational schemas through generic relation completion.
- undefined-is-not-false has a structured operational schema.
- T1/T2 and the other set/quantifier-heavy theorems are **not** faked with theorem-specific code. Their claims exist, but richer generic representation is still required before they can become fully executable knowledge.
- No function in `C` recognizes the names OneLogic, T10, counterexample, Stone, maturity, etc. as privileged semantics.

The strongest anti-cheat falsification is T10 self-defeat: T10 first disables another categorical bridge; then a counterexample relation about T10 causes T10 itself to become inactive; after that, another counterexample no longer disables a new bridge. Therefore “counterexample defeats categorical bridge” is not hidden authority in `C`; it operates only while the T10 relation inside `M` is active.

## Purpose

Purpose is an open reality-relative relation, not a reward or goal variable. A route may be defeated while the underlying concern survives; nominal acquisition does not equal satisfaction.

For primitive bodily pressures only, nonzero pressure is an open embodied concern and zero is absence by interface definition. The minimal closure relation is less of that same magnitude, not because less = reward.

Action and consequence belong to one experienced relation. A learned relation may be used in either direction: action can imply consequence, or a presently relevant consequence can leave action as the missing term. This is relation completion, not planning.

## Language / semantic hypothesis

Language is broadly compressed reality-grounded relational structure, not merely interpersonal signal convention.

Raw numeric/categorical contact is substrate, not meaning. `§N` is an arbitrary internal handle; its meaning is its recursively grounded definition and relational position. No particular `§N` or toy word such as `cat` is architecturally privileged.

Desired architecture:

```text
English / other expression
          <->
reality-grounded internal relational language
```

Words must not receive meaning from a dictionary hidden in `C`. English is an expression surface that can attach to independently grounded meanings. `M` should be able to use its internal relational language without translating every cognition into English.

A bounded fixed-slot compositional schooling test now passes. It establishes reuse/composition of independently taught word relations at toy scale, not general English or learned natural-language grammar. The interface still preserves three token positions.

## Parallel universal-language experiment — do not conflate it with the mind

`universal-language.js` is a newer, narrower parallel experiment whose target is direct English-intention <-> mathematical-relational representation under one live state/update law. It is **not** the canonical developing mind and must not silently replace `one-mind.js`, `M`, or `C`.

Read `UNIVERSAL_LANGUAGE_TRACK.md` before changing that experiment or proposing integration with the canonical mind.

The older 42ndMind target remains more ambitious: one continuing `M` should develop increasingly complex relational cognition from foundational, content-neutral developmental machinery and reality-contact, with English eventually attaching to and expressing the same internal relational language rather than becoming a separate cognitive module.

Context-loss rule: the repository is authoritative memory. Before declaring a mechanism missing, search `AGENTS.md`, `UNIVERSAL_LANGUAGE_TRACK.md`, checkpoints, design notes, tests, and implementation history. Absence from the current conversation/context window is **unknown**, not evidence of absence from the project. Do not replace a mechanism whose original purpose and falsification history have not been recovered.

## Universal Language Track — current architecture and evidence snapshot

This section is a baseline copy of the critical context that also lives in `UNIVERSAL_LANGUAGE_TRACK.md`. The latter remains the single living detailed continuity file for the Universal Language Track and may acquire newer implementation detail. **For any Universal Language change, both files must be read fully before editing.** Do not use confidence, memory, or familiarity as a reason to skip either file.

The track attacks the language/meaning seam from the opposite direction from canonical 42ndMind:

```text
natural language / math notation / code / other expression
                    <->
       universal mathematical relational structure
                    <->
                 reality
```

Its live state is approximately:

```text
U_(t+1) = F(U_t ⊕ X_(t+1))
U.whole = 1
```

The target is not an English dictionary, an embedding space, or a collection of opaque addresses. The target is a mathematical relational substrate in which the internal structure itself carries meaning. Surface dictionaries/parsers may be language-specific; the universal object is not. Exact translations/paraphrases should converge because they instantiate the same underlying relational structure.

An LLM, human, text, or other source may cheaply **propose** candidate relations or candidate mathematical anatomies. Proposal is not truth. Proposer confidence has no epistemic authority. Candidate structure must remain open to support, defeat, reopening, revision, splitting, merging, recursive reduction, and correction by formal/reality evidence.

The strongest long-run identity criterion is recursively reduced structural equivalence rather than a privileged relation alphabet:

```text
surface relation/object
 -> recursively expand warranted definitions
 -> retain undefined/circular remainder explicitly
 -> canonicalize anonymous structure
 -> compare structure-preserving normal forms
```

`relational-normal-form.js` is the existing generic recursive reduction/canonicalization mechanism. A relation may have a lower relational definition `R -> {R1,R2,...}` and those definitions may recurse. Arbitrary relation names, vertex names, and edge order do not determine identity. Cycles/undefined relations remain explicit unresolved terminals rather than being guessed away. Current operator alphabets are working bases, not metaphysically final primitives.

### Current bounded evidence — do not inflate

Current demonstrated bounded results include:

```text
broad mathematical encoding/address/correlation              54/56 and 83/88 bounded English regressions
grounded executable/state-transition mathematical anatomy   16/16 bounded families
Stone pole relational mathematical anatomy                  7/7
closed Stone recursive compilation                          7 anonymous structures
Empathy intervention/reality-contact bridge                 bounded renamed controlled worlds
corrigible O0..O10 motif proposals                          demonstrated
recursive relation reduction + canonical normal form        demonstrated
canonical Stone formal kernel -> anonymous math graph        demonstrated
richer thought/pragmatic intent candidate anatomy           13 distinct candidate structures
corrigibility for full anonymous mathematical graphs        demonstrated
bounded English -> live corrigible candidate math            13/13 through generic contrastive bridge; base F 10/13
generic mathematical type checking                          demonstrated on current candidate/Stone math
recursive nested mathematical content across 13 candidates  demonstrated through one live math-hypothesis authority
full arbitrary abstract/compositional intention anatomy     not demonstrated
all Stone structures grounded from unrestricted raw reality not demonstrated
universal mathematical language                             target, not established result
```

Never describe `54/56` or `83/88` as a percentage of English. The 13/13 English bridge result is bounded English attachment to proposer-supplied, corrigible candidate mathematics; it is not proof that those candidate anatomies are semantically true in reality. The base `F` result remains 10/13 and must not be rewritten as though `F` alone achieved 13/13.

The sixteen stronger grounded executable/state-transition families are:

```text
open, terminate/close, conceal, delete, copy, move, rename, create,
save, undo, enable, disable, increase, decrease, pause, resume
```

The thirteen richer assistant-proposed candidate families are:

```text
belief, doubt, consideration, imagination, memory, inference,
desire, intention, question, assertion, command, promise, obligation
```

They are structurally explicit and falsifiable but are still **candidate anatomies**, not independently reality-grounded semantic truth.

### Existing source-of-truth mechanisms

Do not add a new mechanism merely because a downstream component needs a capability that already exists elsewhere. First connect to the existing source of truth.

`relation-hypotheses.js` is the older corrigible ledger for anonymous O0..O10 motifs.

`math-hypotheses.js` is the current correction mechanism for full anonymous `universal-math-graph` candidate structures. It provides open/supported/defeated/contested/usable status, targeted evidence, incomplete-evidence preservation, complete support/counterevidence, subgraph support, candidate revision, replay of all stored evidence after revision, alpha-equivalent proposal merging, and the current source-expression/composition interface for any candidate that can participate in larger formulas. **For richer mathematical candidates, this ledger is the sole live corrigibility/status authority unless a later documented replacement explicitly supersedes it.**

`abstract-intent-kernel.js` contains the current 13 proposer-side candidate mathematical anatomies and generic composition-port proposals. These are scaffolding for proposing a candidate into the ledger, not a second semantic or correction authority.

`english-math-bridge.js` intentionally stores an opaque surface-relation reference -> opaque math-hypothesis ID and dereferences the current graph live from `math-hypotheses.js`; it does not freeze a copied math definition. Revision/defeat can therefore suspend an old English->math attachment, and later support can restore the revised math without reteaching English. This live-dereference design is an important precedent: **prefer one live authority over copied local truth.**

`recursive-intent-composition.js` follows the same rule. Recursive nodes store only an opaque math-hypothesis reference plus subject/content references. Every compilation dereferences the current usable hypothesis from `math-hypotheses.js`; the recursive state has no copied candidate definitions, no local `active` flags, and no local revision/status authority.

`universal-math-types.js` is the content-neutral mathematical type checker. It knows generic operator contracts, not Stone poles or semantic intent-family truth.

`universal-math-graph.js` provides the mathematical expression/graph substrate. `QUOTE(F)` turns a formula into first-class formula content and `EXTENSION(QUOTE(F),U)` turns the quoted formula relative to a universe into a proposition-set usable by an enclosing candidate anatomy. These are current generic operators, not claims of metaphysical finality.

### Stone inside the Universal Language Track

The current Philosopher's Stone paper is the canonical semantic source for Stone-specific work. Do not reconstruct Stone semantics from conversational memory when the paper already specifies them.

Canonical frame:

```text
q = entity
r = declared materially relevant referent/scope
Phi(q,r) = (x,y,z) in O_r
O_r = { (x,y,z) in R^3 : |x|+|y|+|z| <= 1 }
```

Coordinates are signed functions:

```text
x = Delta_(q,r)(Empathy, Practicality)      purpose
y = Delta_(q,r)(Answerability, Insulation) accountability
z = Delta_(q,r)(Wisdom, Knowledge)         meaning
```

Development is already inherent in the entity-referent relation:

```text
L1(q,r) = ||Phi(q,r)||_1 = |x|+|y|+|z|
```

`L1=0` is null, `0<L1<1` is developing orientation, and `L1=1` is stance, all relative to `r`.

Experience:

```text
L2(q,r) = ||Phi(q,r)||_2 = sqrt(x^2+y^2+z^2)
```

Realization changes the referent rather than introducing a radial scalar:

```text
r -> r'
Phi(q,r) -> Phi(q,r')
```

Do not use `r` as development. The older helper `delta(a,b)=(a-b)/(a+b)` / surface projection is only a bounded experimental projection and is not the canonical Stone evidence->coordinate rule.

The current Universal Language Stone kernel also preserves entity/referent/orientation, anonymous opposed pairs, the octahedral L1 bound, L1 development, L2 experience, null/interior/stance, realization, `L_perp=|x|+|z|`, `F_perp=sqrt(x^2+z^2)`, `L2^2=F_perp^2+y^2`, maturity/collapse, vertical sign regions, evidence-warranted region distinct from actual `Phi(q,r)`, contextual emphasis distinct from structural displacement, and surface decoding. This is mathematical serialization/equivalence, not an evidence->human-coordinate psychometric instrument.

### Recursive composition — result, failure, and resolved authority

PR #22 (merge `704f88f776553531096cdc9a42676935aaa37f07`) introduced generic type checking and the first bounded recursive mathematical composition. A clause may take another clause's full mathematical formula as first-class content. `belief(P)`, `belief(doubt(P))`, and `doubt(belief(P))` have distinct anonymous mathematical structure. Subject identity is structural while arbitrary renaming is irrelevant. The inner formula is embedded through `QUOTE`/`EXTENSION`, not by family name, string, hash, or frozen graph signature.

PR #24 (merge `9b952222cab07641a1e48abc4678ededfda00a9f`) generalized this recursive construction across all 13 current candidate anatomies, but also accidentally duplicated correction/status authority inside `recursive-intent-composition.js`: copied candidate templates, local `revision`/`active` fields, `reviseDefinition(...)`, and `setDefinitionActive(...)` existed beside the already-authoritative `math-hypotheses.js` ledger.

That defect was real. The PR #24 tests only proved the duplicate local correction mechanism worked; they did not prove that revision/defeat performed solely through `math-hypotheses.js` propagated into an already-existing recursive composition.

PR #26 repairs the implementation rather than leaving this as a future note. The architecture is now:

```text
one live math-hypothesis ledger
        |
        v
recursive nodes store only opaque hypothesis reference + subject/content references
        |
        v
compiler dereferences current live usable hypothesis mathematics
```

`math-hypotheses.js` now owns the current graph, status, revision, source expressions, and optional generic composition interface on one candidate record. `recursive-intent-composition.js` has no local semantic definition/status authority. A graph-only authoritative revision clears source/composition scaffolding rather than allowing stale templates to survive.

The repair regression drives **only** the upstream ledger. Across all 13 current candidates it revises through `reviseMath(...)`, verifies enclosing mathematical structure changes without editing the enclosing node, restores through the same ledger, and verifies the old enclosing structure returns. A complete targeted countercontact makes a candidate contested/unusable and automatically suspends enclosing composition; restoring support through the ledger recovers the old enclosing structure. No recursive-specific correction/status function participates.

The genuine recursive properties from PR #24 remain: full child-formula embedding, QUOTE/EXTENSION single-copy binding, nesting-order distinction, arbitrary-renaming invariance, same-vs-distinct subject identity, all-13 candidate composability, generic type validity, cycle rejection, zero semantic family labels in the pure graph, and bounded depth-six source construction/type checking. Do not overclaim depth-six exact canonical graph isomorphism; that remains a separate bounded computation.

The process failure that caused the defect remains important history: the assistant did not read the required repository memory before PR #24 even though it already named `math-hypotheses.js` as the richer-candidate correction mechanism. The repair does not erase that failure; it removes its runtime consequence and preserves the lesson below.

### Evidence discipline for this track

Keep these non-identities explicit:

```text
proposal != truth
encoding/address != mathematical anatomy
candidate anatomy != stabilized semantic equivalence
formal equivalence != empirical grounding
primer-grounded structure != autonomous discovery
controlled intervention grounding != unrestricted sensory grounding
formal Stone kernel != psychometric coordinate estimator
surface-language classifier != universal relational ontology
stable != metaphysically final
unknown != false
```

Names/dictionaries are teaching or display handles. They do not define mathematical identity.

### Mandatory pre-change repository recovery protocol

This protocol is **unconditional**. It is not triggered by uncertainty, because LLM confidence is not a reliable indicator of whether context has been lost.

Before **every architectural or semantic-mechanism change** in this repository:

1. Read the current `UNIVERSAL_LANGUAGE_TRACK.md` fully if the Universal Language Track is involved.
2. Read the current `AGENTS.md` fully.
3. Search the repository for the capability/invariant believed to be missing. Inspect relevant implementation, tests, checkpoint/design history, and the failure that introduced the mechanism.
4. Identify the current source of truth/authority for that capability.
5. Classify the proposed change before writing code as exactly one of: `reuse`, `connection`, `extension`, or `replacement`.
6. If a proposed change creates a second authority, copied semantic truth, parallel status flag, or replacement of an existing mechanism, stop unless the existing mechanism has first been shown inadequate by a preserved falsification/test.
7. Treat absence from the current conversation/context window as `unknown`, never as evidence of repository absence.
8. Preserve prior failures and regressions. Do not weaken a test merely because a new change conflicts with an old invariant unless the old test itself is demonstrated conceptually wrong.
9. After the change, add a regression proving that existing authority relationships and previously solved capabilities still work. For connection work, the test must drive the upstream authority itself, not a new downstream imitation of it.
10. Do not create additional continuity/handoff markdown files. `UNIVERSAL_LANGUAGE_TRACK.md` remains the single living detailed continuity file for the parallel track; `AGENTS.md` contains the hard cross-project rules and this baseline critical snapshot.

**Do not skip this protocol because the next change seems obvious, small, or familiar. Confidence is not a repository read.**

## Current active architecture

`one-mind.js` currently:

- retains every exact `perception_before -> motor -> perception_after` transition;
- exposes raw channel boundaries without world semantics;
- searches repeated simultaneous relations for shorter MDL descriptions;
- learns conjunction handles `§N` and recursively reuses them;
- keeps learned concept definitions cumulative inside `M` across recompressions;
- stores learned concepts sparsely as positive chunks rather than spraying true/false columns across all memory;
- evaluates sparse concepts wherever their grounded dependencies are knowable; elsewhere they remain undefined (`undefined != false`);
- learns/reuses relations in either direction;
- keeps equal-authority incompatible completions unresolved;
- permits partial perceptual contact and stores generic current relational completion in `M.current = {observed, completed, inferred, unresolved}`;
- can unfold a warranted learned concept back into its grounded definition and compress grounded terms bottom-up into learned handles;
- keeps generic current relational completion separate from motor authority;
- treats succession already present in experience as relational material and can compress recurring ordered structure into `§qN` chunks;
- uses open primitive pressures to recover motor action as a missing relational term when warranted;
- rejects a motor continuation if separately learned bodily evidence says it worsens another concern, without inventing an exchange rate;
- uses only nonsemantic physical motor variation when no grounded motor completion exists;
- incrementally refreshes learned evidence and periodically reopens exact accumulated experience for broader recompression;
- retains finite working descriptions relative to their referent rather than one global popularity list;
- when predictive warrant is tied, uses the ultimate base dependency footprint as a finite-retention tie-break so an inaccessible compressed alias cannot crowd out an equally warranted directly usable route; this does **not** generally penalize abstraction;
- contains `M.knowledge`, a first-class relational substrate with subject/relation/object terms, variables, explicit relation references, generic schema matching, recursive closure, provenance, and relation-about-relation representation;
- preserves distinct structured-contact occurrences inside the one `M`, including repeated identical content as separate occurrences, without eagerly materializing a memory/retrieval frontier;
- represents relation activity as a generic structural property so relational knowledge can alter the status of other relational knowledge without theorem-specific branches;
- seeds Stone and OneLogic as ordinary corrigible `M` content and allows later structured reality contact to add, refine, or defeat such relations.

Search/recompression/storage bounds are engineering constraints, not cognitive authority. Exact lived contact remains retained beneath them.

## Important falsification-driven corrections

1. A 200-contact run once produced perfectly equal action counts; lower friction was rejected as intelligence because it was fallback cycling. Grounded-action instrumentation was added externally.
2. One global pattern leaderboard erased unrelated valid relations; retention became referent-relative.
3. Fixed word-teaching order let temporal chunks predict labels; the semantic test randomized order instead of changing cognition.
4. `§` vocabulary was rebuilt from scratch each global recompression; persistent concepts were therefore impossible. Definitions now remain in `M`.
5. Persisting every concept as explicit true/false over every memory caused dimensional explosion; concepts became sparse positive chunks.
6. Sparse concepts initially lacked a comparison domain; they are now evaluable where their grounded dependencies are known, preserving `undefined != false` elsewhere.
7. Stored bidirectional semantic bridges were weaker than actual use; partial contact and generic `M.current` completion were added so learned relations can genuinely translate incomplete contact without a language-specific branch.
8. The first first-class-knowledge draft deactivated categorical schemas directly when a counterexample appeared. That passed tests but effectively smuggled T10 into `C`. It was rejected. The replacement makes T10 itself a relation in `M`; its self-defeat test proves the epistemic authority is in `M`, not generic machinery.
9. The first compositional language-school run exposed dependency-blind finite retention: an equally predictive context-dependent `§` handle could crowd out a directly usable relation because tie ordering ignored what base information was needed to reconstruct the antecedent. A first attempted fix globally charged compressed relations for reconstruction cost; that broke legitimate compound semantic grounding and was rejected. The accepted fix leaves predictive/compression authority unchanged and uses ultimate dependency count **only as a tie-break among equal predictive candidates**. The unchanged language-school test then passed.
10. **Universal Language context-loss / duplicate-authority failure (2026-10-16).** The repository already required reading project memory before changes and already documented `math-hypotheses.js` as the richer-candidate correction authority. The assistant failed to read those rules before PR #24, then added local recursive `revision/active` correction controls and described them as new capability. The user noticed the risk from context loss. Repository inspection confirmed the duplicate-authority defect. PR #26 removed the duplicate runtime authority and connected recursive composition to the live ledger. Preserve this failure permanently as a warning: subjective model confidence is never a valid trigger for whether repository recovery is necessary; recovery is mandatory before every architectural change.

11. **Canonical eager-history projection correction (2026-10-17).** PR #45 correctly preserved distinct structured occurrences but overreached by eagerly scanning `M.knowledge.episodes` after every structured contact and storing an `occurrence_frontier`. The user noticed the conceptual mistake: in the one-mind architecture, retained past contact is already inside `M`; a human-style retrieval step is not automatically required. A preserved falsification then showed the runtime still materialized that capability-shaped projection while the established canonical tests passed. The correction removed the eager frontier and lifetime scan while retaining exact occurrence identity/ordering. Future source/occurrence access must be derived only when a materially relevant relation requires it, preferably through local/incremental or rebuildable indexes with zero semantic/truth authority. **Persistence is fundamental; memory/retrieval is at most an emergent/query-relative description.**

## Frozen checkpoints

### A. Semantic grounding/stabilization

```text
63783369db66ff1640a48a7d80964af8d12161d1
checkpoint/semantic-grounding-2026-10-10
```

### B. Stronger semantic translation

```text
43bc2766263e627fcb76dc26350e6967239d0ce3
checkpoint/semantic-translation-2026-10-10
```

GitHub Actions run `38018168735`, job `114113049737`, passed all active regressions.

Verified semantic translation included:

```text
cat_semantic_symbol = §1
cat_semantic_definition = p1=1&p2=1
concept_to_english_reliability = 1
english_to_concept_reliability = 1
english_to_internal_translation = true
internal_to_english_translation = true
ambiguous_partial_contact_suspended = true
corrected_initial_false_grounding = true
semantic_specific_C_logic = false
```

The `cat`/`§1` pair above is only the historical test fixture, not a privileged part of the architecture.

### C. First-class seeded relational knowledge / no-cheat meta-relations

Tested code:

```text
bcadf9294dc13dda07a2522b044450e1493d08e7
checkpoint/first-class-knowledge-2026-10-10
```

GitHub Actions run `38021478963` passed every active gate at that checkpoint.

The structured-knowledge gate verifies:

```text
Stone/OneLogic seed exists as structured M content
relations can be subjects/objects of other relations
seeded T7 is usable by generic completion
seeded Stone maturity relation is usable
T10 can disable another categorical relation
T10 can be made to disable itself
once T10 is inactive, C no longer enforces T10-like behavior
```

### D. Bounded compositional language / dependency-aware retention — current strongest tested code

Exact tested code SHA:

```text
242bf79481d641a69691f8434dcabead432c8735
checkpoint/compositional-language-2026-10-10
```

Primary GitHub Actions run `38029514723`, job `114147310257`, passed:

```text
one-mind.test.js                 PASS
structured-knowledge.test.js     PASS
semantic-grounding.test.js       PASS
language-school.test.js          PASS
micro-world-single-life.js       PASS
```

The unchanged compositional schooling gate verified:

```text
experiences = 101
base_vocabulary = 9
later_taught_vocabulary = 3
total_tested_vocabulary = 12
held_out_base_sentences_read = 3
held_out_base_sentences_expressed = 3
never_seen_new_word_combination_read = true
never_seen_new_word_combination_expressed = true
ambiguous_partial_contact_suspended = true
C_language_specific_changes = false
```

The three later words `yellow`, `star`, and `jumps` were taught separately and never appeared together during schooling; the never-experienced combination `yellow star jumps` was then both read and expressed correctly.

The same code preserved the unchanged 96-contact embodied regression:

```text
survived = true
autonomous_steps_survived = 32
avg_friction = 31.49
babble_avg_friction = 47.6
grounded_motor_steps = 17
grounded_autonomous_steps = 13
```

This establishes bounded fixed-slot compositional language learning/generalization, not broad natural-language competence. See `CHECKPOINT_COMPOSITIONAL_LANGUAGE_2026-10-10.md` for the failure history and exact limitations.

## Current frontier

### Canonical 42ndMind

1. **Richer proposition/possibility representation.** The first-class relational substrate handles variables and meta-relations, but not yet arbitrary proposition objects, alternative live possibility sets, quantifiers, set-valued operations, or general negation/compatibility semantics.
2. **Full OneLogic inside M.** T1-T10 are represented, and some are operational, but remaining formal theorems should become executable only by extending generic representation enough to express their actual mathematics. Do not add theorem-specific solvers.
3. **Stone beyond seed schemas.** Current Stone knowledge is a structured leg-up, not a complete derivation engine for arbitrary judgment stance. Any fuller use must arise through the same relation substrate and reality contact.
4. **English beyond the fixed-slot compositional mini-language.** Variable-length expression, syntax induction, morphology, reference, negation, quantification, questions, discourse, and freer word order remain unproved. Tokenization may belong to `S`; semantics/grammar do not belong in `C`.
5. **Source/provenance learning.** Books/testimony must enter as claims-with-provenance, distinct from actuality. Source authority must become learned and referent-relative, not a hard-coded weight.
6. **Inquiry.** Partial/undefined contact is represented and ambiguous completion can remain unresolved. Materially relevant unresolved alternatives should eventually make discriminating contact itself a warranted continuation, without an explore module.
7. **Scaling.** The 96-contact micro-world remains expensive. Stable handles should reduce repeated search while retaining grounding for correction. Optimize indexes/local/incremental completion without changing semantic authority. Historical/source access must follow the same rule: do not scan the whole lifetime on every contact merely to imitate human retrieval.
8. **Temporal depth.** Synthetic ordered compression works, but final micro-world ordered structure is still shallow/unstable; mature foresight is not established.
9. **Abstract purpose/allotted costs.** Primitive pressures remain the only innate open concerns; higher purposes and grounded acceptance of local costs still need to emerge.
10. **Replication and long life.** Embodied agency remains bounded and sparsely replicated. The central ongoing experiment is still the same individual living longer under unchanged `C`, with periodic inspection of what relational structure stabilizes in `M`.

### Universal Language Track

The duplicate PR #24 corrigibility authority is resolved by PR #26; do not re-add local recursive correction/status state. Legitimate open fronts now include:

```text
independent reality/formal support for the 13 abstract candidate anatomies
stronger evidence that candidate decompositions are correct, not merely coherent
richer recursive composition across structurally different meanings using the one live authority
open questions beyond yes/no partitions
conditional/counterfactual belief and intention
categorical vs graded/probabilistic belief
permission/denial/normative authority
strong negation/quantification/modality anatomy
general action intention beyond the 16 bounded executable families
arbitrary compositional/discourse English
cross-language convergence into the same math structures
autonomous relation discovery without an LLM proposer
reality grounding of remaining Stone structures
unrestricted sensory grounding
exact evidence -> Stone-coordinate instrumentation
recursive reduction of the working math operator vocabulary itself
proof/disproof of a complete universal structural normal form
proof/disproof of universality for every possible meaning/relation
```

## Next legitimate sequence

1. Preserve all frozen checkpoints.
2. Obey the mandatory repository recovery protocol before any architecture change.
3. Keep the language-school failure history and the PR #24 duplicate-authority failure as regressions; do not restore dependency-blind retention, weaken held-out composition tests, or reintroduce downstream correction authority.
4. Extend the **same** first-class relation and live-hypothesis substrates only where a generic representational limitation is demonstrated, especially propositions, alternatives, live possibility sets, variable-length relational expression, and richer nested meaning.
5. Make more formal OneLogic content executable through that generic substrate rather than theorem-specific code.
6. Use the same substrate for source-mediated learning and richer language contact.
7. Make stable concepts and meta-relations cheap query-relative handles instead of repeatedly scanning the full lifetime.
8. Continue the existing single-life experiment for longer spans once scaling permits; inspect stabilization rather than adding cognitive modules.
9. After every generic change, rerun self-correction, no-cheat structured knowledge, semantic translation/composition, Universal Language anti-cheat/corrigibility, micro-world agency, temporal, and later multi-seed falsification.

Do not declare a capability proved because desired behavior appears once. Remove shortcuts, isolate the claim, and preserve earlier regressions.
