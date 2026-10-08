# 42ndMind — tested one-rule kernel

## The rule

Let `L_t` be the complete ledger of experienced relations up to time `t`.
Let each relation declare only the finite variables/domains it actually introduces and the tuples it permits.
Let a later relation be able to explicitly defeat an earlier interpretation without deleting that earlier event from the ledger.

After receiving one new relation `R_(t+1)`:

```text
L_(t+1) = L_t ∪ {R_(t+1)}

W_(t+1) = {
  w ∈ Π_v D_v(L_(t+1)) :
  every undefeated relation in L_(t+1) is satisfied by w
}

M_(t+1) = Δ(W_(t+1))
```

`Δ(W)` is the full unit simplex over the surviving complete states `W`.
The system does **not** choose an arbitrary point inside that simplex.

Initial state:

```text
L_0 = ∅
W_0 = {∅}
M_0 = Δ({∅}) = {[1]}
```

So the mind begins literally at unit `1`.

## What numerical `1` means after testing

The viable form of the intuition is not:

```text
weight(memory) + weight(empathy) + weight(language) + ... = 1
```

Heterogeneous and overlapping relations can refer to the same underlying reality, so globally summing them double-counts the same state.

The invariant that survives testing is stronger and cleaner:

> Every admissible complete mathematical realization of the one mind has total mass `1`; unresolvedness is represented by retaining the whole compatible simplex instead of inventing a probability distribution.

Therefore:

- a mutually exclusive exhaustive partition sums to `1`;
- overlapping relations are not falsely treated as pieces of one scalar budget;
- unexperienced alternatives remain unresolved;
- a relation is resolved true when every surviving world satisfies it;
- resolved false when no surviving world satisfies it;
- otherwise it remains unresolved;
- contradiction is visible when no complete world survives;
- correction can restore coherence by defeating an interpretation while retaining the original event and correction trace in the same ledger.

## Emergence test

The kernel is not given a transitivity module.

If experience establishes only:

```text
x = y
y = z
```

then querying `x = z` resolves true because it holds in every surviving complete state. The relation emerges from the shared state rather than from an inserted `x=z` rule.

The same mechanism propagates a later reality-contact about `x` through `y` and `z`.

## Test result

GitHub Actions verifies both deterministic examples and randomized recursive growth.

Latest recorded stress:

```text
trials=1000
derived checks=5998
unit-sum checks=2000
conflict/recovery checks=1000
```

All passed.

## What this establishes

This is a working finite mathematical proof-of-concept of the one-kernel idea:

- one state;
- one state-transition rule;
- numerical unit preserved;
- no invented probabilities for unknown relations;
- new dimensions introduced only by experience;
- simple relations compose into more complex consequences implicitly;
- contradiction remains visible;
- correction does not require erasing history;
- no separate memory, empathy, conviction, language, or reasoning modules are required by the kernel itself.

Those higher concepts are not assumed here. If 42ndMind is correct, they must eventually be expressible as relational structures inside the same rule.

## Boundary

The current implementation enumerates finite domains explicitly. That is suitable for falsifying the core mathematics but not yet an efficient implementation of an open-ended mind.

Scaling the representation must preserve this exact semantics rather than replace it with heuristic modules or arbitrary weights.
