# Temporal self-recompression test

The temporal test changes no developmental rule and adds no temporal, causal, memory, or sequence module.

It continues to use:

```text
M_(t+1) = C(M_t ∪ {R_(t+1)})
```

where `C` is reality-preserving recompression under the same description-length objective already used by the recursive learner.

## What is supplied

Experience supplies ordered roles such as:

```text
step1
step2
step3
```

These are observation coordinates, not learned conclusions. The kernel is not told that any particular order matters or that a sequence should be formed.

## What is learned

From repeated episodes, the same recompression law discovers that the ordered fragment

```text
step1 = request
step2 = ignore
```

is worth retaining as one reusable description. Reversing the same events does not activate that description.

The learned ordered fragment then becomes vocabulary for a longer regularity:

```text
[learned request→ignore fragment]
step3 = repeat
    -> escalation
```

With the learner restricted to two active conditions, the raw three-condition relation is outside the search language. The learned fragment is therefore doing necessary representational work.

The longer trajectory itself then becomes reusable vocabulary. A later stage discovers:

```text
[learned three-step trajectory]
context = high
    -> withdrawal
```

Again, the raw four-condition relation is outside the two-condition search language.

Later experience introduces a new condition:

```text
repair_after = true
```

The prior trajectory is not erased. Instead, recompression learns that the implication changes when later repair is present. The same trajectory remains represented, while its consequence is refined by the new reality-contact.

## What this establishes

The test demonstrates, under the same developmental law:

- order-sensitive learning;
- learned temporal fragments becoming reusable vocabulary;
- longer trajectories built from earlier learned fragments;
- context being combined with learned trajectories;
- later corrective information refining an implication without deleting the prior trajectory;
- reverse order failing to instantiate the forward learned structure;
- continued preservation of the numerical whole `1`.

No change to `recursive-recompression.js` was required for this test. The existing generic recompression law was sufficient.

## What it does not establish

The test does **not** show that the system learned time itself from raw perception. Ordered observation roles (`step1`, `step2`, `step3`) are still supplied by the input representation.

So the current result is:

> Given ordered experience, the one law can discover and recursively reuse temporal structure without a temporal reasoning module.

A stronger future test would have to make ordering itself an emergent relation rather than a supplied coordinate. That must still be attempted through the same developmental law rather than by adding a clock/sequence authority that performs the learning for the mind.

## Verification

GitHub Actions run `37858838669` passed all four suites together on commit `6e613bfb881ba8eb9d8d950a5324059cfcf0da99`:

```text
node one-rule.test.js                    PASS
node recursive-recompression.test.js    PASS
node temporal-recompression.test.js     PASS
node one-rule.stress.js                  PASS
```
