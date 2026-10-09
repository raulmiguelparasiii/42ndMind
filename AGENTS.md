# 42ndMind project memory

Read this before changing the project.

## Goal
Build one developing artificial mind from one compact reality-governed developmental law rather than a collection of hand-written cognitive faculties.

Core developmental form:

```text
M_(t+1) = C(M_t ⊕ R_(t+1))
```

`M` remains one whole (`whole = 1`). `R` is new reality-contact. `C` recompresses accumulated reality while preserving what grounds it. Learned structure may be reopened or reorganized when later reality makes a better description possible.

## Foundational prior knowledge — intentional exception
The mind is **not** philosophically blank. Two discovered/formalized pieces of guidance are intentionally available from the start:

1. **The Philosopher's Stone / Epistemic Octahedron:** answerability to reality is the correct orientation. Friction/pressure is not to be hidden, suppressed, or escaped through insulation; materially relevant pressures must be integrated rather than allowing one to hide another. Continued capacity for reality-contact is a prerequisite for remaining answerable.
2. **OneLogic / 42ndLogic:** preserve possibilities reality has not defeated; eliminate exactly what warranted reality-contact defeats; assert only what survivors force; seek discriminating reality-contact when unresolved; expand/revise representation when actuality no longer fits it. Undefined is not false.

Stone axes are signed **cognitive relations toward reality**, not reward signs or good/bad outcome labels:
- `+x` Empathy / `-x` Practicality
- `+z` Wisdom / `-z` Knowledge
- `+y` Answerability / `-y` Insulation

Do not convert ordinary bodily improvement/worsening into a Stone coordinate. A physical or perceptual change is reality-contact. Its relevance to concern, purpose, knowledge, wisdom, practicality, and answerability is a further cognitive relation and must not be smuggled in as primitive valence.

Practicality is reality's finite constraint relation: time, distance, energy, irreversibility, opportunity cost, and other real limits make exhaustive firsthand trial impossible. It is not a separate planner or utility module.

## Primitive embodiment boundary
The embodied test world may supply the mind with primitive interfaces that an organism must physically have before learning can occur:
- a finite set of available motor commands;
- ordinary perceptual contact;
- distinct interoceptive concern/pressure magnitudes produced by its own body.

The mind is not told the world meaning of those channels (food, water, shelter, danger, etc.). Interoceptive concern magnitudes are **not rewards** and are **not Stone coordinates**. Their distinction from ordinary perception is intentional embodiment, analogous to a body having internal-state sensing rather than learning from scratch that it has a body.

## Success criterion
The intended endpoint is a self-growing human-like mind whose structure develops from the one law and whose reasoning can exceed ordinary human judgment by remaining consistently answerable to reality through the Stone and OneLogic.

The Stone is available to the mind itself as the structure of reality-relative judgment, not merely as an external evaluator. OneLogic is the Wisdom relation of that structure: it governs what may be concluded, what must remain unresolved, when correction is required, and when further reality-contact is warranted. Inquiry provides informational grounding where Knowledge is insufficient. Purposive relations must arise within the same Stone structure from embodied concern under real constraint, so increasingly distant continuation, foresight, and other higher capacities can emerge from learned relations rather than from a separate planner.

Memory, concepts, categories, attention, causality, foresight, planning-like behavior, curiosity, language, social understanding, and other recognizable faculties are expected descriptions of structures that may emerge inside `M`; they are not separate authorities to add beside `C`.

The micro-world is a falsification arena for this claim. Strong or eventually dominant performance should arise because the mind developed better reality-grounded structure. Do not improve scores by adding world-specific survival knowledge, semantic action rules, reward shaping, privileged state labels, or a hand-written cognitive shortcut.

The final mind must be standalone. No LLM, external reasoner, hidden cognitive controller, or human intervention may supply its live reasoning once it is running.

## Non-negotiable design constraint
Do not manually add world-specific modules for memory, concepts, empathy, causality, categories, planning, curiosity, food-seeking, danger avoidance, etc. Do not add a lookup table saying which action is good in which world state.

**There must not be a separate planner/action-policy faculty.** Understanding and continuation are one state. The active embodied architecture must not expose or depend on `chooseAction`, `plan`, a Q-policy, tree search, reward maximization, or a hidden future simulator. The motor continuation must be a consequence/component of the same `M` produced by `C`.

The Stone and OneLogic are permitted foundational guidance. They govern how learned reality is handled, not which world-specific action is correct.

