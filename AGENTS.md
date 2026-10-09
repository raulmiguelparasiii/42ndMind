# 42ndMind project memory

Read this before changing the project.

## Goal
Build one developing artificial mind from one compact reality-governed law rather than a collection of hand-written cognitive faculties.

Core developmental form:

```text
M_(t+1) = C(M_t ⊕ R_(t+1))
```

`M` remains one whole (`whole = 1`). `R` is new reality-contact. `C` recompresses accumulated reality while preserving what grounds it. Learned structure may be reopened or reorganized when later reality makes a better description possible.

## Non-negotiable design constraint
Do not manually add modules for memory, concepts, heuristics, attention, empathy, causality, temporal reasoning, categorization, planning, curiosity, reward, survival, food-seeking, danger avoidance, etc. If those are legitimate, expose the same developmental law to richer reality and see whether they emerge. Engineering code may search/optimize the one objective, but it must not become a second cognitive authority.

Prefer open developmental runs over deciding the next human-named capability in advance. Use isolated tests afterward to explain/falsify what emerged, and keep the regression suite to ensure later work does not break earlier invariants.

## Current progress
- Exact finite relational kernel with unresolvedness, contradiction, correction, and factored query-local reasoning.
- Reality-preserving minimum-description recompression creates reusable heuristics from repeated cases and refines them under counter-cases.
- Learned descriptions recursively become material for higher learned descriptions.
- Succession/order can be learned from update order itself; no `step1/step2` labels are required.
- First open run: 6,000 unlabeled binary contacts. The grammar grew/reorganized under two hidden environmental changes; final exact description was 579 units for 6,000 contacts, with learned structures grounding spans up to 92 contacts. See `OPEN_DEVELOPMENT.md`.
- Second open run: 9,000 unlabeled noisy scalar contacts. Reusable exact `basis + residual` descriptions spontaneously covered neighborhoods of multiple distinct readings and reorganized when hidden environmental bands shifted or a new band appeared. Final state had 23 active bases; all covered multiple values and 11 covered at least five. See `OPEN_SCALAR_DEVELOPMENT.md`.
- Complete micro-world now exists in `micro-world.js`: spatial persistence, objects/resources, body needs, injury, shelter, gate/key dependency, day/night, weather, another agent, primitive signalling, delayed/changing consequences, and death/reset.
- Embodied open run `micro-world-open.js` showed the existing learner forming repeated structures spanning primitive motor commands into subsequent sensory/body contacts. By step 200 all eight primitive actions were represented in learned action/consequence structure. See `MICRO_WORLD.md`.

## Current frontier
This is still **not a working mind**.

The decisive missing loop is endogenous agency. The embodied run used external motor babbling. The mind can organize what happened after actions, but does not yet use its own learned organization to decide what action/reality-contact to pursue next.

Do not solve this by installing a reward table, explicit survival utility, planner, RL policy, curiosity module, or hand-written good/bad action labels. The next experiment is whether the same compression/developmental law can use its learned action/consequence structure to generate/select action on its own. If pure compression yields pathological repetition, passivity, or death, preserve that failure and treat it as evidence about the law rather than hiding it with an extra objective.

The scalar tolerance frontier also remains: local tolerant descriptions often over-partition broad regions. Do not manually merge them. But agency is now the higher-priority milestone because it separates the developmental kernel from a primitive working mind.

## User preference
Keep chat updates focused on progress and conclusions. Put technical detail and experimental notes in the repo rather than explaining implementation minutiae unless asked.
