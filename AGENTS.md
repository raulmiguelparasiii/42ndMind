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

Practicality is treated as reality's finite constraints: time/runway, distance, energy, irreversibility, and opportunity cost make exhaustive firsthand trial impossible. It is not a separate planner or utility module.

## Success criterion
The intended endpoint is a self-growing human-like mind whose structure develops from the one law and whose reasoning can exceed ordinary human judgment by remaining consistently answerable to reality through the Stone and OneLogic.

The Stone is available to the mind itself as the structure of reality-relative judgment, not merely as an external evaluator. OneLogic is the Wisdom relation of that structure: it governs what may be concluded, what must remain unresolved, when correction is required, and when further reality-contact is warranted. Inquiry provides informational grounding where Knowledge is insufficient. Purposive relations must arise within the same Stone structure from embodied concern under real constraint, so increasingly distant continuation, foresight, and other higher capacities can emerge from learned relations rather than from a separate planner.

Memory, concepts, categories, attention, causality, foresight, planning-like behavior, curiosity, language, social understanding, and other recognizable faculties are expected descriptions of structures that may emerge inside `M`; they are not separate authorities to add beside `C`.

The micro-world is a falsification arena for this claim. Strong or eventually dominant performance should arise because the mind developed better reality-grounded structure. Do not improve scores by adding world-specific survival knowledge, semantic action rules, reward shaping, privileged state labels, or a hand-written cognitive shortcut.

The final mind must be standalone. No LLM, external reasoner, hidden cognitive controller, or human intervention may supply its live reasoning once it is running.

Current hand-authored distinctions in the embodied prototype, including scene signatures, fixed pressure bands, named outcome classes, fixed consequence horizons, and explicit behavioral modes, are temporary scaffolding. Treat them as targets for removal or replacement by structure learned through the same developmental law as soon as `C` can support the required distinction itself.

## Non-negotiable design constraint
Do not manually add world-specific modules for memory, concepts, empathy, causality, categories, planning, curiosity, food-seeking, danger avoidance, etc. Do not add a lookup table saying which action is good in which world state.

**There must not be a separate planner/action-policy faculty.** Understanding and continuation are one state. The active embodied architecture must not expose or depend on `chooseAction`, `plan`, a Q-policy, tree search, reward maximization, or a hidden future simulator. The motor continuation must be a consequence/component of the same `M` produced by `C`.

The Stone and OneLogic are permitted foundational guidance. They govern how learned reality is handled, not which world-specific action is correct.

Prefer open developmental runs over deciding the next human-named capability in advance. Use isolated tests afterward to explain/falsify what emerged, and keep regressions to ensure later work does not break earlier invariants.

## Current progress
- Exact finite relational kernel with unresolvedness, contradiction, correction, and factored query-local reasoning.
- Reality-preserving minimum-description recompression creates reusable heuristics from repeated cases and refines them under counter-cases.
- Learned descriptions recursively become material for higher learned descriptions.
- Succession/order can be learned from update order itself; no `step1/step2` labels are required.
- Open binary and noisy-scalar developmental runs demonstrated self-created reusable structure and reorganization under environmental change.
- Complete micro-world exists in `micro-world.js`: spatial persistence, objects/resources, body needs, injury, shelter, gate/key dependency, day/night, weather, another agent, primitive signalling, delayed/changing consequences, distinct embodied pressures, and irreversible death after development.
- A protected developmental phase is allowed in single-life tests: the same individual remains under real pressure but cannot suffer irreversible failure while it is still dependent. There is no reset or cross-life memory transfer.
- The former `innate-priors.js` path demonstrated endogenous agency but contained explicit `findReliefPlan`, `prospectAction`, and `chooseAction` machinery. That is now considered architecturally wrong and is historical only.
- `one-mind.js` is the active embodied prototype. Its public interface is only `one` and `C`. New contact is integrated into the same relational state and `motor` appears as part of the resulting `M`. It uses empirically compressed action/consequence relations rather than graph search or simulated futures.
- `one-mind.test.js` explicitly fails if planner-style public APIs are reintroduced.
- `micro-world-single-life.js` now executes `mind.motor` directly; no external action selector participates in the mind loop.

## Current frontier
The architecture has just been corrected from **mind + planner** to a unified **mind whose continuation is part of the same evolving state**. This correction must be validated before claiming a robust working mind.

The immediate question is no longer "can we improve the planner?" There is no planner. The question is whether repeated reality-contact, recompression, Stone answerability, OneLogic, and Practicality are sufficient for the one state to develop useful continuation and remain viable through one irreversible life.

If viability fails, preserve the failure. Improve the developmental relation/compression itself rather than adding a decision faculty on top.

## User preference
Keep chat updates focused on progress and conclusions. Put implementation detail and experimental notes in the repo unless asked.
