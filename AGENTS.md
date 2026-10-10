# 42ndMind project memory

Read this fully before changing the project.

## Goal

Build one developing artificial mind from one compact reality-governed developmental law rather than a collection of hand-written cognitive faculties.

```text
M_(t+1) = C(M_t ⊕ R_(t+1))
```

`M` is one whole (`whole = 1`): the individual's currently organized relational state. `R` is new reality-contact. `C` is the content-neutral developmental transformation that preserves contact, discovers/reuses relations, recompresses them, completes warranted missing terms, and reopens structure under counterevidence.

The intended endpoint is a standalone self-growing mind whose understanding remains answerable to reality. Language, concepts, identity, attention, planning-like behavior, foresight, social understanding, and other recognizable faculties must arise as structures in `M`, not as separate authorities beside `C`.

## Hard distinction: C versus M

**No cheating C.** `C` must remain content-neutral. Do not add capability-specific logic to it because the mind "needs" language, OneLogic, Stone judgment, source weighting, planning, goals, or some world skill.

`C` is how the mind changes. `M` is what the mind currently contains and understands.

The user's preferred architecture is that the Philosopher's Stone, formal OneLogic, English, mathematics, books, and other advanced prior knowledge should ultimately live as **corrigible structured knowledge inside `M`**. They may give the developing mind a leg up, but reality must still be able to refine or defeat them. Hard-coding OneLogic or the Stone as an immutable special reasoning engine inside `C` would prevent the mind from genuinely correcting those claims.

The current `prior` strings in `one-mind.js` are descriptive placeholders only; they are not yet an operational structured representation of Stone or formal OneLogic.

## Reality interface

The mind law is not its receptors or actuators. A surrounding embodiment/interface may provide:

```text
W --S--> R --C(M⊕R)--> M' --A--> W'
```

`S` is inward transduction only. `A` is outward actuation/expression only. Neither may decide what a relation means or what is true.

Primitive embodiment may supply:
- a finite set of motor possibilities;
- distinct perceptual channel boundaries;
- distinct interoceptive concern/pressure magnitudes.

The mind is not told the world meaning of those channels. Arbitrary percept values remain literal/categorical unless the physical interface itself warrants stronger structure. Never subtract/rank arbitrary codes merely because they are numeric.

Interoceptive pressure channels are explicitly magnitude-valued, so `after < before`, `=`, and `>` are legitimate experienced physical relations. They are not rewards and are not Stone coordinates.

## Stone / Epistemic Octahedron

Stone geometry is the reality-relative structure of judgment, not a reward space:
- `+x` Empathy / `-x` Practicality
- `+z` Wisdom / `-z` Knowledge
- `+y` Answerability / `-y` Insulation
- top `(0,1,0)` = Maturity/full Answerability
- bottom `(0,-1,0)` = Collapse/full Insulation
- equator `y=0` = prejudice structurally

Stone signs are signed orientations of cognition toward reality, **not** good/bad outcome signs. Do not convert bodily improvement/worsening into Stone coordinates.

Knowledge is warranted actuality/contact. Wisdom is expected to be closely related to OneLogic: what may legitimately be concluded, preserved, rejected, left unresolved, investigated, or represented differently from that knowledge. Empathy/Practicality concern materially relevant concern and real finite constraint, but must not become hand-written modules or scalar utilities.

Do not assign a numerical Stone stance merely because the axes are known. A stance must be derived from the actual cognitive relations to the referent.

## OneLogic / 42ndLogic

Do not confuse the prose summary with the formal system. The prose first-principles description is:

> Preserve possibilities reality has not defeated. Eliminate exactly what warranted contact defeats. Assert only what the survivors force. Seek discriminating contact when unresolved. Expand/revise representation when actuality no longer fits. Undefined is not false.

The separate `raulmiguelparasiii/42ndLogic` repository contains the formal architecture: live possibility set `K`, strict categorical consequence, sharp update `U*`, actuality preservation, query-relative representation, model-class expansion, objective deviation, and counterexample defeat.

Notation warning: 42ndMind's `C(M⊕R)` is the whole developmental transformation; formal OneLogic also uses `C(K)` for categorical consequences. They are related ideas but not the same operator.

Current 42ndMind behavior is OneLogic-compatible in several places (counterevidence, unresolved rivals, representation reopening), but formal OneLogic has **not yet been represented inside `M` as usable structured knowledge**. Do not claim otherwise.

## Purpose as an open reality-relative relation

Purpose must not be installed as reward, goal variable, success flag, planner, or action policy.

A concern stays open while the reality-relation it concerns remains unsatisfied. A route may be defeated while the underlying concern survives. Nominal acquisition does not equal satisfaction. The cat example that exposed this: the adult-cat route was rejected because distrust/time cost defeated that continuation, while the wanted cat-life concern remained open; the later kitten actually satisfied the concern, so the old cat-seeking pull closed.

For primitive bodily pressures only, nonzero pressure is an open embodied concern and zero is absence by interface definition. The minimal closure relation is `less` of that same magnitude, not because `less = reward`.

