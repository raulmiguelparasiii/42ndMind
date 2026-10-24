# Architecture decision — current relational field without a workspace

Date: 2026-10-24
Status: binding for current AGI work
Recovery head before this decision: `d0c55185e16354f09ed6d1e75f9ff0f79cf4f884`

## Standard

The cognitive law remains exactly:

```text
M(t+1) = C(M(t) ⊕ R(t+1))
```

There is one persistent M and one developmental authority C. This decision does not add a second cognitive state.

## Rejected substitutions

Do not implement or reconstruct any of the following as cognitive architecture:

- an attention module/controller;
- a focus module/controller;
- a working-memory store;
- `M.attention`, `M.focus`, or a persistent current-thought/current-workspace graph;
- an eager lifetime/episodic frontier generated every contact;
- per-question retrieval engines;
- named prompt handlers for `why`, `my name`, summaries, or similar conversational fixtures;
- a Stone evaluator that independently scores/selects thoughts;
- the retired seven-way named cognitive candidate branch from PR #34.

The explicit PR #34 candidate implementation has been removed from the live tree. Git history remains audit evidence only.

## Why the current failure is not missing memory

The newest saved individual already contains relations that ordinary conversation sometimes fails to express. The failure therefore cannot be diagnosed as “add memory” or “teach the answer.” In the observed name case, the canonical relation survives while expression fails downstream. In broader questions, surface machinery chooses a narrow relation/template before the whole M-owned dependency structure can become the thing being judged.

The architecture must expose what C is actually settling, not create another cognitive faculty to imitate human access limitations.

## Existing source of truth

Canonical relational cognition already has:

```text
M.knowledge.facts
M.knowledge.rules
M.knowledge.current = relational closure of the current M
current.derived[*].derived_from = rule that produced a current conclusion
knowledge.episodes = exact structured-contact occurrences
```

Every helper that legitimately adds cognition feeds ordinary relational facts/rules back through canonical C. Therefore the missing object can be derived from existing contact + closure + dependency structure.

## Derived field

Let E be the set of relational episodes produced during one top-level reality-contact. Let Q be an optional open relational cue produced by a learned surface transducer. Let K be the already-settled canonical relational closure of M.

The live field is a disposable projection:

```text
A(M; E, Q) = affected dependency closure inside K
```

It is not added to M.

### Roots

Roots are only:

1. exact relation facts/rule changes that entered through the current top-level contact and its internal canonical updates; and
2. if a learned expression surface has independently resolved an open relational cue, current canonical facts that satisfy that cue.

A cue can ask which existing relation is presently at issue. It cannot create truth or warrant.

### Forward affected wave

A current derived relation belongs to the affected wave when at least one of its actual rule supports belongs to the wave, or when the current contact changed/introduced the rule that produces it.

The wave propagates recursively through already-existing rule dependencies until no additional current conclusions are affected.

### Backward support

For every relation in the affected wave, all canonical facts and rules actually supporting that derivation may participate in the field. If one supporting fact is itself derived, its own support chain is recursively exposed.

Backward support does not fan outward into every other conclusion that happens to share an old fact. This prevents the derived field from becoming a whole-M workspace.

### Important distinction

```text
affected wave     = what present contact/query made current
supporting context = older M material required by those affected conclusions
unrelated M        = remains outside A
```

This is the central anti-workspace constraint.

## No persistent activation

The implementation must not write any of these into durable M:

```text
active_fact
attended_fact
focus
workspace
current_thought_graph
activation_score
```

The field is recomputed from canonical M and a contact boundary. Deleting the field changes nothing because there is nothing to delete from M.

## Surface boundary

Language may supply a learned relational cue, analogous to any other receptor/transducer result. It does not select the answer or own the judgment.

The intended direction is:

```text
surface contact
 -> learned relational cue
 -> A(M; current contact, cue)
 -> canonical relation/support settles
 -> expression renders from that settled material
```

not:

```text
surface similarity/template
 -> choose what cognition is about
 -> search M for an answer
```

Existing language renderers may remain temporarily as compatibility transport, but they are not the cognitive spine.

## Stone relation

The Stone is not the selector for A and not a runtime scoring function. Where a formed judgment relative to a bounded referent exists, Stone knowledge inside M may describe the structure of that entity-referent orientation. It remains corrigible M content and cannot become hidden C authority.

## Classification

This change is a **connection**.

It reuses:

- exact current relational episodes;
- canonical relational closure;
- existing rule definitions;
- current derived-from links;
- learned surface interpretation as a zero-authority cue when available.

It adds no memory store, planner, attention state, focus state, semantic truth ledger, or Stone evaluator.

## Evidence boundary

A correctly derived affected field establishes only that the current one-M architecture can expose the relations participating in present settlement without persisting a workspace. It does not by itself establish unrestricted human attention, consciousness, general conversation, or AGI.

`green regression != proof of AGI`.
