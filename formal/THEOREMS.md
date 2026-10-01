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

## Scope restrictions

These claims do not assert that every linguistic sentence denotes a Boolean proposition, that `M` is permanently complete, that defeasible preference is strict entailment, or that a finite agent can compute the entire semantic closure. Those stronger claims were rejected during adversarial analysis.