Experienced action and consequence belong to one relation. The same learned relation may be used in either direction: action can imply consequence, or a presently relevant consequence can leave action as the missing term. This is relation completion, not a separate planner.

Working formulation:

> Cognition is continuous completion, correction, and recompression of open relations with reality.

## Language / semantics hypothesis

Language is treated broadly as compressed reality-grounded relational structure, not merely interpersonal signal convention.

Raw numeric/categorical contact is substrate, not meaning. A learned symbol such as `§1` is only an arbitrary handle; its meaning is its recursively grounded relational definition and position among other relations.

English should ultimately be one expression/communication surface attached to independently grounded meanings:

```text
English word <-> stabilized internal relation
```

The mind should be able to use the internal relational language without translating every cognition into English. Other languages can in principle attach to the same relation. Natural-language words must not get their meaning from a dictionary hidden in `C`.

## Non-negotiable implementation constraints

The **active cognitive runtime must be one thing**: `one-mind.js`.

Its public cognitive interface remains only:

```text
one(...)
C(M, R)
```

It must not delegate cognition to historical helper files such as `one-rule.js`, `recursive-recompression.js`, or `sequence-recompression.js`.

Do not add:
- planner / action policy / Q-learning / tree search / reward maximization;
- hidden future simulator;
- language module, semantic dictionary, scene classifier, or word-specific C rules;
- hand-written memory, concept, empathy, causality, category, curiosity, food-seeking, or danger-avoidance faculty;
- success replay or privileged success/failure labels;
- scalar utility combining distinct concerns;
- Pareto selector or least-observed exploration as a substitute for learned relation completion;
- numerical Stone valence on ordinary physical changes;
- global popularity/leaderboards that erase valid referent-relative relations.

When a benchmark fails, change the generic relation/compression machinery only when the failure demonstrates a generic structural defect. Preserve failures rather than manufacturing success.

## Current active architecture

`one-mind.js` is self-contained and has no cognitive `require()` dependencies. It currently:
- retains every exact `perception_before -> motor -> perception_after` transition;
- exposes supplied perceptual channels without world semantics;
- exposes only legitimate ordinal change on explicitly magnitude-valued concern channels;
- searches repeated simultaneous relations for MDL-shorter descriptions;
- learns conjunction handles `§N` and can recursively reuse them as later representational material;
- keeps learned concept definitions **cumulative inside `M` across later global recompressions**;
- represents learned concepts sparsely: the positive handle appears where its grounded definition occurs instead of adding explicit false values to every memory;
- treats a sparse concept as evaluable wherever the primitive/base relations required by its definition are known, while it remains undefined outside that domain (`undefined != false`);
- treats succession already inherent in `M_t -> M_(t+1)` as available structure and can compress recurring event order into `§qN` chunks;
- predicts learned relations in either direction;
- keeps equal-authority incompatible completions unresolved;
- uses open primitive concerns to recover action as a missing relational term when grounded;
- prevents an action from gaining authority by hiding another learned bodily relation it worsens, without an invented exchange rate;
- uses only nonsemantic physical motor variation when no grounded motor completion exists;
- incrementally refreshes existing relation evidence after every contact;
- periodically reopens the exact accumulated record for broader recompression;
- retains finite descriptions relative to their target/referent rather than one global top-N list.

The finite search, recompression schedule, and storage bounds are engineering constraints, not cognitive authorities. Exact lived contact remains beneath them.

## Important failures that shaped the architecture

1. An earlier 200-contact micro-world run had exactly equal action counts `[25,25,25,25,25,25,25,25]`. Lower friction was rejected as evidence of intelligence because action was still fallback cycling. This motivated explicit external grounded-action measurement.
2. A global top-pattern list allowed unrelated easy relations to erase action-relevant relations. Retention became referent-relative.
3. In the first semantic test, fixed teacher ordering let temporal chunks predict word labels. The test was corrected by randomizing presentation order instead of changing cognition.
4. Learned `§` vocabulary was originally rebuilt from scratch on each global recompression. That contradicted the requirement that `M` actually accumulate and stabilize concepts, so learned definitions now persist in `M`.
5. Persisting every learned concept as a true/false feature across every historical sample caused vocabulary growth to expand the whole lifetime. Concepts are now sparse positive chunks.
6. Sparse concept absence was initially treated as unevaluable everywhere, preventing word->concept relations from getting a comparison class. Concepts are now evaluated over the domain where their underlying grounded definition is knowable, preserving `undefined != false` outside that domain.

These are generic representation corrections. None adds English meanings, Stone judgments, or OneLogic rules to `C`.

## Frozen verified semantic checkpoint — 2026-10-10

Authoritative tested code commit:

```text
63783369db66ff1640a48a7d80964af8d12161d1
```

Convenience branch:

```text
checkpoint/semantic-grounding-2026-10-10
```

The commit passed one GitHub Actions job containing all three active falsification layers.

### Self-correction regression

