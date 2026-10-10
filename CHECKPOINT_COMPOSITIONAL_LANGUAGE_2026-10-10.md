# Compositional language checkpoint — 2026-10-10

## Tested code

Exact code SHA:

```text
242bf79481d641a69691f8434dcabead432c8735
```

Frozen branch:

```text
checkpoint/compositional-language-2026-10-10
```

Primary GitHub Actions falsification run:

```text
run 38029514723
job 114147310257
```

The code was frozen before this documentation-only commit.

## Defect exposed by the broader language-school test

The first compositional schooling run failed on the held-out sentence:

```text
blue triangle rests
```

The mind recovered the color and noun meanings but left the verb meaning undefined.

Diagnostic inspection showed that experience was sufficient to learn `rests -> 23`. However, finite retention had kept equally reliable predictors through learned `§` handles while dropping the directly usable lexical relation. The compressed handles required additional underlying features that were absent in the held-out sentence.

This exposed a generic implementation defect in finite retention, not an English-specific limitation:

> **Dependency-blind retention:** when predictive warrant was tied, a context-dependent compressed antecedent could crowd out an equally warranted antecedent that was reconstructible from less information.

The finite relation budget itself remains necessary. The defect was the tie-breaking criterion, not selective retention as such.

## Rejected correction

A first correction added a reconstruction-cost penalty to every relation using compressed antecedents.

That was rejected because it broke the earlier semantic-grounding regression. A legitimate grounded compound concept can genuinely require multiple features; abstraction must not be penalized merely for having dependencies.

This falsified the stronger rule:

```text
more dependencies => generally worse relation
```

That rule is not valid.

## Accepted generic correction

The final change preserves predictive/compression authority and uses the ultimate base dependency footprint only as a tie-break among candidates with equal predictive warrant.

Informally:

> If two retained relations are equally warranted, prefer the route that can be made available from fewer independent base features. Do not otherwise penalize abstraction.

No English word, grammar category, lexical role, Stone concept, or OneLogic theorem is recognized by this rule.

Relative to the last known-good code before the correction, the final `one-mind.js` change was narrowly scoped: 14 additions and no deletions.

## Unchanged language-school falsification

`language-school.test.js` was not weakened after the original failure.

The same continuing mind was taught a controlled fixed-slot mini-language:

```text
colors: red, green, blue
nouns: circle, square, triangle
verbs: moves, spins, rests
```

Three whole sentences were withheld during the first schooling phase:

```text
red circle moves
green square spins
blue triangle rests
```

The test requires both directions for every held-out sentence:

```text
English expression -> grounded world relation
grounded world relation -> English expression
```

The same `M` was then taught three later words independently:

```text
yellow
star
jumps
```

Each new word appeared only with old vocabulary. None of the three new words was ever shown together with either of the other two new words.

The final strong holdout was therefore:

```text
yellow star jumps
```

The mind had never experienced that three-word combination.

## Verified result

The unchanged test passed:

```text
42ndMind compositional language school: PASS
```

Exact metrics:

```text
experiences = 101
learned_symbols = 68
active_patterns = 740
base_vocabulary = 9
later_taught_vocabulary = 3
total_tested_vocabulary = 12
held_out_base_sentences_read = 3
held_out_base_sentences_expressed = 3
never_seen_new_word_combination_read = true
never_seen_new_word_combination_expressed = true
ambiguous_partial_contact_suspended = true
C_language_specific_changes = false
```

The same run also passed:

```text
one-mind.test.js
structured-knowledge.test.js
semantic-grounding.test.js
micro-world-single-life.js
```

The unchanged 96-contact embodied regression remained viable:

```text
survived = true
autonomous_steps_survived = 32
avg_friction = 31.49
babble_avg_friction = 47.6
grounded_motor_steps = 17
grounded_autonomous_steps = 13
```

## What this establishes

At this bounded scale, the same developmental mind can:

1. retain independently reusable word-to-world relations;
2. read complete combinations that were withheld during teaching;
3. express the corresponding grounded relation back through the learned word sequence;
4. continue learning new vocabulary in the same `M`;
5. combine three newly taught words that were never experienced together;
6. keep unsupported missing terms unresolved;
7. do this without an English-specific branch in `C`;
8. preserve earlier self-correction, structured-knowledge, semantic-grounding, and embodied behavior regressions.

This is evidence of **bounded compositional language learning/generalization**, not merely isolated label association.

## What this does not establish

The test interface preserves a fixed three-token positional frame. Therefore this checkpoint does **not** establish general English or learned natural-language grammar.

It does not yet establish:

- variable-length sentences;
- syntax induction;
- morphology;
- pronouns or reference resolution;
- negation;
- quantification;
- questions;
- discourse/context tracking;
- propositions and live alternatives at natural-language scale;
- reading books as claims-with-provenance;
- unrestricted vocabulary;
- unrestricted expression;
- general intelligence or AGI.

The next language experiments should make the expression interface less structurally helpful while preserving the rule that semantics and grammar may not be hidden in `C`.
