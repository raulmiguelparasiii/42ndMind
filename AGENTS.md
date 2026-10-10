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

Stone, formal OneLogic, English, mathematics, books, source knowledge, etc. should ultimately live as **corrigible structured knowledge inside `M`**. They can give `M_0` a leg up, but later reality must still be able to refine or defeat them. Current `prior` strings are descriptive placeholders only, not operational knowledge.

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

Perceptual contact may now be partial: `null` means that perceptual channel was not contacted. It is undefined, not false. Concern channels remain explicit finite magnitudes.

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

## OneLogic / 42ndLogic

Do not confuse the first-principles prose summary with the formal system.

Summary:

> Preserve possibilities reality has not defeated; eliminate exactly what warranted contact defeats; assert only what survivors force; seek discriminating contact when unresolved; revise/expand representation when actuality no longer fits. Undefined is not false.

The separate `raulmiguelparasiii/42ndLogic` repo formalizes live possibility set `K`, strict categorical consequence, sharp update `U*`, actuality preservation, query-relative representation, model-class expansion, objective deviation, and counterexample defeat.

Notation warning: 42ndMind's `C(M⊕R)` is the whole developmental transformation. Formal OneLogic also uses `C(K)` for categorical consequence. They are not the same operator.

42ndMind is OneLogic-compatible in some current behaviors (counterevidence, unresolved rivals, partial/undefined contact, representation reopening), but formal OneLogic is **not yet represented inside `M` as first-class usable structured knowledge**. Do not claim otherwise.

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
- can unfold a warranted learned concept back into its grounded definition and can compress grounded terms bottom-up into learned handles;
- keeps generic current relational completion separate from motor authority;
- treats succession already present in experience as relational material and can compress recurring ordered structure into `§qN` chunks;
- uses open primitive pressures to recover motor action as a missing relational term when warranted;
- rejects a motor continuation if separately learned bodily evidence says it worsens another concern, without inventing an exchange rate;
- uses only nonsemantic physical motor variation when no grounded motor completion exists;
- incrementally refreshes learned evidence and periodically reopens exact accumulated experience for broader recompression;
- retains finite working descriptions relative to their referent rather than one global popularity list.

Search/recompression/storage bounds are engineering constraints, not cognitive authority. Exact lived contact remains retained beneath them.

## Important falsification-driven corrections

1. A 200-contact run once produced perfectly equal action counts; lower friction was rejected as intelligence because it was fallback cycling. Grounded-action instrumentation was added externally.
2. One global pattern leaderboard erased unrelated valid relations; retention became referent-relative.
3. Fixed word-teaching order let temporal chunks predict labels; the semantic test randomized order instead of changing cognition.
4. `§` vocabulary was rebuilt from scratch each global recompression; persistent concepts were therefore impossible. Definitions now remain in `M`.
5. Persisting every concept as explicit true/false over every memory caused dimensional explosion; concepts became sparse positive chunks.
6. Sparse concepts initially lacked a comparison domain; they are now evaluable where their grounded dependencies are known, preserving `undefined != false` elsewhere.
7. Stored bidirectional semantic bridges were weaker than actual use; partial contact and generic `M.current` completion were added so learned relations can genuinely translate incomplete contact without a language-specific branch.

## Frozen checkpoints

### A. Semantic grounding/stabilization

Code:

```text
63783369db66ff1640a48a7d80964af8d12161d1
checkpoint/semantic-grounding-2026-10-10
```

The mind formed `§1 := p1=1 & p2=1`, learned `§1 <-> external cat label`, preserved the definition, strengthened both directions, corrected deliberately false cat/cup grounding, and preserved micro-world learned agency.

### B. Stronger semantic translation — current strongest verified code

Code:

```text
43bc2766263e627fcb76dc26350e6967239d0ce3
checkpoint/semantic-translation-2026-10-10
```

GitHub Actions run `38018168735`, job `114113049737`, passed all active regressions.

Semantic output:

