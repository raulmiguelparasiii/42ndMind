# Checkpoint — grounded mathematical intent anatomy — 2026-10-15

## Scope

This checkpoint belongs to the narrower `universal-language.js` track, not to the canonical `one-mind.js` developing-mind runtime.

Primary implementation merge:

```text
0a20d58ad799518cef896549e28c64409605d062
```

Wider grounded-anatomy coverage merge:

```text
7e029824a81291f7bb827686be2228693fb2144f
```

Primary anti-cheat implementation run:

```text
38779150370
```

Wider grounded-anatomy run:

```text
38780573779
```

The wider run passed:

```text
anti-cheat-language.test.js          PASS
wide-opaque-english.test.js          PASS
wide-opaque-english-2.test.js        PASS
mathematical-intent.test.js          PASS
wide-mathematical-intent.test.js     PASS
```

## What changed

Previously the universal-language track could stabilize and retrieve mathematical **addresses** for English meanings: sparse vectors, opaque canonical relation handles, similarity scores, equivalence classes, and normalized resolution masses.

This checkpoint adds a stronger object for reality-grounded state-transition meanings. Actual before/after contact is retained behind stabilized relations and recompressed into an inspectable mathematical predicate. The predicate is derived from grounded coordinates rather than from the English verb or a human semantic family name.

For each grounded coordinate the generic derivation can currently preserve such forms as:

```text
x(t+1) = x(t)              identity
x(t+1) = x(t) + d          stable numeric change
x(t+1) > x(t)              increasing relation
x(t+1) < x(t)              decreasing relation
x(t)=a ∧ x(t+1)=b          stable categorical transition
x(t+1)=a                    stable postcondition
x(t)=a                      stable precondition
```

When contact does not warrant one stable relation, that coordinate remains unresolved instead of being forced into a formula.

## Verified example

The English-only held-out expression:

```text
close this application
```

resolved in the first gate to mathematical signature:

```text
μ_1n96968
```

and predicate:

```text
P_I := c1=σ_jawdym ∧ c2=σ_1a54qy0
       ∧ x1(t+1)=x1(t)
       ∧ x2(t)=1 ∧ x2(t+1)=0
       ∧ x3(t)=1 ∧ x3(t+1)=0
```

The inspectable grounded coordinate map was:

```text
x1 -> file_exists
x2 -> running
x3 -> visible
```

so within the tested domain the predicate states that the persisted file remains while running and visibility both cease.

The formula contains none of the training surface verbs `close`, `quit`, or `exit`.

Nearby intentions resolve differently. Examples from the same passed gates include:

```text
close/hide interface
P_I := scope
       ∧ x_running(t+1)=x_running(t)
       ∧ x_visible(t)=1 ∧ x_visible(t+1)=0

copy record
P_I := scope
       ∧ x_copies(t+1)=x_copies(t)+(1)
       ∧ x_source(t+1)=x_source(t)

increase level
P_I := scope ∧ x_value(t+1)=x_value(t)+(1)

decrease level
P_I := scope ∧ x_value(t+1)=x_value(t)+(-1)

pause task
P_I := scope
       ∧ x_active(t+1)=x_active(t)
       ∧ x_paused(t)=0 ∧ x_paused(t+1)=1

resume task
P_I := scope
       ∧ x_active(t+1)=x_active(t)
       ∧ x_paused(t)=1 ∧ x_paused(t+1)=0
```

The implementation uses canonical coordinate symbols plus a separate coordinate map. Explanatory coordinate names above are for inspection only.

## First anti-cheat mathematical result

`mathematical-intent.test.js` supplied `F` with 21 grounded contacts over seven externally evaluated relation families. Each grounded example received a fresh opaque relation handle; the human family names were not supplied to `F`.

Verified report:

```text
opaque_training_contacts = 21
semantic_family_labels_given_to_F = 0
mathematical_equivalents_verified = 7
held_out_english_to_math_hits = 7/7
insertion_order_invariant = true
neighboring_intents_mathematically_distinct = true
surface_english_absent_from_predicates = true
counterevidence_reopened_anatomy = true
exact_resolution_whole_equals_one = true
```

## Wider grounded mathematical result

`wide-mathematical-intent.test.js` then widened the same standard to sixteen executable intent families. It supplied 48 grounded contacts, again with fresh opaque handles and no human semantic family names given to `F`.

Verified report from run `38780573779`:

```text
families = 16
opaque_training_contacts = 48
semantic_family_labels_given_to_F = 0
mathematical_equivalents_verified = 16
held_out_english_to_math_hits = 16/16
insertion_order_invariant = true
critical_math_collisions = []
exact_whole_equals_one = true
```

The sixteen externally evaluated families were open, terminate, conceal, delete, copy, move, rename, create, save, undo, enable, disable, increase, decrease, pause, and resume. Their human-readable family names live in the evaluator, not in `F`.

Some displayed formulas can have the same algebraic shape while still be different full mathematical anatomy objects because their coordinate basis differs. For example, a false-to-true transition in `saved` is not the same coordinate as a false-to-true transition in `exists`. The anatomy signature includes the grounded coordinate identity as well as the displayed constraint form.

## Correction behavior

The first gate deliberately added counterevidence to a previously stable process-termination anatomy. The new observation conflicted with the earlier `running: true -> false` transition. The derived mathematical signature changed and the defeated false postcondition was no longer retained as if certain.

Thus the mathematical anatomy is corrigible reality-grounded structure, not a frozen dictionary entry.

## `1`

The intent predicate defines a set of admissible realizations:

```text
K_I = { ω : P_I(ω) }
```

The local whole is:

```text
μ_I(K_I) = 1
```

The constraints inside `P_I` are conjunctive restrictions defining the same whole. They are not falsely treated as mutually exclusive probability slices that individually need to sum to one.

The separate ambiguity-resolution layer still satisfies:

```text
sum(resolved candidate mass) + unknown mass = 1
```

when the current English/contact does not uniquely determine one stabilized relation.

## What this establishes

This checkpoint establishes, in sixteen bounded grounded executable/state-transition families, a stronger bridge than classification:

```text
English surface
    -> stabilized relation
    -> inspectable mathematical predicate over reality-grounded coordinates
```

The mathematical object itself distinguishes the tested neighboring meanings and survives removal of the English surface wording.

## What this does not establish

It does **not** establish that all English intentions have been reduced to mathematical anatomy.

In particular, the current broad abstract English tests still use opaque relational primer/contact signatures for many meanings such as belief, desire, permission, negation, quantification, modality, counterfactuals, and discourse relations. Those tests demonstrate stabilization and English correlation, not yet recursively grounded mathematical equivalence of those abstract meanings.

It also does not prove that human-named sensor coordinates such as `running` are final universal semantic primitives. They are grounded dimensions of the present test world. A stronger universal result would increasingly express such dimensions themselves through stabilized relational structure.

Therefore preserve the evidence boundary:

```text
bounded English correlation                              demonstrated
bounded grounded executable/state-transition anatomy     demonstrated (16 anti-cheat families)
full abstract/compositional intent anatomy               open
universal mathematical language                          target
```
