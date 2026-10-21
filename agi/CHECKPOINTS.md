# One-live-M blueprint checkpoints

Specification law:

`M(t+1) = C(M(t) ⊕ R(t+1))`

The exact engineering specification is pinned at `agi/BLUEPRINT.tex`.

`agi/mind.js` is the AGI public entrypoint under development and exposes one `C` over one persistent canonical `M`. Source files may be separated for engineering efficiency, but none may own independent cognitive state or truth. Durable cognition remains in canonical M.

Current zero-state implementation pieces:

- `agi/mind-relational.js` — preserved relational/surface bridge over canonical M;
- `agi/continuous-relational-contact.js` — modality-neutral numerical variation relation discovery over exact M-retained contact;
- `agi/relation-sequence-recompression.js` — zero-state bridge from first-class M relation occurrences into the existing generic `sequence-recompression.js` law;
- `agi/surface-template.js` — ordered-surface structural helper;
- `agi/discourse-arbiter.js` — zero-state competition among learned expression structures;
- `agi/mind.js` — the single public one-M/one-C entrypoint that connects those zero-state calculations back to canonical M.

These are code organization, not separate minds. Their outputs become ordinary relational contact settled through the same canonical M/C authority.

## Implemented blueprint commitments

- one persistent M; `Memory = M`
- one public C entrypoint
- exact numeric and ordered-surface contact retained in M
- first-class persistent `self` relations in M
- simultaneous numeric, surface, relational, and actuator contact
- later-added receptors can participate in learned relations without changing the cognitive architecture
- later-added actuators expand the possibility boundary without a new planner/mind
- relations discovered from contact can be recursively reused/recompressed
- continuous relations are first-class M terms, not hidden detector state
- every fresh evidence window supporting a continuing relation is retained as an ordered lived relation occurrence without duplicating the truth route
- simultaneous first-order relation occurrences remain one simultaneous event rather than receiving arbitrary internal order
- the repository's existing generic sequence recompressor can build higher ordered relations from raw-continuous relation occurrences
- learned ordered relations can themselves become components of later learned ordered relations
- one unlabeled raw numerical receptor can form and correct temporal self-relations without an audio/waveform cognitive module
- unknown contact is not forced false
- proposal is not evidence; first raw assertion does not warrant itself
- recurrent contradiction can defeat an old route while exact historical contact remains
- ordinary language reads and writes the same canonical M
- variable-length expression and cross-turn context are learned structurally rather than held in a semantic dictionary
- raw surface-only assertions can become M-owned proposals and then warranted relations through recurrence
- canonical rule closure can derive answers later expressed through the same surface boundary
- broad relation-unspecified prompts can compose several current M relations into multi-sentence discourse
- broad discourse can include facts obtained only by canonical multi-hop reasoning
- continuous nonrepeating numerical contact can form current same-time and delayed variation relations
- a receptor introduced later in the same life participates in the same continuous relation discovery
- later numerical reality can defeat one continuous relation without deleting old contact or unrelated surviving relations
- dense raw numeric streams use dimension-aware proposal-search cadence while exact contact still enters M on every update
- no private language state, memory state, sensor model, semantic dictionary, response table, planner, truth ledger, vision mind, audio mind, or temporal mind

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
No semantic channel array on the held-out query; canonical M derives the answer, ordinary surface reads it, authority is `canonical_M`.

### `public-entrypoint.test.js`
The actual `agi/mind.js` entrypoint spans sensing, new actuator, canonical reasoning, ordinary language, correction, and historical retention in one life.

### `variable-length-language.test.js`
Different learned reply lengths are compositionally realized from the same M-owned relation role.

### `contextual-dialogue.test.js`
A follow-up omits the subject; an ordered recurrent carry relation resolves the previous discourse subject and canonical M supplies the answer.

### `raw-language-acquisition.test.js`
The target relation is never supplied as structured contact. Surface-only assertions create M-owned proposals; recurrence promotes a categorical M route; later recurrent raw language introduces an unseen replacement value, defeats the old route, retains history, and produces the corrected answer.

The raw-language gate was preserved through successive failures. Fixes were made at the earliest generic cause; the behavioral target was not weakened.

### `open-discourse.test.js`
Demonstrates relation-unspecified multi-relation discourse from one canonical M. Tone, form, and risk schooling are independently crossed; target tone/form are raw-learned; target risk exists only through two-hop canonical closure; the broad query supplies no relation; the reply composes all three current facts into multi-sentence expression; a specific query remains precise.

The open-discourse implementation also preserved its failure chain: newly encountered subject expression was initially unavailable for output; generic M-owned exact-surface-expression provenance fixed that, but the first version overrode stronger output-template evidence and caused a regression. The hierarchy was corrected so template-specific evidence wins and general expression reuse is last-resort only.

### `high-dimensional-continuous.test.js`
Demonstrates modality-neutral continuous relation formation in one life:

