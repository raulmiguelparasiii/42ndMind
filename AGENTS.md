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
