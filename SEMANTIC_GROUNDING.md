# Reality-grounded semantic stabilization checkpoint

Verified code checkpoint: `63783369db66ff1640a48a7d80964af8d12161d1`

This note records a bounded falsification result. It is not a claim of general natural-language understanding or human-equivalent intelligence.

## Question

Can the same content-neutral developmental law

```text
M_(t+1) = C(M_t ⊕ R_(t+1))
```

grow a reusable internal relation from reality, attach an arbitrary English label to that relation in both directions, preserve and strengthen the relation under continued contact, and correct an initially false grounding without adding language-specific logic to `C`?

## Anti-cheat conditions

The semantic test uses the unchanged public mind interface `one(...)` and `C(M,R)`.

- The English labels are arbitrary categorical input codes. Their meanings are not present in `C`.
- The world-properties are separate categorical contact channels. No dictionary maps the word code to those properties.
- Presentation order is shuffled and an irrelevant context channel varies so sequence position cannot serve as the label meaning.
- The test mind has one available motor command and zero bodily pressure, so action selection, reward, relief, and purposive pressure cannot explain the semantic relation.
- The test inspects relations that the mind itself learned. It does not inject a `cat` concept, language module, translation table, semantic loss, or privileged success signal.

## Result A — internal concept and bidirectional label grounding

In the clean learning life the mind formed the internal reusable relation:

```text
§1 := p1=1 & p2=1
```

The handle `§1` is arbitrary. Its meaning is its grounded definition, not its name.

The same `M` developed both directions:

```text
§1 -> English label 101 ("cat" in the external test interface)
English label 101 -> §1
```

After additional contact the same concept definition survived and both directions gained support.

Verified output:

```text
stabilization_experiences = 95
active_patterns = 730
learned_symbols = 67
cat_semantic_symbol = §1
cat_semantic_definition = p1=1&p2=1
concept_to_english_support = 24
english_to_concept_support = 24
concept_to_english_reliability = 1
english_to_concept_reliability = 1
bidirectional_words = 4
semantic_specific_C_logic = false
```

This establishes only a small categorical case: an arbitrary external word-label can become bidirectionally related to a reusable world-grounded internal relation without word-specific code in `C`.

## Result B — correction of false grounding

A separate continuous life first received a deliberately false pairing in which the external `cat` label was repeatedly paired with the cup-like world relation and the `cup` label with the cat-like world relation. Sustained later contact then supplied the correct pairings without announcing that a reversal had occurred.

Verified output:

```text
correction_experiences = 79
corrected_initial_false_grounding = true
```

The corrected cat-world relation became the stronger active grounding for the English label. The initial false bridge did not retain equal-or-greater authority.

## Representation changes exposed by falsification

The result required generic corrections to the representation, not semantic exceptions.

1. **Concept vocabulary must persist in `M`.** Earlier `§` definitions were recreated from scratch at each global recompression, so a concept could not genuinely stabilize across a life. Learned definitions are now cumulative representational material in `M` while relations involving them remain corrigible.
2. **Concepts must remain sparse.** Materializing every learned concept as a true/false column over every remembered contact caused vocabulary growth to expand the entire lifetime representation. A concept handle is now present only where its grounded definition occurs.
3. **Sparse does not mean unevaluable.** If all primitive relations needed to evaluate a concept are present, the concept is evaluable even when its positive handle is absent. Outside that grounded domain it remains undefined. This preserves the OneLogic-compatible distinction `undefined != false` without filling memory with authored negatives.
4. **Teacher order is not semantics.** An early fixed presentation order allowed temporal compression to predict labels. The test now randomizes order so semantic grounding must survive removal of that cue.

## Regression with embodied development

The same verified commit passed the original correction regression and the bounded micro-world diagnostic.

Synthetic correction regression:

```text
experiences = 50
patterns = 441
symbols = 43
order_rules = 5
order_max_depth = 2
corrected_action_seen = true
zero_motor_variants = 4
```

Micro-world, seed `420070`, 64 protected developmental contacts + 32 autonomous contacts:

```text
steps = 96
survived = true
autonomous_steps_survived = 32
average friction = 31.49
babble average friction = 47.60
action counts = [16,12,13,12,10,13,10,10]
grounded motor steps = 17
grounded autonomous steps = 13
learned patterns = 1030
active patterns = 1028
learned symbols = 80
ordered rules = 0
```

The richer cumulative vocabulary therefore did not erase the previously demonstrated learned motor continuation in this bounded seed. It did increase representational size substantially.

## What this does not yet establish

- It does not establish natural-language sentence understanding, grammar, compositional reference, source reasoning, or conversation.
- It does not establish that the learned internal vocabulary converges uniquely to every human concept.
- It does not establish stable long-range temporal semantics; the final micro-world snapshot still had zero ordered rules.
- It does not yet place formal OneLogic or the Philosopher's Stone into `M` as executable relational knowledge. The current `prior` prose is descriptive only.
- It does not solve indefinite-life scaling. At 96 micro-world experiences the mind already retained 80 learned symbols and more than 1,000 learned patterns.
- It does not prove human-equivalent or general intelligence.

## Current interpretation

The result supports the narrower architecture:

```text
reality contact
    -> reusable internal relation
    -> persistent relational handle in M
    <-> arbitrary external word label
```

The external label is not the meaning. The grounded relation is the meaning available to this implementation. English can therefore be treated as one conventional expression surface attached to an independently developed relational structure.

The next falsification target is not a language-specific module. It is whether the same generic relational substrate can represent and use structured, correction-open knowledge such as formal OneLogic, Stone relations, propositions, provenance, and partial/undefined information while keeping `C` content-neutral.
