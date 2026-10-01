# Candidate theorem obligations

The following are the exact claims the executable lab is intended to attack.

## T1. Greatest sound categorical consequence

For nonempty `K`, define

`C(K) = {[q=v] : ∀m∈K, q(m) is defined and q(m)=v}`.

If a categorical rule `R` is sound over every live possibility in `K`, then `R(K) ⊆ C(K)`. Therefore `C` is the greatest sound categorical consequence set relative to the admitted query family.

## T2. Sharp sound update

For transition channel `T ⊆ M×O×M`, define

`U*(K,o) = {m' : ∃m∈K, (m,o,m')∈T}`.

Any posterior `U(K,o)` that is sound for every candidate `m∈K` capable of producing outcome `o` must satisfy `U*(K,o) ⊆ U(K,o)`. Therefore `U*` is the unique smallest sound posterior.

## T3. Reality preservation under faithful update

If actual pre-state `a∈K` and `(a,o,a')∈T`, then `a'∈U*(K,o)`.

## T4. Sound pooling

If `a∈K1` and `a∈K2`, then `a∈K1∩K2`, hence `K1∩K2 ≠ ∅`.

## T5. Contraction cannot repair excluded actuality

If `a∉K` and `K'⊆K`, then `a∉K'`.

## T6. Query-relative quotient minimality

Let `m ~Q n` iff every admitted query has the same definedness and value on `m,n`. The quotient `M/~Q` preserves all admitted query answers. Any representation that merges two different `~Q` classes fails to preserve at least one admitted query.

## T7. Model-class failure forces expansion

If `a∉M_t`, then no `K⊆M_t` contains `a`. Therefore correction confined to `M_t` cannot restore actuality.

## T8. Fallacy dominance for exact set-level reasoning

For an independently defined ideal set `I` and candidate `A`:

`UnsupportedExclusion(I,A) = I \ A`

`UnsupportedRetention(I,A) = A \ I`.

A reasoning state weakly dominates another when both of its deviation sets are subsets of the other's. The exact ideal `I` has zero deviation and therefore weakly dominates every candidate. If a candidate has any material deviation at all, `I` strictly dominates it.

For modeled inquiry specifically, the independently proved ideal is `U*(K,o)`. Any sound posterior must contain `U*(K,o)`, so a sound but non-exact posterior can only be inferior by retaining states the modeled reality-contact has already eliminated. Any posterior that excludes a member of `U*(K,o)` is unsound.

## T9. No overreach for universally sound categorical rules

If a categorical rule is universally sound across a nonempty live state, every value it asserts belongs to the invariant categorical consequence set. Therefore a universally sound categorical rule has no unsupported categorical assertion. It may still be incomplete by omitting a forced conclusion.

## T10. One counterexample defeats a categorical bridge

A premise-to-conclusion bridge is valid only when the premise is live-realizable and every live realization of the premise carries the conclusion. A single live world in which the premise holds and the conclusion fails proves the bridge invalid.

This theorem is intentionally content-neutral. An insult, personal criticism, source-reliability claim, or other premise is not a logical fallacy merely because of its wording. The logical question is whether the premise is being used as support for a conclusion and whether the required bridge is valid.

## Scope restrictions

These claims do not assert that every linguistic sentence denotes a Boolean proposition, that `M` is permanently complete, that defeasible preference is strict entailment, or that a finite agent can compute the entire semantic closure. Those stronger claims were rejected during adversarial analysis.
