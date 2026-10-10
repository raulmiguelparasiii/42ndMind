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

Raw numeric/categorical contact is substrate, not meaning. `§N` is an arbitrary internal handle; its meaning is its recursively grounded definition and relational position.

Desired architecture:

```text
English / other expression
          <->
reality-grounded internal relational language
```

Words must not receive meaning from a dictionary hidden in `C`. English is an expression surface that can attach to independently grounded meanings. `M` should be able to use its internal relational language without translating every cognition into English.

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
- contains `M.knowledge`, a first-class relational substrate with subject/relation/object terms, variables, explicit relation references, generic schema matching, recursive closure, provenance, and relation-about-relation representation;
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

### C. First-class seeded relational knowledge / no-cheat meta-relations — current strongest verified code

Code before this documentation-only update:

```text
bcadf9294dc13dda07a2522b044450e1493d08e7
```

GitHub Actions run `38021478963`, job `114123219304`, passed every active gate:

```text
one-mind.test.js                 PASS
structured-knowledge.test.js     PASS
semantic-grounding.test.js       PASS
micro-world-single-life.js       PASS
```

The new structured-knowledge gate verifies:

```text
Stone/OneLogic seed exists as structured M content
relations can be subjects/objects of other relations
seeded T7 is usable by generic completion
seeded Stone maturity relation is usable
T10 can disable another categorical relation
T10 can be made to disable itself
once T10 is inactive, C no longer enforces T10-like behavior
```

The unchanged 96-contact embodied regression also passed, so the first-class knowledge substrate did not break the existing learned-action path.

This checkpoint proves only those bounded representational and corrigibility claims. It does not prove full formal OneLogic execution, general reasoning, general English, or AGI.

## Current frontier

1. **Richer proposition/possibility representation.** The first-class relational substrate now handles variables and meta-relations, but not yet arbitrary proposition objects, alternative live possibility sets, quantifiers, set-valued operations, or general negation/compatibility semantics.
2. **Full OneLogic inside M.** T1-T10 are represented, and some are operational, but the remaining formal theorems should become executable only by extending generic representation enough to express their actual mathematics. Do not add theorem-specific solvers.
3. **Stone beyond seed schemas.** Current Stone knowledge is a structured leg-up, not a complete derivation engine for arbitrary judgment stance. Any fuller use must arise through the same relation substrate and reality contact.
4. **English beyond labels.** Sentence order, composition, reference, grammar, and expression must emerge through the same relational substrate; tokenization may belong to `S`, but semantics/grammar do not belong in `C`.
5. **Source/provenance learning.** Books/testimony must enter as claims-with-provenance, distinct from actuality. Source authority must become learned and referent-relative, not a hard-coded weight.
6. **Inquiry.** Partial/undefined contact is represented and ambiguous completion can remain unresolved. Materially relevant unresolved alternatives should eventually make discriminating contact itself a warranted continuation, without an explore module.
7. **Scaling.** The 96-contact micro-world remains expensive. Stable handles should reduce repeated search while retaining grounding for correction. Optimize indexes/local/incremental completion without changing semantic authority.
8. **Temporal depth.** Synthetic ordered compression works, but final micro-world ordered structure is still shallow/unstable; mature foresight is not established.
9. **Abstract purpose/allotted costs.** Primitive pressures remain the only innate open concerns; higher purposes and grounded acceptance of local costs still need to emerge.
10. **Replication and long life.** Embodied agency remains bounded and sparsely replicated. The central ongoing experiment is still the same individual living longer under unchanged `C`, with periodic inspection of what relational structure stabilizes in `M`.

## Next legitimate sequence

1. Preserve all frozen checkpoints.
2. Extend the **same** first-class relation substrate only where a generic representational limitation is demonstrated, especially propositions, alternatives, and live possibility sets.
3. Make more formal OneLogic content executable through that generic substrate rather than theorem-specific code.
4. Use the same substrate for source-mediated learning and richer language contact.
5. Make stable concepts and meta-relations cheap query-relative handles instead of repeatedly scanning the full lifetime.
6. Continue the existing single-life experiment for longer spans once scaling permits; inspect stabilization rather than adding cognitive modules.
7. After every generic change, rerun self-correction, no-cheat structured knowledge, semantic translation, micro-world agency, temporal, and later multi-seed falsification.

Do not declare a capability proved because desired behavior appears once. Remove shortcuts, isolate the claim, and preserve earlier regressions.