```text
stabilization_experiences = 95
correction_experiences = 79
active_patterns = 730
learned_symbols = 67
cat_semantic_symbol = §1
cat_semantic_definition = p1=1&p2=1
concept_to_english_support = 24
english_to_concept_support = 24
concept_to_english_reliability = 1
english_to_concept_reliability = 1
bidirectional_words = 4
english_to_internal_translation = true
internal_to_english_translation = true
ambiguous_partial_contact_suspended = true
corrected_initial_false_grounding = true
semantic_specific_C_logic = false
```

Post-learning probes used independent clones:

```text
English cat only -> §1=true, p1=1, p2=1
p1=1 & p2=1 only -> external cat label
p1=1 with p2 unknown -> no unsupported label
```

Synthetic correction on same commit:

```text
experiences = 50
patterns = 441
symbols = 43
order_rules = 5
order_max_depth = 2
corrected_action_seen = true
zero_motor_variants = 4
```

Micro-world on same commit, seed `420070`, development64 + autonomous32:

```text
steps = 96
survived = true
autonomous_steps_survived = 32
average friction = 31.49
babble average friction = 47.60
action counts = [16,12,13,12,10,13,10,10]
grounded motor steps = 17
grounded autonomous steps = 13
learned patterns = 1030
active patterns = 1028
learned symbols = 80
final ordered rules = 0
```

This proves only the bounded categorical claims above, not general English or AGI.

See `CHECKPOINT_TRANSLATION_2026-10-10.md`, `SEMANTIC_GROUNDING.md`, and `paper/REALITY_GROUNDED_SEMANTICS.md`.

## Current frontier

1. **First-class structured relational substrate.** Current categorical atoms/conjunctions/bridges are not enough for variables, propositions, alternative possibility sets, quantification, provenance, claims about claims, and especially relations about relations. This is now the central theoretical implementation problem.
2. **OneLogic and Stone inside M.** Represent their actual formal/structural content as corrigible `M` knowledge. Do not embed a OneLogic solver or Stone evaluator into `C`.
3. **English beyond labels.** Sentence order, composition, reference, grammar, and expression must emerge through the same relational substrate; tokenization may belong to `S`, but semantics/grammar do not belong in `C`.
4. **Source/provenance learning.** Books/testimony must enter as claims-with-provenance, distinct from actuality. Source authority must become learned and referent-relative, not a hard-coded weight.
5. **Inquiry.** Partial/undefined contact is now represented and ambiguous completion can remain unresolved. The next step is for materially relevant unresolved alternatives to make discriminating contact itself the warranted continuation, without an explore module.
6. **Scaling.** The strongest verified 96-contact micro-world took about 3m54s. It retained 80 concepts and >1000 patterns. Stable handles must eventually reduce repeated search while retaining grounding for correction. Optimize indexes/local/incremental completion without changing semantic authority.
7. **Temporal depth.** Synthetic ordered compression works, but final micro-world `ordered_rules=0`; mature foresight is not established.
8. **Abstract purpose/allotted costs.** Primitive pressures remain the only innate open concerns; higher purposes and grounded acceptance of local costs still need to emerge.
9. **Replication.** Embodied agency remains one bounded seed; multi-seed and longer-life testing is still required.

## Next legitimate sequence

1. Preserve both frozen checkpoints.
2. Design one generic first-class relational representation inside `M` that can express relations as terms, alternatives/partiality, provenance, propositions, and meta-relations without capability-specific C logic.
3. Use that same substrate to represent formal OneLogic and Stone as corrigible initial `M` knowledge.
4. Use the same substrate for richer English/text contact and source-mediated learning.
5. Make stable concepts cheap query-relative handles instead of repeatedly scanning the full lifetime.
6. After every generic change, rerun self-correction, semantic translation, micro-world agency, temporal, and later multi-seed falsification.

Do not declare a capability proved because desired behavior appears once. Remove shortcuts, isolate the claim, and preserve earlier regressions.
