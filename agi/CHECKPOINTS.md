# One-live-M AGI live checkpoint

Law: `M(t+1) = C(M(t) ⊕ R(t+1))`.

`agi/BLUEPRINT.tex` is the engineering spec. `agi/mind.js` is the public developmental entrypoint. Durable cognition is canonical `M`; helpers may derive/propose/index/render/recompress but own no independent memory, truth, semantics, planning authority, modality mind, or copied world model.

This is the compact live ledger. Replace stale frontier text; do not append narrative history.

## Before architectural/semantic change

1. Read `AGENTS.md` and this file fully.
2. Search implementation/tests before declaring anything missing.
3. Locate existing authority + preserved failure.
4. Classify: `reuse`, `connection`, `extension`, or `replacement`.
5. Preserve regressions; no duplicate semantic/status/planning authority.
6. Record changed frontier, failure/repair, or material inefficiency here.

Absence from conversation is `unknown`, never repository absence.

## Locked authority

- one persistent canonical `M`; one public `C`;
- exact lived contact remains beneath compression/search views;
- `null`/uncontacted = unknown, not false;
- proposals do not warrant themselves; reality can defeat/reopen structure;
- expressions, relations, actions, evidence, provenance, alternatives, higher relations are M material;
- no planner/reward policy/hidden dictionary/copied truth ledger;
- caches/indexes/windows/queues/recompression schedules are zero-authority only.

## Solved / do not redo

- variable-length/position-free language, context, single- and multi-proposition raw-language acquisition/correction, open discourse, canonical multi-hop expression;
- compound raw utterance -> several independently queryable/corrigible M relations; exact raw strings retained at `ρ:input_raw`;
- compound surface role induction broadens across grounded bindings so nearest repeated values do not become accidental constants;
- raw continuous same-time/delayed, unknown preservation, quantitative/nonlinear/joint/mixed-lag completion/correction/conflict;
- learned relations becoming first-class occurrences and recursively higher-order material;
- opaque word/phrase grounding to learned relations;
- empirical action/consequence relations entering the same substrate;
- relation/expression/action/internal-evidence occurrences sharing generic `ρ:lived_order`;
- learned order -> current M expectation without fabricating successor;
- ordered-relation route upgrade, lifecycle evaluation, counterevidence reopening, action realization;
- structured relation contact -> content-addressed terms + generic lived occurrences;
- receptor topology + raw dynamics co-participation; renaming invariant, non-isomorphic topology distinguishable;
- endpoint-independent structural schema induction/held-out transfer with non-isomorphic rejection;
- structural schema support/counterevidence and narrower refinement after broad defeat;
- large connected contacted graphs -> bounded connected <=8-edge local schemas while full contact remains exact;
- learned small schema usable inside larger connected clutter via disposable schema-relevant matching;
- recursive structural composition: independently learned lower schemas -> first-class grounded schema instances -> repeated endpoint-renamed composition -> depth-2 schema -> held-out >8-edge missing-relation proposal grounded by that higher schema.

Primary language regressions: `compound-raw-language-acquisition.test.js`, `raw-language-acquisition.test.js`, `open-discourse.test.js`, `canonical-language-bridge.test.js`, `contextual-dialogue.test.js`, `variable-length-language.test.js`.
Primary structural regressions: `recursive-structural-composition.test.js`, `embedded-structural-completion.test.js`, `large-connected-structural-world.test.js`, `structural-schema-refinement.test.js`, `structural-schema-corrigibility.test.js`, `structural-relation-transfer.test.js`, `topology-dynamics-integration.test.js`.
Primary temporal/action regressions: `internal-evidence-recurrence.test.js`, `temporal-expectation-lifecycle.test.js`, `temporal-relation-counterevidence.test.js`, `action-warrant-reopening.test.js`, `grounded-expression-action.test.js`, `ordered-relation-route-upgrade.test.js`, `generic-occurrence-temporal-completion.test.js`.

Current fully green blueprint head: `8cc12d8e875da7b786f77d92df5ca00b0a64596e`.
Blueprint run `40012331554`: full success, including compound raw-language acquisition and all downstream regressions.

## Failure / repair constraints

