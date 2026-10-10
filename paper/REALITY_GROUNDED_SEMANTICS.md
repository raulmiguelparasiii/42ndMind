# Reality-Grounded Semantic Stabilization and Translation in a Single Developmental Mind

## A falsification study of corrigible word-to-concept grounding without a language-specific reasoning module

**Status:** research draft based on verified bounded experiments. This paper does not claim general natural-language understanding, human-equivalent intelligence, or complete realization of OneLogic/Stone cognition.

**Strongest verified implementation checkpoint:** `43bc2766263e627fcb76dc26350e6967239d0ce3`

**Frozen branch:** `checkpoint/semantic-translation-2026-10-10`

## Abstract

This paper reports a bounded experiment in a developing artificial mind governed by one update law:

```text
M_(t+1) = C(M_t ⊕ R_(t+1))
```

where `M` is the whole current mind, `R` is new reality-contact, and `C` is a content-neutral developmental transformation that retains experience, discovers reusable relations, recompresses them, and revises them under counterevidence. The experiment asks whether an arbitrary external word label can become grounded in an internally developed world-relation, stabilize under continued contact, be used for actual translation in both directions, remain unresolved when contact is insufficient, and correct under later reality, without adding a language module, semantic dictionary, reward signal, planner, or word-specific rule to `C`.

A four-label categorical environment was used. World-properties and word labels entered as separate categorical channels. Presentation order was randomized, irrelevant context varied, bodily pressure remained zero, and the test mind had only one motor possibility. The mind developed reusable internal conjunctions such as `§1 := p1=1 & p2=1`, then learned both `§1 -> word` and `word -> §1`. The same definition survived further contact while support in both directions increased to 24 observations with measured reliability 1.0.

After learning, independent cloned copies of the same `M` were probed with partial contact. The English label alone reconstructed the internal relation and its grounded world-terms; the grounded world-relation alone reconstructed the English label; an underdetermined partial world-contact produced no unsupported label. A separate continuous life was initially taught an intentionally false cat/cup correspondence and later exposed to sustained correct contact; the corrected grounding gained greater authority than the stale relation.

At the same code checkpoint, the existing self-correction and embodied micro-world regressions also passed. The result supports a narrow hypothesis: a conventional external word can become a usable bidirectional expression of a persistent reality-grounded internal relation produced by the same developmental process that learns nonlinguistic structure. It does not yet establish compositional language, propositional reasoning, source evaluation, formal OneLogic/Stone understanding, or unrestricted semantic convergence.

## 1. Motivation

Conventional machine-language systems often begin with externally supplied tokens and learn statistical structure among those tokens. The present project investigates a different order of dependence:

```text
reality -> internal relational structure <-> external language
```

On this view, the external label is not itself the meaning. Meaning is the relation that survives and stabilizes through contact with reality. A natural-language word becomes meaningful to the system only insofar as it becomes connected to that independently grounded relational structure.

The hypothesis is broader than signal convention. Communication is one use of language, but the internal representational language is expected to arise wherever repeated reality-contact can be compressed into reusable relations.

## 2. Developmental architecture

The active cognitive runtime is one self-contained system exposing only:

```text
one(...)
C(M, R)
```

No separate planner, language faculty, reward policy, semantic classifier, or external reasoning engine participates in live cognition.

The developmental law is:

```text
M_(t+1) = C(M_t ⊕ R_(t+1))
```

`M` retains exact experienced transitions as well as learned relational descriptions. `C` searches repeated simultaneous relations for shorter descriptions, allows learned conjunctions to become reusable representational handles, incrementally updates their evidential authority, and periodically reopens the accumulated record for broader redescription.

The handles `§1`, `§2`, and so forth have no authored semantics. Their identifiers are arbitrary. Their operational meaning is their grounded definition and their relations to other learned structure.

The stronger checkpoint also permits partial perceptual contact. An unobserved perceptual channel is represented as absent/undefined rather than false. `M.current` stores the currently observed relation together with uniquely warranted relational completion and unresolved terms. This current completion does not itself choose motor output.

## 3. Why concept persistence and sparse representation matter

An earlier implementation regenerated the learned `§` vocabulary from scratch during each global recompression. That behavior was inconsistent with the claim that `M` develops a cumulative semantic structure: a concept that disappears merely because the compressor is rerun has not stabilized as representational material in the mind.

The corrected architecture keeps learned concept definitions inside `M` across later recompressions. Relations involving those concepts remain correction-open.

