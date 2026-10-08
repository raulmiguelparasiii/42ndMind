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

## Recursive self-development

The same compression operator is now tested recursively.

The rule is not extended with a separate "concept formation" or "promotion" mechanism. Instead, the shortest learned description for a bounded referent becomes part of the current mind-state. On the next compression pass, `C` can use that description exactly as it uses any other available relation:

```text
D_1 = C(E)
D_2 = C(E ∪ D_1)
D_3 = C(E ∪ D_1 ∪ D_2)
...
```

Equivalently, recursive development seeks the fixed point of the same operator over its own output:

```text
C*(E) = fixed-point reuse of C-produced descriptions as later C-input
```

The implementation prevents hidden circular prediction: a learned description cannot be used to predict a target when that description already depends on the same target.

The recursive test deliberately limits every learned rule to at most three active conditions.

Stage 1 presents repeated cases from which the system discovers a reusable two-condition description.

Stage 2 introduces a new four-condition regularity. Because the earlier learned description is already part of the mind, the same three-condition search can express the new relation by using the learned description as one condition. That higher relation then becomes reusable vocabulary itself.

Stage 3 introduces a six-condition regularity. The raw six-way conjunction is outside the search language by construction, but the system succeeds by using its own level-2 learned description plus two new conditions.

Thus the tested path is:

```text
raw experience
    -> learned relation D1
    -> D1 reused inside learned relation D2
    -> D2 reused inside learned relation D3
```

No rule was widened and no level-specific reasoning function was inserted between those stages.

This is the first computational demonstration in the repository that the one developmental law can make its own prior products into the representational material of later learning.

## Mature-heuristic interpretation

This matches the Stone's mature-heuristic logic structurally:

- accumulated experience need not be recomputed from zero;
- stable structure can be compressed and reused;
- materially relevant exceptions remain governing;
- a broader shortcut remains defeasible by a better-fitting conditional structure;
- the learned pattern does not become truth merely because it is efficient;
- exact unresolvedness remains unresolved until reality constrains it;
- prior learned structure can reduce the complexity of later judgment without becoming immune to correction.

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

GitHub Actions now verifies the original exact kernel, self-learning and refinement, recursive self-recompression, and the scaling stress suite.

Current verified behaviors include:

- repeated cases automatically induce a reusable conditional pattern without that pattern being named in code;
- later counter-cases reduce the authority of the coarse pattern rather than being discarded;
- a newly relevant condition is automatically discovered as a refined pattern;
- current-case prediction chooses the referent-relative shorter description rather than the historically broadest shortcut;
- heuristic prediction does not convert an unresolved fresh variable into exact truth;
- learned descriptions become inputs to later applications of the same compression law;
- a level-2 description was learned from a level-1 description;
- a higher relation requiring six raw conditions was learned despite a three-condition search limit by reusing the level-2 representation;
- circular self-prediction through learned symbols is rejected;
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
concept level
higher-order concept
conviction
empathy
```

The implementation still contains finite engineering search limits and a generic representation vocabulary for observed feature/value relations. Those are computational interfaces and bounds, not learned conclusions.

The next legitimate tests should continue in the same direction: do not add faculties. Increase the diversity and temporal depth of experience, then test what structures repeated recursive recompression can discover on its own and where the one law actually fails.
