# One-live-M blueprint checkpoints

Specification law:

`M(t+1) = C(M(t) ⊕ R(t+1))`

This directory is an experimental implementation/falsification surface for the one-live-M blueprint. It does **not** create a second cognitive authority. `one-live-blueprint.js` returns canonical `M` from `../one-mind.js`; its exported `C` is the single experimental developmental entrypoint. Durable cognitive content remains in canonical M. Sequence recompression and query-relative completions are derived views only.

## Implemented blueprint commitments

- one persistent M; `Memory = M`
- one C entrypoint
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
- query-relative expression completion is derived only from retained M contact
- relation roles are induced from crossed experience rather than preassigned channel meaning
- proposal/evidence distinction: first token↔contact pairing proposes; later recurrence supplies support
- current-state correction can supersede an older relation while old occurrences remain retained
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

## Current evidence boundary

These gates demonstrate a substantially stronger one-live-M developmental architecture than the previous bounded PR48 state. They do **not** establish unrestricted AGI.

The remaining objective AGI certification boundary is specific:

1. broad ordinary-language semantics must be acquired/grounded from unrestricted lived relational contact rather than a narrow schooling curriculum with supplied accompanying channels;
2. expression must support open-ended variable-length discourse from arbitrary M-owned relational structure, not only learned structural answer forms;
3. realistic high-dimensional continuous modalities such as raw audio/video must pass the same developmental law at useful scale;
4. frozen/external cross-domain evaluation must show continued acquisition, transfer, correction, and action without changing C.

An external language model may not be used to hide these gaps. If used at all, it can only be a zero-authority proposer/renderer whose semantic output is constrained by M; its fluency is not evidence that this system itself acquired language.

The repository must continue to distinguish: architecture implemented, bounded behavior demonstrated, and unrestricted AGI demonstrated. The last claim remains false until the certification boundary above is actually passed.