```text
experiences = 50
patterns = 441
symbols = 43
order_rules = 5
order_max_depth = 2
corrected_action_seen = true
zero_motor_variants = 4
```

### Semantic grounding/stabilization regression

External test interface used arbitrary categorical word codes and four simple world relations. Presentation order and irrelevant context were varied. The mind had one motor possibility and zero pressure, so action policy/reward cannot explain the relation.

The clean learner formed:

```text
§1 := p1=1 & p2=1
```

and developed both:

```text
§1 -> external English label 101 ("cat" in the test interface)
external English label 101 -> §1
```

After further life, the same concept definition survived and both directions strengthened.

Verified output:

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
corrected_initial_false_grounding = true
semantic_specific_C_logic = false
```

A separate continuous correction life first received a deliberately false cat/cup pairing, then sustained correct contact. The corrected cat-world relation became the stronger active grounding; the stale false bridge did not retain equal-or-greater authority.

This is a bounded toy categorical result. It establishes that an arbitrary external label can become bidirectionally related to a reusable world-grounded internal relation and stabilize/correct without language-specific `C` logic. It does **not** yet establish grammar, compositional language, source reasoning, or general natural-language understanding.

See `SEMANTIC_GROUNDING.md` for the protocol and claim limits.

### Same-commit micro-world regression

Seed `420070`, 64 protected developmental contacts + 32 autonomous contacts:

```text
steps = 96
survived = true
autonomous_steps_survived = 32
average friction = 31.49
babble average friction = 47.60
terminal friction = 111
terminal pressures = [0,0,111,0]
action counts = [16,12,13,12,10,13,10,10]
grounded motor steps = 17
grounded autonomous steps = 13
learned patterns = 1030
active patterns = 1028
learned symbols = 80
final ordered rules = 0
```

The richer cumulative vocabulary therefore preserved and slightly increased grounded motor continuation in this bounded seed relative to the previous version (15 total / 11 autonomous). Lower friction remains supportive, not proof by itself.

Signal instrumentation also observed 3 grounded signal-1 emissions, 2 during the autonomous phase, but this does not establish language or intentional communication.

## Current frontier

The checkpoint is not human-level or general intelligence. The main unresolved work is:

1. **Structured knowledge substrate.** Current flat categorical channels and conjunction handles are not yet a sufficiently general representation for variables, propositions, quantified/alternative possibilities, theorem structure, provenance, and formal OneLogic/Stone knowledge to live naturally inside `M`. This is now the central theoretical implementation problem.
2. **OneLogic/Stone inside M.** Replace inert descriptive prior strings with actual correction-open relational knowledge that generic `C` can use. Do not hard-code a OneLogic solver or Stone evaluator into `C`.
3. **English beyond labels.** Extend ordinary reality contact toward sequences, compositional relations, reference, and expression while keeping word meanings grounded in the internal relational language. Do not add a language faculty.
4. **Partial/undefined contact and inquiry.** A general mind must represent incomplete contact without equating absent information with false. Discriminating inquiry should emerge when unresolved alternatives become materially relevant.
5. **Source/provenance reasoning.** Books/testimony should enter as claims with provenance. Source authority must become a learned referent-relative relation, not a hard-coded weight.
6. **Computational scaling.** At only 96 micro-world experiences the cumulative mind retained 80 symbols and more than 1,000 patterns; that run still took about two minutes. Stabilized concepts should eventually become cheap handles that reduce repeated raw search while preserving grounding for reopening.
7. **Temporal depth.** The synthetic test demonstrates ordered compression, but the final micro-world snapshot still has `ordered_rules = 0`. Do not claim mature foresight yet.
8. **Abstract purpose and allotted costs.** Primitive pressure concerns are still the only innate open concerns, and current rejection of any separately learned worsening relation is too strict for grounded allotted trade-offs. Higher purposive structure must emerge rather than be supplied by scalar utility.
9. **Replication.** Embodied grounded agency is still one bounded seed. Multi-seed and longer-life tests are required before strong behavioral claims.

## Next legitimate work

Proceed in this order unless new falsification changes the structure:

1. preserve the frozen semantic checkpoint;
2. design a **generic structured relational representation inside `M`** capable of expressing partial alternatives, propositions/relations, provenance, and recursively grounded definitions without adding capability-specific `C` logic;
3. represent formal OneLogic and Stone knowledge in that substrate as corrigible initial `M`, not as immutable code in `C`;
4. use the same substrate for English/text contact so English can map to/from stable internal relations;
5. improve incremental/local recompression so cumulative concepts reduce rather than explode computation;
6. rerun correction, semantic, micro-world, temporal, and multi-seed falsification after every generic change.

Do not declare a capability proved because the desired behavior appears once. Require an isolated falsification test that removes obvious shortcuts, then ensure earlier regressions remain intact.

## User preference

Keep chat updates focused on progress and conclusions. Put implementation detail and experimental notes in the repo unless asked. The user cares more about objective structural correctness than conversational reassurance.
