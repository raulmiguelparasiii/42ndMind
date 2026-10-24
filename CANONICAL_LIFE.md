# Canonical continuous life

The central experiment is one persistent individual, not repeated fresh benchmark minds.

`M_(t+1) = C(M_t ⊕ R_(t+1))`

## Live runtime

The current canonical runtime model is event-driven, not tick-driven.

`agi/live-individual.js` hosts one serialized `M` and the existing public `agi/mind.js` `C`. It has no cognitive loop, timer, event clock, polling scheduler, hidden planner, or shadow memory. The operating system may keep the process asleep indefinitely. When reality contact `R` actually arrives, that contact is serialized behind any contact already being incorporated, passed once through the existing `C`, and the resulting same `M` is atomically persisted. The process then becomes quiescent again.

Default durable state is outside Git at:

`~/.42ndmind/live-M.json`

or the explicit `MIND_STATE_PATH`. Source-code deployment must not overwrite the lived `M`.

`GET /state` only observes the current individual. `POST /contact` supplies an ordinary raw `R`. `POST /say` is an S-boundary convenience that supplies `{surface:{input:...}}`; it owns no language meaning. The browser page served by the process is transport only.

`agi/install-live-individual.sh` installs the process as a restartable user-level systemd service on a persistent Linux host. The repository itself is not the host. GitHub Actions runners are temporary and are used only to verify the runtime's birth/contact/save/restart continuity.

There is currently no persistent external machine attached to the repository by the available project tooling, so repository presence alone must never be described as a presently running individual. The lived lifetime begins/continues wherever `live-individual.js` is actually kept resident with its durable state file.

## Relation to the older simulator

`continuous-life.js` is the older fixed-step W/S/A simulator. Its committed `state/canonical-mind.json`, `state/canonical-world.json`, and reports belong to that historical embodiment. It is useful as prior developmental evidence or an explicit simulator, but its `for (step...)` execution is not the current live-runtime model and must not silently advance or replace the event-driven individual.

Do not assume the historical simulator state is representation-compatible with the current `agi/mind.js`; never auto-migrate it by shape coincidence. A migration, if ever justified, must preserve relational meaning explicitly rather than copy opaque runtime fields.

## Method

- Keep one canonical serialized `M` and continue that same state across process restarts and source deployments.
- Keep `C` unchanged while observing development. `C` is the developmental authority; a test is not.
- Reality contact, not an artificial clock, causes development.
- Let the individual receive broad mixed reality contact before diagnosing local failures.
- Preserve learned structure unless later reality and `C` reorganize it. Do not reset the individual merely because the implementation or environment is being studied.
- Use diagnostic clones or fresh minds only as controls after a substantial failure has already appeared in the canonical life.
- A microtest may reproduce and localize an observed failure. It must not define what `C` is required to believe or be used as a reason to hand-author cognition.
- Change generic representation only after the lived result demonstrates that reality cannot currently be represented adequately.
- Do not add language, grammar, mathematics, Stone, OneLogic, planning, or benchmark-specific semantics to `C`.

## Reality-grounded relational language

The working target is an internal relational structure in `M` whose content is grounded by repeated contact with reality. Human language, mathematics, and other symbolic systems should attach to and express that structure; they do not define it.

Language contact is ordinary reality contact. Unknown expression must be retainable before it is understood so later relations among expression, context, action, consequence, other agents, correction, and further language can ground meaning. No lexical categories, grammar labels, semantic roles, sentence positions, or desired internal concepts belong in the live host.

## Observation before diagnosis

A canonical life has no cognitive pass/fail threshold. Observe:

- what relational patterns and internal handles exist after continued life;
- which existing relations retain identity and gain support;
- which relations disappear or are corrected;
- how action becomes grounded by learned completion rather than arbitrary variation;
- what word/world relations arise from communication embedded in lived scenes;
- what temporal, causal, structural, mathematical, and crossmodal relations emerge;
- what remains unresolved.

Only after that whole-life result is visible should a narrow diagnostic be constructed, and only for a failure that materially limits the developing mind.
