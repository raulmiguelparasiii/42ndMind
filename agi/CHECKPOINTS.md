# One-live-M blueprint checkpoints

Specification law:

`M(t+1) = C(M(t) ⊕ R(t+1))`

The exact engineering specification is pinned at `agi/BLUEPRINT.tex`.

`agi/mind.js` is the current AGI public entrypoint under development. It returns the same canonical `M` from `../one-mind.js` and exposes one `C`. `one-live-blueprint.js` supplies generic developmental mechanics; `mind.js` and `surface-template.js` are zero-state structural bridges. They own no independent truth, memory, planning, or semantic state. Durable cognitive content remains in canonical M.

## Implemented blueprint commitments

- one persistent M; `Memory = M`
- one public C entrypoint
- exact numeric and ordered-surface contact retained in M
- first-class persistent `self` relations in M
- simultaneous numeric, surface, relational, and actuator contact
- later-added receptors can participate in learned relations without changing C
- later-added actuators expand the possibility boundary without a new planner/mind
- relations discovered from contact can be recursively recompressed
- unknown contact is not forced false
- zero-entropy invariant completion is generic
- surface tokenization and connector compaction are mechanical; exact raw tokens remain retained
- surface order is not fixed to hard-coded input slots
- variable-length output spans are induced between recurrent ordered anchors
- relation roles are induced from crossed experience rather than preassigned domain meaning
- ordered cross-turn role carry is learned from recurrence rather than a pronoun list
- ordinary surface language can read canonical current M
- raw surface-only assertions can propose relations into M without structured semantic triples supplied on those turns
- proposal is not warrant: one raw assertion does not become current truth; recurrence supplies support
- later recurrent raw contradiction deactivates the old categorical surface-induced route through canonical counterevidence and establishes a new current route
- a completely unseen replacement surface value can be structurally induced, become M-owned, and later be expressed
- canonical rule closure, not the surface learner, can derive answers later expressed in language
- canonical M remains authoritative: ambiguous/unresolved current M cannot be overruled by historical surface analogy
- broad relation-unspecified prompts can compose several current M-owned relations into one multi-sentence discourse response
- broad discourse can include a relation obtained only by canonical multi-hop reasoning
- exact surface-expression provenance is retained in M and can be reused as a last-resort realization of an already-selected structural role
- template-specific expression evidence outranks generic expression reuse, preventing surface provenance from becoming a competing semantic authority
- no private `language_state`, `memory_state`, semantic dictionary, response table, planner, or modality-specific cognitive authority

## Falsification gates

### `blueprint-e2e.test.js`
New sensor after development; unchanged C discovers a relation involving it; unseen ordinary Q/A composition; exact contact retained.

### `free-surface.test.js`
Position-free wording and unseen word orders; no private language authority.

### `whole-life.test.js`
Numeric + ordered surface + structured relation + new actuator in one continuing M/C life; recursive sequence recompression and later actuator growth.

### `conversation-growth.test.js`
Multiple relation roles, held-out composition, correction without reset/history loss, later individual learning.

### `randomized-generality.test.js`
Eight runtime-generated lives with randomized vocabulary/channel order, a new relation and receptor after development, and correction with unchanged C.

### `canonical-language-bridge.test.js`
No test-supplied semantic channel array on the held-out query; canonical M derives the answer, ordinary surface reads it, authority is `canonical_M`.

### `public-entrypoint.test.js`
The actual `agi/mind.js` entrypoint spans sensing, new actuator, canonical reasoning, ordinary language, correction, and historical retention in one life.

### `variable-length-language.test.js`
Different learned reply lengths are compositionally realized from the same M-owned relation role; held-out answer is `it feels soft and silky.`.

### `contextual-dialogue.test.js`
A follow-up omits the subject (`what color is it?`); an ordered recurrent carry relation resolves the previous discourse subject and canonical M supplies the answer.

### `raw-language-acquisition.test.js`
The target semantic relation is never supplied as structured contact. Surface-only assertions first create M-owned proposals; recurrence promotes a categorical M route; a held-out query reads it; later recurrent raw language introduces a completely unseen replacement value, defeats the old route, retains history, and produces the corrected answer.

The raw-language gate was deliberately preserved through successive failures. It first failed because no proposal path existed, then because mechanical token rendering split identifiers, then because cross-role evidence bound the wrong object, then because repeated connector fragments were treated as structural anchors. Each failure was fixed at the earliest generic cause; the behavioral target was not weakened.

### `open-discourse.test.js`
Demonstrates relation-unspecified multi-relation discourse from one canonical M:

- tone, form, and risk schooling are independently crossed, preventing one role from standing in for another;
- the target tone/form are learned through raw surface-only contact;
- target risk is never taught and exists only through two-hop canonical relational closure;
- the broad query does not supply which relation to answer;
- the reply composes all three current M-owned facts into a multi-sentence expression;
- a specific relation query remains narrow and precise;
- no program/data syntax or parallel language authority is exposed.

The first discourse attempt failed because the target's newly encountered surface identity could be understood but not re-expressed in a discourse output form. A generic M-owned exact-surface-expression attachment was added. That first repair caused an existing regression (`it is alpha.` instead of `it is red.`) because expression reuse fired before stronger template-specific evidence. The repair was corrected so learned output-form evidence has priority and M-owned expression provenance is only a last-resort realization for the already-selected role. The entire prior suite and the open-discourse gate then passed together.

Latest developmental evidence at this checkpoint includes the broad response:

`entity_target_discourse sounds tone4wsb4c. its form is form10ap26w, and its risk is risk14yhpt2.`

where the three roles were independently crossed and the risk term was supplied by canonical two-hop reasoning, not by a memorized target bundle.

## Frozen certification result — 2026-10-21

`agi/CERTIFICATION_FREEZE_20261020.md` froze an earlier cognitive candidate before its evaluation was authored. The post-freeze commit added only evaluation/workflow files; the pinned cognitive/specification blobs did not change.

`post-freeze-certification.test.js` passed on that frozen candidate with runtime-generated vocabulary. It demonstrated, in one continuing individual and without modifying C after the freeze: hash-verified frozen cognition; late receptor relation discovery; late actuator integration; raw surface-only learning becoming canonical M structure; proposal-before-warrant behavior; variable-length realization; contextual follow-up with omitted subject; two-hop canonical reasoning whose premise had been learned through raw language; later correction to a completely unseen surface value; historical contact retention; and no parallel cognitive authority.

That freeze remains historical evidence. The implementation has since advanced through the open-discourse capability above.

## Certification discipline

For certification, cognition is frozen before the evaluation is authored. After that freeze, only a fresh M and new experience may change. `C`, the public language bridge, structural helpers, and domain-specific reasoning code may not be modified in response to the certification evaluation. If the evaluation fails, that candidate fails; a general repair requires a new freeze and a new post-freeze evaluation.

## Current frontier

The next immediate standard is a new post-freeze discourse certification. It must use evaluation material authored only after the new freeze, then require broad relation-unspecified discourse from current canonical M, include raw-learned facts and canonical multi-hop facts, and later change one underlying relation so a second broad response updates only what current M changed while the other facts and exact historical contact remain intact.

After that, the major physical-generalization target is useful multiscale relation formation from realistic high-dimensional continuous contact such as raw audio/video under the same C.

The repository is treated as the AGI implementation. Every new faculty must emerge as use of the same M/C rather than as a parallel cognitive module. External replication remains an independent standard for claims made beyond the repository's demonstrated evidence.