- 32 initial numerical receptors with effectively nonrepeating values;
- a same-time affine dependence discovered as a current relation;
- a delayed opposed dependence discovered from raw numerical variation;
- receptor 32 introduced only after development begins and then related to an older receptor;
- stable epoch followed by a reality reversal of exactly one relation;
- the defeated relation leaves current M while the delayed relation and late-receptor relation survive;
- exact old sensor contact remains retained;
- no audio/vision/sensor-model authority exists.

The initial high-dimensional attempt exposed a scaling defect in the old exact-value categorical recompression path. Exact unique numerical values were repeatedly triggering whole-history symbolic searches even though they did not recur categorically. The fix was architectural rather than modality-specific: global categorical recompression is now a dimension-aware proposal search. Exact contact still enters M every update, existing structure still refreshes incrementally, and the global search cadence scales with receptor dimensionality.

### `continuous-temporal-reuse.test.js`
Raw numerical contact forms two independent first-order continuous relation terms. Fresh supporting evidence becomes ordered lived occurrences in M. The existing generic `sequence-recompression.js` law then forms first-class higher ordered relations from those relation identities and recursively forms a depth-2 relation containing an earlier learned relation. On the passing frontier run there were 2 first-order relation terms, 32 ordered relation occurrences, 2 learned ordered relations, and maximum recursive depth 2. Exact raw contact remained beneath the hierarchy and no temporal/modality authority was added.

### `single-channel-waveform.test.js`
A single unlabeled numerical receptor receives a raw periodic waveform. The same C discovers a lag-4 self-relation as ordinary M content. Reality later changes to a different raw period; the lag-4 route leaves current M, a lag-3 self-relation becomes current, the old relation identity remains historically available, and every old waveform sample remains exact. No audio, spectrum, waveform, temporal, or memory state is introduced.

## Frozen certification evidence

### First frozen cross-domain certification
`agi/CERTIFICATION_FREEZE_20261020.md` froze an earlier candidate before evaluation. Its post-freeze test passed runtime-generated vocabulary, late receptor/actuator growth, raw language acquisition, variable-length/contextual expression, canonical two-hop reasoning, unseen correction, history retention, and no parallel authority.

### Frozen open-discourse certification
`agi/CERTIFICATION_FREEZE_OPEN_DISCOURSE_20261021.md` froze the later discourse-capable candidate before its evaluation was authored. `post-freeze-open-discourse-certification.test.js` passed: a broad relation-unspecified response composed raw-learned facts plus a two-hop canonical fact; after recurrent contradiction, the second broad response changed only the corrected fact while preserving unaffected facts and superseded exact contact.

### Frozen continuous-contact certification
`agi/CERTIFICATION_FREEZE_CONTINUOUS_20261021.md` froze cognition at `40cdaeceb32c78c01a1cd324405e7f156c9bf3b7` before the randomized evaluation was authored. `post-freeze-continuous-certification.test.js` was then run against that detached frozen cognition and passed: the post-freeze evaluation generated 33 initial receptors, randomized source/target topology, coefficient signs/magnitudes and lags, introduced receptor 33 only later in the same life, then broke one relation while unrelated delayed and late-receptor relations survived. Exact old contact remained intact and no modality-specific authority appeared.

These freezes remain historical evidence even as later developmental candidates advance.

## Certification discipline

For certification, cognition is frozen before the evaluation is authored. After that freeze, only a fresh M and new experience may change. `C`, public bridges, structural helpers, and domain-specific reasoning code may not be modified in response to the certification evaluation. Failure rejects that frozen candidate for that target; a repair requires a new freeze and a new post-freeze evaluation.

## Current frontier

The continuous learner now satisfies the bounded bridge that was previously missing: raw contact can become a first-order relation, fresh instantiations of that relation become lived occurrences, and those relation identities can recursively become material for higher ordered relations through the existing generic sequence law. A single raw channel can likewise develop and correct short-lag temporal self-relations.

The immediate structural limit is no longer modality integration; it is temporal scale. `continuous-relational-contact.js` currently searches only through lag 4 inside its retained evidence window. The next falsification therefore uses an unlabeled single raw waveform whose exact recurrence lies beyond lag 4. The correct repair must enlarge temporal discovery generically, not add FFT, phoneme, audio, or other modality-specific cognition.

After short-window arbitrary-lag recurrence is solved and frozen, the next scale is recurrence beyond one raw evidence window. That should be attacked through generic multiscale/hierarchical temporal structure rather than unbounded brute-force sample comparison. Real-media tests should continue to feed direct waveform/pixel measurements rather than semantic labels.

The repository is treated as the AGI implementation. Every new faculty must emerge as use of the same M/C rather than as a parallel cognitive module. External replication remains an independent standard for claims made beyond the repository's demonstrated evidence.
