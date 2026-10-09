# Stone + OneLogic innate guidance milestone

## Design decision
42ndMind is no longer philosophically blank. The project intentionally gives the developing mind two pieces of prior knowledge from the start:

- **Stone:** answerability to reality is the correct orientation. Real friction/pressure should be resolved through materially relevant reality-contact rather than hidden through insulation. Continued capacity for reality-contact is necessary for continued answerability.
- **OneLogic:** preserve undefeated possibilities, eliminate only what warranted reality-contact defeats, assert only what the live possibilities force, seek discriminating contact when unresolved, and reopen/expand representation when actuality defeats it. Defeasible action preference is not strict entailment.

These priors contain no micro-world semantics. The agent is not told what food, water, shelter, hazard, death, another agent, a key, a gate, or a good action are.

## Grounded primitive contact
The micro-world now exposes two primitive embodied contacts in addition to ordinary perception:

1. **friction** — a physical interoceptive signal produced by deviation from viable bodily conditions;
2. **continuity of reality-contact** — present while the embodied agent remains active and absent when the body has failed.

These are not a reward table. They do not identify which action should be taken. The agent must learn from its own action/consequence history which actions actually resolve pressure while preserving continued reality-contact.

## Endogenous agency
`innate-priors.js` uses the agent's own experienced transition history to maintain local live possibilities for the consequences of each primitive action.

When the relevant consequences are forced across the live set, the agent can act under strict answerability. When they are mixed but sufficiently grounded, it can use defeasible preference. When the outcome is unresolved, it chooses discriminating contact rather than fabricating certainty.

Action selection in `micro-world-guided.js` is therefore internal. The action is no longer sampled externally as motor babble.

## First result
The first single-world run was strongly positive: compared with motor babbling, the guided agent had fewer deaths, lower average and late friction, and a much longer uninterrupted life.

A five-world validation then exposed a weakness: immediate friction resolution was too short-sighted. It often lowered pressure while still drifting into poor longer-term trajectories.

The guidance was corrected so that:

- loss of continued reality-contact cannot be preferred as answerable while a live alternative remains;
- consequences are judged over short actually experienced trajectories rather than only the next frame;
- a reset after failed embodiment is not mistaken for a beneficial drop in friction.

## Current validated result
GitHub Actions run `37871962424` at functional commit `9ea7bbef6732cf4250389d6d78101ee34c929387` completed successfully together with all previous developmental and stress tests.

Across five 1,800-step worlds after the continuity/trajectory correction:

| Measure | Stone+OneLogic guided | Motor babble |
|---|---:|---:|
| Mean deaths | 4.2 | 5.0 |
| Mean friction | 98.42 | 106.00 |
| Mean late friction | 119.94 | 110.79 |
| Mean longest uninterrupted life | 520.8 | 563.4 |

The guided agent had fewer deaths in 3/5 worlds and a longer uninterrupted life in 3/5 worlds. Results remain heterogeneous: in two worlds it still entered worse long-horizon trajectories than babbling.

## What this establishes
This is the first point in the repository where all of the following are true simultaneously:

- the agent inhabits a persistent world;
- it receives primitive perception and embodied pressure;
- it learns action/consequence relations from its own history;
- it possesses Stone answerability and OneLogic as intentional innate guidance;
- it selects its own actions from that learned history;
- those actions measurably alter its developmental trajectory;
- no semantic reward table or externally sampled action source is used.

This is **primitive endogenous agency**, not yet a robust working mind.

## Current failure / next frontier
The remaining dominant failure is not lack of motivation or lack of action. It is insufficient **compositional foresight**.

The agent currently chooses mostly one primitive action at a time from local analogous experience. It can inspect a short historical continuation, but it does not yet construct and compare its own candidate multi-action futures from learned structure. Consequently, locally answerable choices can still compose into a poor longer trajectory.

The next legitimate step is to let Stone + OneLogic operate over short candidate action trajectories generated from the agent's own learned action/consequence structure:

- preserve multiple live possible futures rather than one predicted future;
- reject a categorical claim unless the live futures force it;
- prefer trajectories that preserve continued reality-contact and resolve real pressure when warranted;
- when futures remain unresolved, choose the action that provides the most discriminating reality-contact;
- revise the trajectory model when reality defeats it.

Do not add world-specific plans, reward values, survival scores, food-seeking rules, or hazard avoidance rules to make this look successful.
