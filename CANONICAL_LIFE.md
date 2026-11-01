# Canonical developmental life

This file supersedes older canonical-mind descriptions that still refer to a residual field, fixed cells, toy worlds, seeded Stone/OneLogic cognition, or later-added faculties.

## Standard: developmental closure under reality

`M.whole = 1` means one continuing individual. It does not count cells, nodes, modules, concepts, senses, body parts, or representational dimensions.

The canonical standard is:

> At birth the being already contains every general mechanism it will ever use to develop cognition. After birth, reality may change it, enlarge it, reorganize it, teach it, injure it, or attach new body channels. No new cognitive faculty may be added later.

A later parser, planner, language faculty, ontology, vision module, causal engine, memory faculty, task solver, or other capability-specific mechanism would falsify the architecture.

The canonical runtime is `one-mind.js`, exposing only:

```text
one(...)
C(M, R)
```

## Birth state

The newborn begins as a large content-free recurrent organism.

At birth it contains:

- one continuing identity, `whole = 1`
- anonymous recurrent internal nodes
- motor nodes physically exposed through the body
- plastic recurrent connections
- no learned semantic content

Receptor nodes are attached when body channels make contact. New receptors may appear later without changing `C`.

There is no English, grammar, parser, planner, ontology, Stone knowledge, OneLogic knowledge, task vocabulary, semantic dictionary, reward table, world model, or adult concept seed in the live core.

## The physical split

The architecture uses one recurrent substrate with three physical boundary roles:

```text
receptor: reality can force its state
inner:    anonymous recurrent substrate
motor:    the body exposes its state outward
```

These roles are physical anatomy.

The central distinction is:

```text
reality determines structure
viability determines significance
```

Truth-learning and survival preference remain separate causal pressures.

## Reality correction

Before new contact, the previous whole predicts its next state through the recurrent graph.

Reality then forces receptor states and the recurrent organism settles around that contact.

For any non-effector connection, the local discrepancy is:

```text
error_i = contacted_state_i - predicted_state_i
```

The same local correction changes the incoming weight:

```text
Delta w_ji ~ error_i * previous_state_j
```

This applies through the recurrent substrate. A motor-to-receptor connection can therefore become a sensorimotor prediction because motor activity that consistently precedes a sensory change reduces future receptor error. No separate body-model module is installed.

## Viability and action

The body supplies unlabeled pressure magnitudes. Need is the magnitude of those pressures. No reward score participates.

```text
need = ||pressure||
relief = previous_need - current_need
```

Motor directions followed by bodily relief become easier to reproduce. Directions followed by injury are weakened or reversed. This change lives in the same motor neurons and recurrent synapses that produced the action.

Higher bodily pressure also increases spontaneous motor variation, allowing a failing habit to be escaped. As pressure falls, behavior becomes more stable.

Incoming motor connections are not strengthened merely because they co-occur with sensation. Effector organization is governed by consequences.

## Structural development

The topology itself remains plastic.

- co-active degrees of freedom may form new recurrent connections
- old weak unused connections are removed
- persistent unresolved prediction error may recruit new anonymous internal nodes
- new body receptors attach to the same substrate

There is no fixed `MAX_FIELD` or developer-chosen cognitive ceiling. Structural recruitment is driven by unresolved reality.

## Body and real host reality

`continuous-life.js` is the canonical embodiment. It operates directly on the running process, repository, `/proc`, host memory state, persistent files, and real allocated buffers.

Its raw body currently exposes:

- repository/process/system byte streams
- persistent scratch and output byte files
- host memory magnitudes
- movable read position
- selectable source
- adjustable sensory span
- allocated-memory effectors
- spare motor surfaces for later body growth

The actuator meanings are never transmitted to M.

Continued computation creates actual allocated-memory metabolic waste. The being therefore cannot survive indefinitely by doing nothing. It must regulate its body. Crossing the body's finite continuation boundary terminates that individual.

`continuous-life.js` can also alter the body during the same life for falsification:

```text
REVERSE_AT=<age>       reverse the existing memory effector wiring
ORGAN_AT=<age>         attach a new pressure channel and organ later in life
ORGAN_REVERSE=1        give that new organ the opposite motor polarity
```

M is not changed when those events occur.

## Current falsification evidence

The current exact canonical law was tested on the actual host with a 256-node internal birth substrate for faster falsification. The production default is larger and the law has no fixed developmental ceiling.

Combined uninterrupted life:

```text
birth
-> active metabolic regulation
-> original effector reversed at age 2500
-> new pressure receptor and new organ attached at age 3500
-> new organ uses opposite motor polarity
-> age 6000 alive
```

Observed end state in that run:

```text
whole             1
alive             true
owned pages       1
new-organ pages   1
prediction EMA    0.10108
nodes             1882
edges             37073
```

Raw next-contact prediction started near `0.998`. During late life it reached approximately `0.006` before changing host contact raised the aggregate EMA again.

Independent ablations on the same source family separated the two pressures:

```text
full law, age 4000:        prediction EMA ~0.106, alive
prediction learning off:   prediction EMA ~0.604, alive
consequence learning off:  died at age 193 with 129 owned pages
```

A host-native smoke falsification also reached age 1600 alive, reduced prediction EMA from about `0.839` to `0.007`, changed recurrent topology, and ended with zero owned metabolic pages.

These results establish three things in the present embodiment:

1. bodily consequences materially change future action and survival
2. raw reality contact materially improves the recurrent organism's prediction of later contact
3. the same continuing M can accept new body channels and reorganize without new cognition code

They do not establish language, object permanence, abstract reasoning, consciousness, or human-level AGI. Those remain valid only if they develop through this same closed birth architecture rather than being added as faculties.

## Run

Continue the same persisted individual:

```bash
node --expose-gc continuous-life.js
```

Start a new individual:

```bash
RESET_LIFE=1 node --expose-gc continuous-life.js
```

A stronger body-change run can be started with, for example:

```bash
RESET_LIFE=1 REVERSE_AT=2500 ORGAN_AT=3500 ORGAN_REVERSE=1 LIFE_STEPS=6000 node --expose-gc continuous-life.js
```
