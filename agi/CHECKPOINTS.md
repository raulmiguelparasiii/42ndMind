# One-live-M blueprint checkpoints

Specification law:

`M(t+1) = C(M(t) ⊕ R(t+1))`

`agi/mind.js` is the current experimental public entrypoint. It returns the same canonical `M` from `../one-mind.js` and exposes one `C`. `one-live-blueprint.js` supplies generic developmental mechanics; `mind.js` adds a zero-state surface↔canonical-M bridge. Neither owns independent truth, memory, planning, or semantic state. Durable cognitive content remains in canonical M.

## Implemented blueprint commitments

- one persistent M; `Memory = M`
- one public C entrypoint
- exact lived numeric and ordered-surface contact retained in M
- first-class persistent `self` relations in M
- simultaneous numeric, ordered-surface, structured-relational, and actuator contact
- later-added receptors can participate in learned relations without changing C
- later-added actuators expand the physical possibility boundary without a new planner/mind
- relations discovered from contact can be recursively recompressed
- unknown contact is not forced false
- zero-entropy invariant completion is handled generically rather than by language rules
- surface tokenization is mechanical; no semantic dictionary is stored outside M
- surface order is not fixed to hard-coded input slots
- relation roles are induced from crossed experience rather than preassigned domain meaning
- proposal/evidence distinction: first pairing proposes; later recurrence supplies support
- current-state correction can supersede an older relation while old occurrences remain retained
- ordinary surface language can read a relation that exists only in canonical current M
- surface↔relation attachment can be learned from simultaneous generic `(subject, relation, object)` contact without a test-supplied semantic channel array
- canonical rule closure, not the surface learner, can derive the answer that is later expressed
- no private `language_state`, `memory_state`, planner, response table, or modality-specific cognitive authority

## Falsification gates

### `blueprint-e2e.test.js`

Demonstrates in one life:

- a new sensor is attached after development begins;
- unchanged C discovers a relation involving it;
- an ordinary text question/answer pair never experienced during schooling is compositionally completed;
- expected reply: `it is red.`;
- exact contact remains retained.

### `free-surface.test.js`

Demonstrates:

- ordinary text contact is stored in M as exact raw expression + ordered tokens;
- fixed positional input slots are not required;
- unseen word orders `alpha is what color?` and `what is alpha color?` complete to the same grounded answer;
- no private language authority is introduced.

### `whole-life.test.js`

Demonstrates one C call can carry at once:

- numeric sensing;
- ordered surface contact;
- structured relational contact;
- a newly attached actuator.

The same M also recursively recompresses repeated book-like ordered contact, retains the raw contact beneath the abstraction, and accepts another new actuator later.

### `conversation-growth.test.js`

Demonstrates:

- two independently crossed relation types are disambiguated from ordinary wording;
- the held-out individual answers both relation questions correctly;
- `red` later changes to `teal` without reset;
- historical red contact remains in M;
- a new individual is learned later in the same life;
- an unseen word order is answered from that later learning.

### `randomized-generality.test.js`

Runs eight independent lives with:

- runtime-generated nonsense vocabulary;
- randomized physical channel order;
- independently identifiable relation roles;
- held-out entity/relation composition;
- a completely new relation **and** new physical channel introduced only after development;
- no C change between lives;
- later correction without reset.

This gate exists specifically to prevent passing by fixture-specific vocabulary, fixed channel meanings, or memorized response pairs.

### `canonical-language-bridge.test.js`

Demonstrates:

- the test supplies no semantic channel array;
- ordinary surface occurrences are paired only with simultaneous generic relational facts;
- the exact held-out alpha/color question-answer pair never occurs;
- canonical M derives `alpha -> has_color -> red` from a world relation before the query;
- the ordinary question reads that current canonical fact and expresses `it is red.`;
- grounding authority is reported as `canonical_M`, not a language store.

This closes the previous seam where a surface analogizer could answer from its own episode bundle without proving that language was attached to the same live relational state used for general reasoning.

## Current evidence boundary

The branch now demonstrates a materially stronger implementation of the blueprint. It still does **not** establish unrestricted AGI.

The remaining objective AGI certification boundary is narrower and specific:

1. ordinary-language acquisition must scale from bounded relational schooling to broad open-ended language learned through unrestricted lived contact;
2. expression must support open-ended variable-length discourse and composition from arbitrary M-owned relational structures, rather than only structural answer forms learned from finite dialogue experience;
3. realistic high-dimensional continuous modalities such as raw audio/video must demonstrate useful multiscale relation formation under the same C at realistic scale;
4. a frozen external cross-domain evaluation must show continued acquisition, transfer, correction, conversation, and action without modifying C.

An external language model may not be used to hide these gaps. If one is ever used, it can only be a zero-authority proposer/renderer constrained by M; its pretrained fluency is not evidence that this system itself acquired language.

The repository must continue to distinguish: architecture implemented, bounded behavior demonstrated, and unrestricted AGI demonstrated. The last claim remains false until the certification boundary above is actually passed.
