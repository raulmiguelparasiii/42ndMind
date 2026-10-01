# One Objective Logic formal attack lab

This directory is intentionally separate from the existing `kernel.js` runtime. It is a hostile test harness for the candidate universal reality-tracking semantics developed in the project.

## Semantic core under test

Let `M` be a class of complete structured possibilities, `actual ∈ M` the one actual structured reality, and `K ⊆ M` the live possibilities compatible with the reasoner's presently warranted explicit representation.

Queries may be partial and multi-valued. Strict categorical consequence is invariance across `K`. Inquiry/intervention is modeled by an objective relation `T ⊆ M × O × M`.

The lab tests these claims:

1. **Greatest sound categorical consequence.** A categorical assertion is sound over `K` iff it is invariant over every live world in `K`.
2. **Sharp sound update.** After outcome `o`, `U*(K,o) = {m' : ∃m∈K, (m,o,m')∈T}` is the unique smallest posterior that remains sound for the modeled channel.
3. **Pooling.** Two sound states about the same represented reality cannot become empty merely by intersection.
4. **Correction direction.** Once actuality has been excluded, subset-only contraction cannot recover it.
5. **Observation preservation.** A faithfully modeled actual observation preserves actuality.
6. **No information from a nondiscriminating observation.** If all live worlds generate the same observation, conditioning on it cannot shrink `K`.
7. **Identifiability.** An inquiry identifies `q` only if equal observable outcomes imply equal defined `q` values over the live state.
8. **Query-relative minimality.** The quotient by complete query-signature is adequate, and any representation merging different signatures is inadequate.
9. **Open ontology.** If actuality is absent from the current model class, no correction confined to subsets of that class can recover actuality.
10. **Undefined is not false.** Partial/self-reference-sensitive queries are not automatically forced into Boolean truth values.
11. **Fallacy dominance.** Relative to an independently defined ideal inference/update, deviations split into unsupported exclusion and unsupported retention. The exact ideal has zero deviation and dominates any materially deviant alternative.
12. **Bridge validity.** A claimed premise-to-conclusion bridge fails when one live counterexample satisfies the premise and defeats the conclusion. This separates bad inference from mere insult, tone, or genuinely held but irrelevant belief.

## What the executable tests establish

`formal/one_logic/falsifier.py` exhaustively enumerates finite countermodels for the tractable bounded cases and also performs deterministic seeded attacks on larger dynamic transition systems. A passing run establishes that no counterexample exists inside the enumerated finite search space.

It does **not** by itself prove the corresponding theorem over arbitrary infinite structures. The general theorem statements are formalized in `formal/lean/OneLogic.lean` and kernel-checked by Lean in CI. The executable lab remains a separate counterexample engine and implementation audit.

## Run

```bash
python -m unittest discover -s tests -v
PYTHONPATH=formal python -m one_logic.falsifier
```


## Proof checking

The general theorem statements in `formal/lean/OneLogic.lean` are checked by Lean and rechecked in CI with Lean's `leanchecker`. CI also runs an axiom audit so hidden `sorry` placeholders or unapproved axioms cannot silently certify a theorem.

An additional nanoda external-checker experiment was attempted against Lean 4.34.1 and 4.28.0. In both environments the current `lean-action` nanoda integration exported the module successfully but the nanoda executable aborted before checking it with `invalid digit found in string`. Because this is a checker-tool/integration failure rather than a theorem failure, nanoda is not a required gate in this branch. It should be re-enabled if that toolchain issue is resolved.
