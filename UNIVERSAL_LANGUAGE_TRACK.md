# Universal-language track — scope, boundary, and success criterion

This file records the distinction between the current `universal-language.js` experiment and the older canonical 42ndMind mind architecture. Treat this as project memory. Absence from an agent's active context is not evidence that a design requirement is absent from the repository.

## 1. Canonical 42ndMind is the mind project

The older project is the more ambitious one. Its target is one continuously existing artificial mind whose complexity develops from a compact, content-neutral developmental law rather than from hand-authored cognitive modules:

```text
M_(t+1) = C(M_t ⊕ R_(t+1))
```

`M` is the one developing mind. `R` is reality-contact. `C` is how the mind changes: generic completion, correction, recompression, relation discovery/reuse, and reopening under counterevidence.

The intended direction is:

```text
foundational relational facts/mechanisms
        -> one continuing M
        -> increasingly complex relations
        -> higher cognitive structure emerging inside M
```

Do not replace this with programmer-authored modules for language, planning, belief, emotion, causation, memory, etc. English, mathematics, OneLogic, Stone, books, and other structured knowledge should become corrigible relational content in `M`, not hidden authority in `C`.

The unresolved language frontier in this project was not merely vocabulary. The goal was for English to become generically interoperable with the same internal relations the mind develops from reality:

```text
English / expression
        <->
reality-grounded internal relational language in M
        <->
reality
```

The mind should be able to think/use its internal relations without translating cognition into English first.

## 2. `universal-language.js` is a narrower parallel experiment

The current project attacks a smaller problem directly:

```text
English intention
        <->
mathematical relational representation
```

It uses one authoritative state and one live update law:

```text
U_(t+1) = F(U_t ⊕ X_(t+1))
```

with arbitrary relation intake, grounding, stabilization, equivalence/overlap resolution, propagation, unresolved mass, and local `whole = 1` closure.

This track is useful because it can investigate the missing English/mathematics bridge without requiring the entire embodied/developmental 42ndMind architecture to remain in conversational context.

However, it is **not the canonical mind**, and it must not silently become a replacement for `one-mind.js` or `C`.

## 3. Current evidential status

PR #10 / merge commit `0a20d58ad799518cef896549e28c64409605d062` crossed an important boundary for **grounded state-transition intentions**.

Before that checkpoint, the track had demonstrated mathematical encoding/address/correlation: vectors, canonical relations, similarity, closure, and English-to-relation resolution. Those results still matter, but an opaque relation handle or similarity vector is only a mathematical address.

The new grounded-intent layer additionally derives an inspectable predicate from actual before/after reality contact. For example, the held-out English expression:

```text
close this application
```

resolved to the stabilized predicate:

```text
P_I := c1=σ_jawdym ∧ c2=σ_1a54qy0
       ∧ x1(t+1)=x1(t)
       ∧ x2(t)=1 ∧ x2(t+1)=0
       ∧ x3(t)=1 ∧ x3(t+1)=0
```

with the observed coordinate interpretation:

```text
x1 = file-existence coordinate
x2 = running-state coordinate
x3 = visibility coordinate
```

Thus the English surface is no longer the mathematical answer. The predicate itself says, over the grounded coordinate domain, that file existence is invariant while running and visibility transition from true to false. Neighboring meanings such as concealing the interface, deleting a persisted object, moving, copying, increasing, and decreasing produce different predicates.

The anti-cheat gate verified seven representative grounded intent families with no semantic family names supplied to `F`: 7/7 held-out English expressions reached the expected mathematical anatomy; the predicates were invariant to reversal of non-temporal training order; neighboring intentions remained mathematically distinct; the English surface verbs were absent from the predicates; counterevidence reopened the anatomy; and resolution retained exact local `whole = 1` closure. See `CHECKPOINT_MATHEMATICAL_INTENT_2026-10-15.md`.

Use this evidence boundary from now on:

```text
mathematical encoding/address/correlation             = demonstrated broadly in bounded English tests
grounded state-transition mathematical anatomy        = demonstrated in bounded anti-cheat tests
full abstract/compositional intention mathematical anatomy = not yet demonstrated
universal mathematical language                       = target, not established result
```

Do not convert the first two results into a claim that all English has been mathematically solved.

## 4. Meaning of `1` in this track

Do not treat heterogeneous semantic constraints as mutually exclusive probability slices merely to make them sum to one.

For a grounded mathematical intention predicate `P_I`, define its admissible realization set:

```text
K_I = { ω : P_I(ω) }
```

The local whole is the complete admissible realization set for that intention:

```text
μ_I(K_I) = 1
```

The conjunctive constraints inside `P_I` jointly define that whole; they do not individually need to sum to one. Where the system is uncertain which stabilized relation is intended, the existing resolution layer may distribute resolved mass plus explicit unknown mass so that the interpretation closes to one.

This preserves the older warning that overlapping relations must not be falsely double-counted while retaining the user's recursive intuition that a resolved intention or relation can itself be treated as the local whole.

## 5. Strong success criterion for the current track

A convincing general result should produce, for an English intention `I`, an explicit mathematical relational object `M(I)` such that:

1. its internal relations carry the semantic distinctions rather than an opaque label carrying them;
2. paraphrases converge to the same object because of those relations, not because the answer was supplied;
3. relevant differences in intent produce corresponding mathematical differences;
4. the object composes recursively from already stabilized relations when possible;
5. unknown or underdetermined parts remain explicitly unresolved rather than guessed;
6. grounding can correct the object later without manually patching a dictionary;
7. the local resolved object closes as the relevant whole (`1`) without requiring heterogeneous raw relations to be falsely treated as mutually exclusive pieces;
8. insertion order of non-temporal evidence should not arbitrarily change the final resolved meaning;
9. the mathematics can be inspected well enough to explain what semantic content each surviving relation contributes.

The grounded state-transition checkpoint now satisfies these requirements only within its tested domain. The remaining research problem is to make the same standard hold recursively for abstract, propositional, modal, social, epistemic, counterfactual, and discourse intentions rather than representing those merely by opaque primer relations.

A useful shorthand remains:

```text
English -> mathematical anatomy of intent
```

not merely:

```text
English -> mathematical address of intent
```

## 6. Relationship between the two projects

The parallel track may eventually help solve the older project's language seam, but integration must preserve the canonical architecture.

Potential future relationship:

```text
current experiment discovers/validates a general English <-> relational-math bridge
                                  |
                                  v
canonical 42ndMind may later express/learn that bridge as corrigible structure in M
```

Do not simply copy semantic authority from `universal-language.js` into `C`. If integration happens, show why the mechanism is generic representation/development or why it can live as learned/seeded content inside `M` while remaining corrigible.

## 7. Context-loss safety rule

Before proposing an architectural addition, replacement, or simplification:

1. Read `AGENTS.md` and the relevant checkpoint/design files.
2. Search the repository for the capability or invariant believed to be missing.
3. Recover why the existing mechanism was introduced, including falsification history.
4. Treat absence from current conversational context as **unknown**, not as evidence of absence from the project.
5. Prefer an isolated experiment over modifying the canonical runtime when the relationship is not yet understood.
6. Preserve frozen checkpoints and previous falsification gates.

The repository, not conversational memory, is the authoritative project memory.
