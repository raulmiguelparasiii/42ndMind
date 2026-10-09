# Open developmental observation — 2026-10-08

## Question

Instead of asking the kernel to demonstrate a named capability, expose the same recompression law to a long minimally interpreted stream and observe what it becomes.

The learner received only a succession of binary contacts. It received no feature names, objects, categories, outcomes, causal labels, step numbers, timestamps, motif names, or phase labels.

The developmental invariant remained:

```text
M_(t+1) = C(M_t ⊕ R_(t+1))
```

with exact reconstruction of the experienced stream required after every recompression.

## Environment

A deterministic hidden generator produced 6,000 binary contacts. The generator contained recurrent structure, small noise, and two changes in its regularities at contacts 1,800 and 3,900. Those change points and the generator's internal motifs were not available to the learner.

The purpose of the changes was observational: see whether a mind organized only by recompression freezes its first grammar or reorganizes when reality changes.

## Observed development

| contacts | description units | description/raw | rules | max depth | max grounded span |
|---:|---:|---:|---:|---:|---:|
| 300 | 71 | 0.2367 | 13 | 7 | 30 |
| 600 | 101 | 0.1683 | 14 | 7 | 30 |
| 1,000 | 135 | 0.1350 | 18 | 7 | 30 |
| 1,400 | 163 | 0.1164 | 19 | 7 | 34 |
| 1,800 | 189 | 0.1050 | 24 | 9 | 47 |
| 2,400 | 268 | 0.1117 | 30 | 9 | 47 |
| 3,000 | 330 | 0.1100 | 38 | 10 | 47 |
| 3,900 | 399 | 0.1023 | 41 | 10 | 47 |
| 4,500 | 464 | 0.1031 | 50 | 10 | 47 |
| 5,200 | 525 | 0.1010 | 56 | 9 | 46 |
| 6,000 | 579 | 0.0965 | 59 | 9 | 92 |

The final description used 579 units for 6,000 contacts while decoding exactly to all 6,000 original contacts.

## What emerged without being requested

The compressor created a hierarchy of reusable ordered structures. By the end, some learned descriptions grounded into spans as long as 92 primitive contacts. The deepest final descriptions had depth 9.

The learned hierarchy was not monotonic accumulation. Maximum depth reached 10 and later fell to 9 while the maximum grounded span eventually doubled from 47 to 92. That means later recompression found a different organization of the same accumulated reality rather than merely preserving every earlier abstraction as a permanent module.

The first hidden environmental change occurred after contact 1,800. The description ratio worsened from 0.1050 to 0.1117 by contact 2,400, then recovered to 0.1023 by contact 3,900. After the second hidden change, the ratio again worsened slightly from 0.1023 to 0.1031, then recovered and ended at 0.0965.

This is consistent with a correction-open grammar: new reality initially makes the old organization less adequate; subsequent recompression reorganizes the accumulated history under the changed regularities.

No mechanism was told to detect a regime change, create a temporal concept, preserve an old schema, discard an old schema, or grow to a particular depth.

## What this run establishes

Within this finite exact grammar implementation, repeated application of the same recompression objective can:

- create reusable distinctions above the primitive input alphabet;
- recursively compose those distinctions into deeper structures;
- reorganize rather than merely append abstractions;
- respond to changed environmental regularities without being told that a change occurred;
- preserve every raw contact exactly while doing so;
- keep the whole-state invariant `whole = 1`.

This was an open developmental observation, not a test targeted at a named cognitive faculty.

## The important boundary it exposed

This run does **not** establish fully self-created perception from literally undifferentiated reality.

The input channel still supplies the primitive difference between `0` and `1`. What the mind creates for itself are the reusable structures *above* those primitive differences.

That is not a minor wording issue. Any computational system must receive some physically distinguishable input states, but 42ndMind's stronger goal is to avoid having the programmer decide the meaningful categories of those states.

The present run satisfies the weaker but important condition: no meaningful categories were supplied; only primitive binary variation was supplied.

A second boundary also appeared. The current sequence grammar discovers exact recurrent structure. Noise that breaks an exact pattern remains residual. It has not yet demonstrated that approximate variants should be treated as instances of one self-created category. Adding a hand-written clustering or similarity faculty merely to obtain that behavior would violate the developmental constraint.

So the next open-development question is not "implement categorization." It is whether the same description-length law, applied to a richer primitive contact space, naturally selects equivalence classes or tolerances because doing so gives a shorter reality-preserving description.

## Verification

GitHub Actions run `37862658779` completed successfully. The open-development run passed alongside the exact one-rule tests, recursive recompression tests, temporal tests, succession-native tests, and the existing stress suite.
