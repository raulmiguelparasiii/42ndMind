# 42ndMind — tested one-rule kernel

## One developmental law

The kernel now uses one developmental law:

```text
M_(t+1) = C(M_t ∪ {R_(t+1)})
```

`R_(t+1)` is the next reality-contact. `C` is reality-preserving recompression of the one accumulated mind.

The finite implementation realizes `C` as a minimum-description search:

```text
choose reusable relational descriptions that minimize

    description(patterns) + description(experience | patterns)

while retaining every undefeated experienced case and every residual exception.
```

In compact mathematical form:

```text
C(E) = argmin_D [ L(D) + L(E | D) ]
```

subject to the requirement that `D` plus its residuals reconstruct the experienced record rather than deleting inconvenient cases.

This is the important architectural point: the kernel is **not** given a separate rule saying "form a heuristic", "refine a heuristic", or "be mature". Repetition becomes a reusable pattern only when representing it that way compresses accumulated reality-contact. A deviation remains in the residual history. If an additional condition explains the deviation well enough, the more specific conditional description becomes the cheaper representation relative to that referent.

## Exact truth remains separate from heuristic compression

Compression does not become a second source of truth.

Let `L_t` be the undefeated reality-relation ledger. Exact truth conditions remain:

```text
W_t = {
  w : every undefeated relation in L_t is satisfied by w
}

M_t = Δ(W_t)
```

Initial state:

```text
L_0 = ∅
W_0 = {∅}
M_0 = Δ({∅}) = {[1]}
```

So the mind begins literally at numerical unit `1`.

A learned pattern may guide attention or expectation, but it cannot remove a compatible possibility from `W_t`. Only reality-bearing relations can do that.

This prevents a frequent shortcut from turning itself into certainty merely because it is familiar.

## Numerical invariant

The tested invariant is not that every heterogeneous mental relation globally adds to `1`. Relations overlap and can describe the same reality at different resolutions, so that would double-count them.

The invariant is:

> Every admissible complete realization of the one mind has total mass `1`; unresolvedness is represented by retaining the compatible unit-normalized solution space rather than inventing weights.

The whole remains `1` while its internal relations become finer, conflict, compress, reopen, or are corrected.

## Throttled exact representation

The semantic set `W` is not enumerated in memory.

The implementation stores one factored relational state:

- variables and still-admissible values;
- undefeated experienced relations;
- conservative domain reductions;
- connected relational chunks;
- the correction/history ledger;
- automatically learned reusable descriptions of repeated bounded cases.

Disconnected exact chunks factor. Queries reopen only connected structure that can affect the answer.

The heuristic learner follows the same throttle principle. For small bounded referents it searches conjunctions exhaustively; larger feature spaces cap active conjunction size as a computational search budget. That cap changes search coverage, not the meaning or authority of a learned pattern.

## Self-learned heuristic emergence

A bounded historical case can enter as a sample such as:

```text
{ attentive_early: true, controlling_later: true }
```

The code is not told a dating rule. Each sample is translated into the same relation ledger as a bounded namespaced referent.

When repeated positive cases are contrasted with repeated negative cases, the compression search can discover:

```text
attentive_early = true
    -> controlling_later = true
```

because that reusable conditional description encodes the observed history more cheaply than treating every case independently.

The learned relation is explicitly defeasible. It is an expectation/attention structure, not an exact truth constraint.

## Automatic refinement under counter-cases

The tests then introduce counter-cases and an additional observed condition:

```text
attentive_early = true
respects_boundaries = false
    -> controlling_later = true

attentive_early = true
respects_boundaries = true
    -> controlling_later = false
```

The original coarse pattern remains reconstructible and now records exceptions. The kernel independently discovers the more specific condition because it compresses the detailed cases better.

A first attempt ranked patterns only by total historical bits saved. That failed a test: a broad old pattern could remain globally popular even when a narrower pattern described the present referent better.

The corrected one-rule implementation therefore applies the **same description-length law relative to the current bounded referent**. Among patterns that actually match the present case, it prefers the description with the shorter predictive code. This lets a sufficiently grounded conditional refinement defeat a broader shortcut without installing a separate "specificity" authority.

Laplace smoothing prevents a tiny perfect sample from being treated as certainty.

## Mature-heuristic interpretation

This now matches the Stone's mature-heuristic logic structurally:

- accumulated experience need not be recomputed from zero;
- stable structure can be compressed and reused;
- materially relevant exceptions remain governing;
- a broader shortcut remains defeasible by a better-fitting conditional structure;
- the learned pattern does not become truth merely because it is efficient;
- exact unresolvedness remains unresolved until reality constrains it.

So "mature heuristic" is not a manually inserted faculty in 42ndMind. It is a possible emergent form of reality-preserving compression under the one developmental law.

## Existing exact emergence and correction

No transitivity module is inserted.

If experience establishes only:

```text
x = y
y = z
```

then querying `x = z` resolves true because no compatible state can make the endpoints differ.

If incompatible interpretations enter the ledger, the mind remains `1` while the exact state becomes conflicting. A later correction may defeat an interpretation without deleting the original event; both the event and correction remain in history.

## Verified results

GitHub Actions now verifies the original exact kernel, the self-learning cases, and the scaling stress suite.

Current verified behaviors include:

- repeated cases automatically induce a reusable conditional pattern without that pattern being named in code;
- later counter-cases reduce the authority of the coarse pattern rather than being discarded;
- a newly relevant condition is automatically discovered as a refined pattern;
- current-case prediction chooses the referent-relative shorter description rather than the historically broadest shortcut;
- heuristic prediction does not convert an unresolved fresh variable into exact truth;
- all original contradiction/recovery tests continue to pass;
- 500 randomized exact-growth trials continue to pass;
- the factored kernel still avoids explicit `2^1000` independent-world enumeration;
- the 160-variable connected-chain inference still works without raw `2^160` pre-filter enumeration.

## What is and is not hand-coded

Hand-coded primitive:

```text
preserve reality-contact and recompress the accumulated relational history under one description-length objective
```

Not hand-coded as cognitive authorities:

```text
memory
heuristic
mature heuristic
specific dating rule
exception handling rule
schema authority
attention authority
conviction
empathy
```

The implementation does contain finite engineering search limits and a generic representation vocabulary for observed feature/value relations. Those are computational interfaces and bounds, not learned conclusions.

The next legitimate test is therefore not to add another faculty. It is to see how far the same self-compression law can build higher-order representations whose own learned structures become the features of still higher relations, recursively, without changing the developmental law.
