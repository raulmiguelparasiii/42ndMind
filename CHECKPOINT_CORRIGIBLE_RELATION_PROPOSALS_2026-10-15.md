# Checkpoint — corrigible relation proposals — 2026-10-15

This belongs to the narrower universal-language track. It does not modify canonical `one-mind.js`, `M`, or `C`.

Implementation merge:

```text
97faaab269693b68404c62401d81f78cd79b0d63
```

Primary anti-cheat run:

```text
38807574826
relation-hypotheses.test.js PASS
```

## Purpose

LLMs, humans, texts, or other sources may cheaply propose arbitrary relational structures, but proposal must not equal truth. `relation-hypotheses.js` therefore keeps proposed mathematical relation patterns in a separate corrigible ledger.

Verified behavior:

```text
proposer_confidence_is_not_authority = true
alpha_equivalent_proposals_merged = true
incomplete_contact_preserves_unknown = true
independent_contact_can_support = true
complete_counterexample_can_defeat = true
later_counterevidence_reopens_supported_relation = true
whole = 1
```

A proposal becomes usable only after independent mathematical/reality contact supports its operator pattern. Missing structure does not count as false unless the contact explicitly warrants exhaustive coverage of the relevant operator classes (`undefined != false`). A supported proposal becomes unusable again when later complete counterevidence contests it.

This provides the intended scaffold for broad LLM relation seeding: the LLM can propose many candidate relations quickly, while mathematical consistency and reality-contact determine what survives. The proposer does not become semantic authority.

The first failing test incorrectly expected an untested O7 relation to be defeated merely because it was absent from a contact that had tested only O0/O2/O4/O5. That expectation was rejected and the test was corrected to preserve unknown until O7 was actually covered. This failure is part of the checkpoint because it demonstrates the epistemic boundary rather than weakening it.
