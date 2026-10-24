# Cognitive certification freeze — 2026-10-20

Candidate source head before this documentation-only freeze commit:

`eb567c1a7c129eb26cbb5791c5e191dfe504195f`

The cognitive implementation is frozen for the next certification attempt.

Pinned cognitive/specification blobs:

- `one-mind.js` — `922347a5ed55eeaa1340bcdbe9524825db79642a`
- `agi/one-live-blueprint.js` — `bb8a89b9b604608acc4549bc07698f30209d527e`
- `agi/mind.js` — `4f0f7143ccfd11a6a1cc42b09c7c00efbc35d825`
- `agi/surface-template.js` — `0adb80505814407f2991057e6e77be347015cd5e`
- `agi/BLUEPRINT.tex` — `0087c891493123de7186ce80e78eff503115e7f4`

All developmental blueprint gates immediately preceding this freeze passed, including:

- new sensor / cross-channel relation discovery;
- position-free surface composition;
- whole-life mixed contact and new actuators;
- multi-relation conversational growth and correction;
- randomized runtime vocabulary/channel order;
- canonical-M language grounding;
- public-entrypoint correction;
- variable-length surface realization;
- cross-turn contextual subject carry;
- raw surface-only semantic proposal, recurrent warrant, completely unseen replacement-value correction, and canonical-M query answering.

## Freeze rule

From this freeze until the certification verdict:

- no changes to the four cognitive implementation files above;
- no changes to canonical `one-mind.js`;
- no domain-specific reasoning or semantic code may be added;
- only evaluation code, workflow wiring, documentation, and fresh experience/state may be added;
- evaluation vocabulary/domains must be authored after this freeze and must not appear in the frozen cognitive source;
- failure is a failed candidate, not permission to patch this frozen candidate and rerun the same certification.

If the certification fails, any general repair starts a new candidate and requires a new freeze plus a new post-freeze evaluation.

Passing the next certification is evidence of frozen cross-domain transfer. It is not, by itself, permission to call the system unrestricted real-world AGI; realistic modalities and external replication remain independent requirements.