1. **Duplicate authority:** never copy status/definitions where live dereference from M exists.
2. **Eager lifetime retrieval:** persistence is fundamental; retrieval is query-relative.
3. **Temporal modality interference:** preserve complete events; search projections may not erase modalities.
4. **Search starvation:** bounded affected/suffix search; never hide failure by inflating global budgets.
5. **Gappy projection overreach:** projected recurrence cannot license immediate-next expectation.
6. **Phase artifacts:** pure alternation does not privilege one phase. Repair the test, not cognition.
7. **Evidence-route birth order:** one ordered relation accumulates stronger later evidence routes.
8. **Partial disagreement:** common supported terms may remain; residual/disjoint alternatives stay open.
9. **Counterevidence is reopening, not deletion:** history and independent support remain.
10. **Internal evidence normalization:** internal M events are not fabricated external contact; structural identity, not event ID.
11. **No internal-event recursion:** internal evaluation shares its triggering lived order and does not recursively rerun lifecycle.
12. **Occurrence anatomy must not self-reify:** representation metadata is not another world event.
13. **Anti-cheat boundary:** generic normalization stays outside content-specific logic; never weaken guards to pass.
14. **Independent structural bindings:** repeated same concrete binding is not new endpoint-independent support.
15. **Structural support is contact-local:** do not silently stitch separate contacts across time unless separately learned/tested.
16. **Schema counterevidence:** proposal eligibility derives from canonical M counterexample facts; no copied status.
17. **Refinement:** defeat of a broad schema does not block a structurally distinct narrower schema.
18. **Large-world search:** never fix scale by raising `MAX_COMPONENT_EDGES`; use bounded connected views, not exhaustive subgraphs.
19. **Embedded matching:** disposable schema-relevant views may ignore unrelated labels; exact contact remains M.
20. **Recursive structural composition:** only schemas predating a contact may instantiate on that contact; a new schema cannot self-bootstrap its own support. Lower instances retain bindings/contact/source-schema provenance; higher schemas remain proposals.
21. **Boundary test arithmetic matters:** 8 edges equals the local budget, not beyond it. Repair test arithmetic, not cognition.
22. **Compound role locality:** nearest examples may identify a relation signature, but role induction must broaden across independent grounded bindings before treating lexical spans as variables.
23. **Raw retention boundary:** tokenizer behavior is representation detail; exact surface history is asserted at `ρ:input_raw`, not by assuming fixture identifiers remain single tokens.
24. **Frontier bloat:** reuse solved preconditions; newly claimed learning still needs reality contact.
25. **CI cost:** recursive continuous-temporal is >6 min and path-scoped; frontier `embodied-crossmodal-grounding` has known long runtime; high-dimensional continuous is a known slow blueprint tail.
26. **Indexes:** temporal/structural/surface caches are rebuildable acceleration only; deleting them must not alter warrant/contact/meaning.

## Closed: compound raw-language acquisition

`grounded compound schooling -> raw compound utterance -> multiple proposal relations -> recurrent independent warrant -> selective correction -> separate queries + broad discourse`

No conjunction keyword rule, semantic dictionary, fixed proposition count, copied sentence truth, or output-to-input semantic shortcut. Each proposition remains separately corrigible in canonical M. Exact raw input remains beneath learned relations.

## Current frontier: long-life surface access without lifetime reconstruction

`mind-relational.js::sequenceEpisodes(state)` currently rebuilds every surface episode by scanning all `M.knowledge.facts` each time raw-surface inference or expression grounding runs. This is correct but scales with total life history on every surface operation. Repository search shows no existing `agi/` long-life surface access gate or rebuildable surface-episode index.

Target:

`persistent exact surface history in M -> rebuildable zero-authority episode index -> query/recent-learning access without repeated whole-life reconstruction`

Requirements:

- preserve a focused failure before implementation;
- no semantic/warrant/status data may become authoritative in the index; canonical M remains source of truth;
- index may cache only a derived episode projection already reconstructible from M facts;
- deletion/corruption/version mismatch must force rebuild from M and produce identical behavior;
- recent surface contacts must update the index without rescanning lifetime history;
- long unrelated history must not change a learned query/correction result;
- do not add a memory subsystem, retrieval policy, embedding store, or copied truth ledger;
- do not use a brittle wall-clock-only correctness criterion; assert rebuildability and bounded access mechanics directly;
- exact raw strings/tokens/contact remain in M beneath the index.

Classification: **zero-authority acceleration of the existing surface episode view**, not new cognition.

## Later, not current

- frozen unseen long heterogeneous symbolic corpus / cross-domain continuation after long-life access is efficient;
- unrestricted AGI is not demonstrated.

## Efficiency rules

- active falsification first; expensive regressions only when relevant runtime changed;
- no global budget increases to hide starvation;
- no whole-life rescan every contact when bounded/rebuildable access suffices;
- no subsystem until search falsifies reuse of existing authority;
- one decisive falsification > overlapping capability tests;
- conceptual test error => repair test, not cognition;
- continuity note stays compact.

## Certification boundary

Historical freezes prove only stated bounded claims. Final AGI requires cognition frozen before evaluation, precommitted denominator, no leakage/post-failure held-out patching, no privileged representation shortcut, cross-domain transfer, and ordinary-interface access to the same machinery.

`green regressions != AGI`.