A second failure occurred when every persistent concept was materialized as an explicit true/false feature over every historical sample. Vocabulary growth then increased the dimensionality of the entire lifetime representation. The corrected architecture instead stores learned concepts sparsely: a positive handle is present where its grounded definition occurs. Its non-occurrence is evaluated only where the base relations required by the definition are available; outside that domain the concept remains undefined rather than false.

This distinction is both computational and epistemic:

```text
undefined != false
```

Sparse concepts must nevertheless remain relationally evaluable. If their underlying base relations are known, their occurrence or non-occurrence can provide a comparison class without filling every memory with authored negatives.

## 4. Falsification protocol

### 4.1 External labels

Four arbitrary categorical codes represented external English labels in the test interface:

```text
cat -> 101
dog -> 102
fox -> 103
cup -> 104
```

These mappings exist only in the external test harness so the investigator can name the labels. `C` contains no branch for any of these words or codes.

### 4.2 World relations

Four world configurations were represented independently:

```text
cat-like relation -> [1,1]
dog-like relation -> [1,2]
fox-like relation -> [2,1]
cup-like relation -> [2,2]
```

The word channel and world-property channels were simultaneous but structurally separate inputs.

### 4.3 Shortcut removal

Several obvious alternative explanations were removed:

- presentation order was shuffled every round;
- an irrelevant context channel varied independently;
- bodily concern was always zero;
- only one motor command was available;
- no reward, semantic success signal, word dictionary, or language-specific loss was present;
- the test inspected relations generated by the mind rather than inserting a pre-authored concept.

An earlier fixed-order version was rejected because temporal order itself became a valid predictor of the label. Randomization removed that shortcut instead of modifying cognition to force the desired result.

## 5. Experiment A: acquisition and stabilization

The clean learner received repeated correct label/world pairings under randomized order and context.

It formed the internal world-relation:

```text
§1 := p1=1 & p2=1
```

The definition does not contain the English label channel. It is therefore a reusable relation over the world-property contact itself.

The same mind developed both relational directions:

```text
§1 -> p0=101
p0=101 -> §1
```

where `p0=101` is the externally identified label `cat`.

After further life, the identical `§1` definition remained available and both directions gained additional support.

Verified result:

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
```

All four external labels developed corresponding bidirectional bridges in the bounded test.

## 6. Experiment B: actual translation from partial contact

Stored bidirectional relations alone are weaker than actual semantic use. The stronger checkpoint therefore tested whether the learned `M` could complete a partially contacted relation without being trained by the query itself.

Three independent clones of the same developed mind were used.

### 6.1 English to internal relation

Observed contact:

```text
p0=101
p1=?
p2=?
context=?
```

The learned mind completed:

```text
§1=true
p1=1
p2=1
```

Thus the arbitrary English label recovered the internally developed grounded relation and the primitive world-terms represented by that relation.

### 6.2 Internal relation to English

Observed contact:

```text
p0=?
p1=1
p2=1
context=?
```

The learned mind completed:

```text
p0=101
```

Thus the grounded internal relation recovered the conventional external label without a dictionary call.

### 6.3 Underdetermined contact

Observed contact:

```text
p0=?
p1=1
p2=?
context=?
```

The mind did not generate a word label. The missing distinction remained unresolved.

The verified test output records:

```text
english_to_internal_translation = true
internal_to_english_translation = true
ambiguous_partial_contact_suspended = true
semantic_specific_C_logic = false
```

## 7. Experiment C: corrigibility of semantic grounding

A separate continuous life began with deliberately false teaching:

```text
cat label <-> cup-like world relation
cup label <-> cat-like world relation
```

The false phase was followed by sustained correct contact without an explicit reversal flag.

The mind was therefore required to treat the earlier grounding as ordinary corrigible experience rather than protected seed truth.

Verified result:

```text
correction_experiences = 79
corrected_initial_false_grounding = true
```

The corrected cat-world relation became the stronger active source for the cat label. The stale false relation did not retain equal-or-greater authority.

## 8. Regression against nonlinguistic cognition

The semantic changes were required to preserve previously established behavior.

### 8.1 Synthetic correction

At the stronger verified checkpoint:

```text
experiences = 50
patterns = 441
symbols = 43
order_rules = 5
order_max_depth = 2
corrected_action_seen = true
zero_motor_variants = 4
```

The mind still corrected its motor continuation after an unannounced reversal in experienced action/consequence relations.

### 8.2 Embodied micro-world

The same code ran for 64 protected developmental contacts followed by 32 autonomous contacts in micro-world seed `420070`:

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

The mind retained nonuniform learned motor continuation while also accumulating a persistent conceptual vocabulary and generic current relational completion. The friction comparison is supportive but not by itself evidence of intelligence.

## 9. Interpretation

The bounded result supports the following architecture:

```text
world contact
    -> persistent internally developed relation
    <-> arbitrary external label
