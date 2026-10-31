# Canonical infant core

The canonical 42ndMind is one persistent individual, `M`, beginning with no learned relations or adult knowledge.

```text
M.whole = 1
need(M) = 1 - viability(M)
want(M) = need(M)
M' = C(M, R)
```

`whole = 1` means all retained experience and learned relation belongs to one continuing being. It is not a collection of agents or cognitive modules.

## Birth state

`one(actionCount)` creates the smallest live state currently used by the project:

- one identity (`whole = 1`);
- a finite primitive action surface supplied by embodiment;
- viability initially at `1`;
- no need and no want while fully viable;
- no sensations yet;
- no experience;
- no learned relations.

There is no seeded language, Stone, OneLogic, planner, reward table, goal list, ontology, semantic dictionary, world model, or task solver in the canonical mind.

## Reality contact

Reality enters as:

```text
R = { sense: [...raw primitive values...], viability: v }
```

with `0 <= v <= 1`.

The external world/body determines `v`. M cannot declare itself healthy. At `v = 0`, the same individual can no longer continue.

The live deficit is:

```text
need = 1 - v
want = need
```

`want` is therefore endogenous to the current state of the being. It is not an external reward signal.

## Development

When M acts and later receives reality again, it retains the lived relation:

```text
(raw situation, primitive action) -> change in this being's viability
```

The relation begins nonexistent and is created only by lived consequence. Repeated experience updates the same relation. There are no hand-authored semantic categories and no automatic transfer from one raw situation to a different one.

When want is positive:

1. if M has lived an action in the present raw situation that increased its viability, it can reuse that action;
2. otherwise it tries an action whose consequence in this situation is still unknown;
3. if every action has been tried and all appear harmful, it uses the least harmful relation it has actually lived.

The developmental target is to add richer generic relation formation only when continued life exposes a representational failure. Do not add adult faculties as separate modules.

## Canonical life harness

`continuous-life.js` supplies a deliberately tiny external world. Existing costs viability. Two raw situations exist, and a different primitive action helps in each. M is never told that mapping. It must discover it from its own consequences.

The harness persists:

- `state/canonical-mind.json`
- `state/canonical-world.json`
- `state/life-report.json`

Legacy canonical states from the earlier architecture are not loaded into this infant core. Git history preserves them.