Important anti-cheat constraints learned on 2026-10-09:
- Do not manually mark a sequence that ended in relief as "successful" and replay it later. That supplies the very purposive faculty the mind is supposed to develop.
- Do not encode bodily change as a Stone sign. Stone signs are orientations of cognition toward reality.
- Do not assign generic numeric meaning to arbitrary sensor codes. Some perceptual channels are categorical/bit-coded; arithmetic difference is meaningful only where the primitive interface actually supplies a magnitude.
- Do not collapse distinct concerns into a weighted utility merely to force a decision. If reality has not supplied a trade-off relation, keep the trade-off unresolved.

Prefer open developmental runs over deciding the next human-named capability in advance. Use isolated tests afterward to explain/falsify what emerged, and keep regressions to ensure later work does not break earlier invariants.

## Current progress
- Exact finite relational kernel with unresolvedness, contradiction, correction, and factored query-local reasoning.
- Reality-preserving minimum-description recompression creates reusable heuristics from repeated cases and refines them under counter-cases.
- Learned descriptions recursively become material for higher learned descriptions.
- Succession/order can be learned from update order itself; no `step1/step2` labels are required.
- Open binary and noisy-scalar developmental runs demonstrated self-created reusable structure and reorganization under environmental change.
- Complete micro-world exists in `micro-world.js`: spatial persistence, objects/resources, body needs, injury, shelter, gate/key dependency, day/night, weather, another agent, primitive signalling, delayed/changing consequences, distinct embodied pressures, and irreversible death after development.
- A protected developmental phase is allowed in single-life tests: the same individual remains under real pressure but cannot suffer irreversible failure while it is still dependent. There is no reset or cross-life memory transfer.
- The former `innate-priors.js` path demonstrated endogenous agency but contained explicit `findReliefPlan`, `prospectAction`, and `chooseAction` machinery. That is architecturally wrong and historical only.
- A later experiment manually marked experienced relief-spans as reusable "purposive continuations." It was rejected as cheating and removed; its improved score is not evidence for emergence.
- A subsequent experiment encoded pressure reduction/increase as `+1/-1` and called that a Stone signed relation. That interpretation was wrong and has been removed.
- `one-mind.js` is the active embodied path. Its public interface is only `one` and `C`. New contact is integrated into the same relational state and `motor` is part of the resulting `M`.
- Active embodied experience is now represented as actual `perception_before -> motor -> perception_after` contact. Raw perception remains raw. The only arithmetic delta retained is on explicitly magnitude-valued interoceptive concern channels, and that delta is an ordinary physical relation, not valence or a Stone coordinate.
- There are no active scene signatures, pressure bands, runway bands, named success/failure outcome classes, delayed consequence horizons, success-sequence stores, or cognitive mode labels in `one-mind.js`.
- When an available motor has no grounded consequence relation, OneLogic keeps it unresolved and further reality-contact is used rather than treating missing evidence as defeat.
- When all available motors have grounded immediate concern-consequence relations, the active prototype compares them only by component-wise dominance. This prevents one concern from being silently traded away through an invented scalar utility. If several remain non-dominated, the relation remains unresolved and further contact is used.
- `one-mind.test.js` fails if the removed embodied scaffolds are reintroduced by their former names and still rejects planner-style public APIs.
- `micro-world-single-life.js` executes `mind.motor` directly; no external action selector participates in the mind loop.

## Current frontier
The active embodied path is now intentionally austere. This is preferable to a high-scoring system whose cognition was secretly authored.

The current sensorimotor representation is still shallow: whole raw percepts are retained and immediate concern consequences can be compressed, but the mind has not yet demonstrated that it can recursively create the reusable perceptual distinctions, longer temporal relations, causal structure, purposive structure, or foresight needed to master the micro-world.

The next work should therefore strengthen the **same generic recompression/developmental relation**, especially its ability to form reusable structure from raw simultaneous and ordered contact. Do not restore scene extraction, hand thresholds, temporal credit assignment, a successful-sequence store, planner, reward function, or foresight module to make the benchmark easier.

Do not assign a numerical Stone stance to a cognition merely because the axes are known. A numerical stance must be derived from the actual cognitive relations to the referent; otherwise it is another authored label.

If viability falls after scaffolding removal, preserve the failure. The lower score is more informative than a cheated success.

## User preference
Keep chat updates focused on progress and conclusions. Put implementation detail and experimental notes in the repo unless asked.