```

The label is not the concept. The internal handle is not the concept either. The concept is the grounded relational definition represented and reused by the mind.

The stronger experiment goes beyond stored association: the same `M` can use the learned bridge to move from an external label to the grounded internal relation and from that relation back to the label while withholding a completion when the contact is underdetermined.

In this narrow experiment, English functions as a conventional encoding attached to an independently developed relation. This provides a concrete route toward translation between natural-language expressions and a reality-grounded internal representational language without making natural language itself the substrate of thought.

The result also suggests why multiple external languages could in principle share one grounded semantic structure:

```text
English label  ->
                  internal grounded relation
other language ->
```

This multilingual extension remains a hypothesis until tested.

## 10. Relationship to OneLogic and the Philosopher's Stone

The experiment does not operationalize formal OneLogic or the Philosopher's Stone as special code inside `C`.

That is deliberate. The working design constraint is that these should ultimately be represented as corrigible structured knowledge inside `M`, just as other knowledge is. `C` should remain the generic developmental process capable of operating on that structure.

The semantic experiment now provides two prerequisites: `M` can accumulate persistent relational handles whose external labels do not determine their meaning, and it can use learned relations to complete partial contact while leaving an underdetermined case unresolved.

The next representation problem is substantially harder. `M` must be able to express structured alternatives, propositions, provenance, variables, and relations about relations. Formal OneLogic cannot honestly be represented merely as prose strings or by embedding a OneLogic-specific solver inside `C`.

## 11. Limitations

The experiment is intentionally narrow.

It does not yet establish:

- sentence-level English understanding;
- grammar or compositional semantics;
- variable binding or general quantified reasoning;
- source/provenance weighting;
- dialogue or intentional linguistic communication;
- stable long-range temporal concepts in the micro-world;
- mature Stone judgment;
- formal OneLogic represented and used from within `M`;
- convergence to a unique complete ontology;
- indefinite-life computational scalability;
- human-equivalent or general intelligence.

The current cumulative representation is already expensive. In the stronger verified run, the 96-contact micro-world retained 80 learned symbols and over 1,000 learned patterns and took approximately 3 minutes 54 seconds on the GitHub runner. Generic current relation completion is now attempted at every contact. Future optimization must preserve the same semantic authority rather than change cognition merely for speed.

## 12. Falsifiable next predictions

The architecture now makes several concrete next predictions:

1. Multiple external labels or languages should be able to converge on the same internally grounded relation.
2. Sentence/compositional structure should be learnable only if the generic relation representation can preserve order, reference, and recursively reusable relational structure without a language-specific parser in `C`.
3. Structured initial knowledge such as formal OneLogic should be usable from within `M` only if the substrate can represent alternatives, propositions, provenance, variables, and relations about relations; adding a OneLogic-specific rule to `C` would falsify the intended architecture rather than confirm it.
4. Source-mediated learning should preserve the distinction between a claim and actuality while allowing source authority itself to become a learned referent-relative relation.
5. As semantic relations stabilize, a scalable implementation should increasingly operate on compressed handles while retaining their grounding so counterevidence can reopen them.
6. Equal-authority incompatible completions should remain unresolved in richer domains rather than be selected by arbitrary tie-breaking.

## 13. Conclusion

A bounded artificial mind governed by one generic developmental transformation formed reusable internal world-relations, attached arbitrary English labels to those relations in both directions, preserved and strengthened the mappings under continued contact, actually translated partial English contact into its grounded internal relation and back, withheld an unsupported translation when reality-contact was insufficient, and corrected an initially false semantic grounding without language-specific cognitive code.

The demonstrated result is small but structurally important. It separates meaning from external notation and demonstrates limited semantic use rather than merely stored association: the word is conventional; the learned relation is grounded; the same learned mind can traverse between them when warranted by its experience.

The next question is whether the same substrate can scale from these categorical relations to structured knowledge, natural-language composition, source-mediated learning, formal OneLogic, and Stone-grounded mature judgment while preserving one unchanged content-neutral developmental law.
