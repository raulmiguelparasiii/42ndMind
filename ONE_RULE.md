# 42ndMind — tested one-rule kernel

## The rule

Let `L_t` be the complete ledger of experienced relations up to time `t`.
After one new reality-bearing relation `R_(t+1)`:

```text
L_(t+1) = L_t ∪ {R_(t+1)}

W_(t+1) = {
  w : every undefeated relation in L_(t+1) is satisfied by w
}

M_(t+1) = Δ(W_(t+1))
```

Initial state:

```text
L_0 = ∅
W_0 = {∅}
M_0 = Δ({∅}) = {[1]}
```

So the mind begins literally at numerical unit `1`.

`Δ(W)` is the full unit simplex over the complete states still compatible with experience. The kernel does not invent a probability distribution over unresolved alternatives.

## The numerical invariant

The tested invariant is not that every heterogeneous mental relation globally adds to `1`. Relations overlap and can describe the same reality at different resolutions, so that would double-count them.

The invariant is:

> Every admissible complete realization of the one mind has total mass `1`; uncertainty is represented by retaining the compatible unit-normalized solution space rather than inventing weights.

The whole remains `1` even while its internal relations become finer, conflict, or are corrected.

## Throttled exact representation

The semantic set `W` is no longer enumerated in memory.

The implementation stores one factored relational state:

- variables and their still-admissible values;
- undefeated experienced relations;
- conservative domain reductions;
- connected relational chunks;
- the correction/history ledger.

Disconnected chunks factor exactly. If

```text
W = W_1 × W_2 × ... × W_n
```

and a query touches only chunks in `J`, unrelated chunks do not need to be expanded. The query reopens only the connected relational structure capable of changing that answer.

This is the implemented throttling rule:

> Keep unrelated structure coarse; reopen the smallest connected structure required by the active relation; propagate constraints through that structure; leave the rest of the one mind unexpanded.

This changes representation, not truth conditions. A relation is still:

- `resolved_true` when every compatible complete state satisfies it;
- `resolved_false` when none satisfies it;
- `unresolved` when both satisfying and falsifying compatible states remain;
- `conflict` when the current undefeated relations admit no complete state.

## Emergence and reopening

No transitivity module is inserted.

If experience establishes only:

```text
x = y
y = z
```

then querying `x = z` resolves true because no compatible state can make the endpoints differ. A later reality contact such as `x = 1` propagates through the same shared relational chunk and resolves `y` and `z` accordingly.

If an incompatible interpretation enters the ledger, the one remains `1` but the active state becomes conflicting. A later correction may explicitly defeat that interpretation without deleting the original event; the event and the correction remain in the same history.

## Verified scaling result

GitHub Actions runs deterministic tests plus randomized and large-scale stress tests.

Latest verified run:

```text
random trials=500
derived checks=3050
locality checks=501
conflict/recovery checks=500
implicit worlds avoided=2^1000 independent + 2^160 pre-filter chain
```

All passed.

The `2^1000` test introduces 1,000 independent binary distinctions. The kernel keeps 1,000 coarse chunks; a one-variable query opens one variable and one chunk instead of enumerating the complete world space.

The 160-variable test links the variables through equality relations. The kernel derives equality between the first and last variables without an endpoint rule and without constructing the `2^160` raw assignments the original enumerating prototype would have generated before filtering.

## What this establishes

The tested finite kernel now has:

- one accepted mind state;
- one reality-update rule;
- numerical unit preserved;
- unresolved relations without invented probabilities;
- exact factoring of unrelated structure;
- query-relative reopening of relevant structure;
- implicit multi-step relational consequence;
- contradiction without identity loss;
- correction without erasing history.

No separate memory, empathy, conviction, language, attention, or reasoning authority is part of the kernel. If those phenomena belong in 42ndMind, they must be expressible as structures or recurrent organizations inside the same relational law.

## Remaining construction problem

The scaling bottleneck demonstrated by explicit world enumeration is removed for factorizable structure and locally queried finite constraint systems.

What is not yet constructed is automatic formation of reusable higher-order concepts from repeated lower-level relational patterns — the equivalent of learning a new chunk or schema rather than merely discovering which existing relations are connected. That next layer must preserve the same one-rule semantics; it cannot become a second cognitive authority.
