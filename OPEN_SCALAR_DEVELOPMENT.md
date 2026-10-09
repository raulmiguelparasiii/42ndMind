# Open scalar developmental observation — 2026-10-08

## Setup

The learner received 9,000 integer contacts in `0..255` with no category names, hidden-state IDs, motifs, outcomes, or change-point labels. The environment contained noisy recurring bands and changed its regularities twice, at hidden contacts 2,200 and 5,000.

The developmental form remained:

```text
M_(t+1) = C(M_t ⊕ R_(t+1))
```

The finite scalar description language lets an exact contact be represented literally or as a reusable numeric basis plus an exact signed residual. The basis is retained only when total description length is shorter. This is model search under `C`, not a separate `categorize()` authority. Every reading must still reconstruct exactly.

## What happened

The learner created reusable descriptions that covered *multiple distinct raw readings*, rather than only memorizing exact values.

Examples from the final state:

- basis `39`: 1,682 contacts, 7 distinct values spanning 36..42, 90% within residual magnitude 3;
- basis `174`: 506 contacts, 6 distinct values spanning 171..176;
- basis `200`: 291 contacts, 8 distinct values spanning 193..201;
- basis `178`: 263 contacts, 9 distinct values spanning 177..185.

By the final checkpoint all 23 active reusable bases covered more than one raw value; 11 covered at least five distinct values. So the description law did form tolerance-like equivalence neighborhoods from noisy scalar contact while preserving every original value.

At 400 contacts, the strongest bases already appeared near the environment's dominant regions (`34`, `112`, `210/214`) even though those regions were never labelled to the learner.

After the first hidden environment change, the representation reorganized and expanded around the shifted bands. After the second change introduced a new region near the 170s, bases around `169/174/178` appeared without being requested.

The representation was correction-open rather than frozen: active basis counts and locations changed across checkpoints as the accumulated history changed.

## Important limitation

This is progress toward self-created categorization, not a finished category system.

The learner often keeps several local bases inside what a human might later treat as one broad category. For example, one broad region may be represented by several nearby bases rather than one invariant concept. That is not being tuned away manually.

The next developmental frontier is whether repeated application of the same objective can *recursively compress those local tolerance descriptions into broader reusable structure* and then use those self-created distinctions in higher-order relations, without inserting a manual clustering or concept-promotion stage.

A second architectural caution: the finite implementation expanded the admissible description language from exact symbols to exact `basis + residual` arithmetic. This is legitimate only insofar as numerical difference is already a relation available in the primitive scalar contact space. It should not be mistaken for proof that arbitrary perceptual similarity has been solved.

## Verification

GitHub Actions run `37863973610` completed successfully. The scalar observation passed alongside the existing exact kernel, recursive recompression, temporal/succession tests, first open binary run, and stress suite.
