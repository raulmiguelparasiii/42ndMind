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
The mind is **not** philosophically blank anymore. The project owner explicitly wants two discovered/formalized pieces of guidance available from the start as a developmental leg-up rather than rediscovered from scratch:

1. **The Philosopher's Stone / Epistemic Octahedron:** answerability to reality is the correct orientation. Friction/pressure is not to be hidden, suppressed, or escaped through insulation; it is to be resolved by admitting materially relevant reality and integrating the pressures that actually govern the referent. Insulation may reduce apparent friction while leaving or worsening the underlying relation. Continued capacity for reality-contact is a prerequisite for remaining answerable.
2. **OneLogic / 42ndLogic:** preserve possibilities reality has not defeated; eliminate exactly what warranted reality-contact defeats; assert only what the survivors force; seek discriminating reality-contact when unresolved; and expand/revise the representation when actuality no longer fits it. Undefined is not false. Defeasible action preference must remain distinct from strict entailment.

Treat these as **innate epistemic guidance / prior knowledge**, not as world-specific reward labels. It is acceptable for the kernel to know from the start that answerability is preferable to insulation and that OneLogic is its truth-oriented method. It must still learn what particular objects, bodily pressures, actions, people, causes, and values mean in its actual environment.

## Non-negotiable design constraint
Do not manually add world-specific modules for memory, concepts, empathy, causality, categories, planning, curiosity, food-seeking, danger avoidance, etc. Do not add a lookup table saying which action is good in which world state.

The Stone and OneLogic are the permitted foundational guidance. They should govern how learned reality is handled and how unresolved pressure is approached. Engineering code may realize those priors and search/optimize the one developmental objective, but it should not smuggle in domain answers.

Prefer open developmental runs over deciding the next human-named capability in advance. Use isolated tests afterward to explain/falsify what emerged, and keep the regression suite to ensure later work does not break earlier invariants.

## Current progress
- Exact finite relational kernel with unresolvedness, contradiction, correction, and factored query-local reasoning.
- Reality-preserving minimum-description recompression creates reusable heuristics from repeated cases and refines them under counter-cases.
- Learned descriptions recursively become material for higher learned descriptions.
- Succession/order can be learned from update order itself; no `step1/step2` labels are required.
- First open run: 6,000 unlabeled binary contacts. The grammar grew/reorganized under two hidden environmental changes; final exact description was 579 units for 6,000 contacts, with learned structures grounding spans up to 92 contacts. See `OPEN_DEVELOPMENT.md`.
- Second open run: 9,000 unlabeled noisy scalar contacts. Reusable exact `basis + residual` descriptions spontaneously covered neighborhoods of multiple distinct readings and reorganized when hidden environmental bands shifted or a new band appeared. See `OPEN_SCALAR_DEVELOPMENT.md`.
- Complete micro-world exists in `micro-world.js`: spatial persistence, objects/resources, body needs, injury, shelter, gate/key dependency, day/night, weather, another agent, primitive signalling, delayed/changing consequences, and death/reset.
- Embodied open run `micro-world-open.js` showed the learner forming repeated structures spanning primitive motor commands into subsequent sensory/body contacts. See `MICRO_WORLD.md`.
- Stone + OneLogic are now implemented as innate guidance in `innate-priors.js`. The world exposes primitive embodied friction and continuity-of-reality-contact, not semantic rewards.
- `micro-world-guided.js` now closes the action loop: action selection is endogenous, based on the agent's own learned action/consequence experience plus the two innate priors. There is no food/hazard map, reward table, Q-value, or externally sampled motor policy.
- Five-world validation after continuity-aware, short-trajectory correction: guided mean deaths 4.2 vs motor-babble 5.0 and mean friction 98.42 vs 106.0. Guided had fewer deaths in 3/5 worlds. However late friction and longest-life results remain inconsistent across worlds. See `INNATE_GUIDANCE.md`.

## Current frontier
This is now beyond a passive developmental kernel: it has **primitive endogenous agency**. It can use learned consequences to choose actions on its own under answerability/OneLogic guidance.

It is still **not yet a robust working mind**. The present weakness is foresight/composition. The agent mostly selects one primitive action from local learned analogues. Short historical consequence windows help, but some worlds still trap it in locally answerable choices whose longer trajectory is poor.

The next major step is generic compositional foresight from its own learned action/consequence structure: compare short candidate action trajectories while preserving multiple live possible outcomes, prefer trajectories that maintain reality-contact and genuinely resolve pressure, and use discriminating inquiry when the futures remain unresolved. Do not insert world-specific plans or labels. This should be an application of Stone + OneLogic over learned structure, not a hidden domain planner.

The scalar tolerance frontier also remains, but robust foresight is currently the higher-priority milestone for crossing from proto-agency into a dependable primitive mind.

## User preference
Keep chat updates focused on progress and conclusions. Put technical detail and experimental notes in the repo rather than explaining implementation minutiae unless asked.
