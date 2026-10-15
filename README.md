# 42ndMind

42ndMind is a browser-based formal evaluation kernel. It accepts mathematical expressions, propositional logic, typed rule packages, symbolic constraint packages, logic capsules, OGTS component packages, and finite declared-case comparisons between formal logics.

The default result remains binary:

```text
𝕂 + x → {0,1}
```

`1` means that the submitted query is admitted within its compiled role and declared scope. `0` means it is not admitted. A zero may represent disproof, a counterexample, contradiction, underdetermination, a missing domain condition, provisional dependence, or unsupported syntax. Use filters such as `why`, `proof`, `certificate`, `counterexample`, `variables`, and `gaps` to expose the reason from the same solved state.

## Version 0.2 symbolic execution

Version 0.2 replaces floating-point arithmetic and direct Boolean shortcuts with typed proof certificates for the implemented calculi.

Implemented:

- exact rational arithmetic with integer exponents;
- propositional truth-table validity and entailment;
- symbolic variables, substitutions, sign constraints, and suspended unknowns;
- domain-condition checks for division and cancellation;
- typed Horn-style rule closure;
- finite declared-case structural comparison between formal logics;
- exact or partially resolved OGTS minimum computation;
- provisional logic-capsule mounting, obligation discharge, defeat, and recomputation;
- read-only filters over the completed solved state.

This remains a bounded formal kernel. Natural-language statements must first be translated into explicit symbols, assumptions, rules, scope, and queries by a human or an external language model. A comparison certificate establishes only what follows within the supplied encoding and declared case class.

## Direct arithmetic

```text
0.1 + 0.2 = 0.3
```

returns `1` through exact rational arithmetic rather than binary floating-point tolerance.

```text
2 + 1 = 4
```

returns `0`. With `certificate`, the result includes the exact values and failed comparator.

## Symbolic relation with suspended variables

A bare relation such as:

```text
E = mc²
```

is compiled symbolically but returns `0` with status `underdetermined`, because entering an equation does not make it an accepted assumption. The variables remain visible and suspended.

To reason from the relation, submit a symbolic package:

```json
{
  "schema": "42ndMind.symbolic-package.v0.1",
  "scope": "mass-energy relation over reals",
  "symbols": {
    "E": "real",
    "m": "positive_real",
    "c": "nonzero_real"
  },
  "assumptions": [
    "E=mc²",
    "m>0",
    "c!=0"
  ],
  "query": "E>0"
}
```

This returns `1`. No numerical value for `m` or `c` is invented. The certificate shows that `c²` is positive from `c != 0`, `m` is positive, and therefore `E` is positive.

Change the query to:

```json
"query": "m=E/c²"
```

and the kernel derives the rearrangement. Remove `c!=0`, and it returns `0` with the gap `requires_nonzero:c` instead of cancelling an undefined divisor.

Change the query to:

```json
"query": "E=18"
```

and it returns `0` with status `underdetermined`; the unresolved magnitudes remain suspended.

## OGTS calculation

```json
{
  "schema": "42ndMind.ogts.v0.1",
  "components": {
    "G": 1,
    "E": 0.8,
    "P": null,
    "K": 0.9,
    "W": 0.85,
    "S": 0.75
  }
}
```

The kernel computes:

```text
OGTS = min{G,E,P,K,W,S+}
```

The exact value remains unresolved because `P` is suspended. The known components establish an upper bound of `0.75`. When all six components are supplied, the exact minimum is calculated. The default output is `1` only when the exact OGTS value is `1`.

## Comparing two formal logics

```json
{
  "schema": "42ndMind.logic-comparison.v0.1",
  "scope": "verification burden in the declared cases",
  "correction_open": true,
  "baseline": {
    "id": "fixed-burden",
    "rules": [
      { "if": ["disputed"], "then": "verify" }
    ]
  },
  "candidate": {
    "id": "proportional-burden",
    "rules": [
      { "if": ["disputed"], "then": "verify" },
      {
        "if": ["disputed", "high_magnitude", "weak_evidence"],
        "then": "high_verification"
      },
      {
        "if": ["disputed", "low_magnitude", "reversible"],
        "then": "proportionate_verification"
      }
    ]
  },
  "cases": [
    {
      "id": "high-stakes",
      "facts": ["disputed", "high_magnitude", "weak_evidence"]
    },
    {
      "id": "low-stakes",
      "facts": ["disputed", "low_magnitude", "reversible"]
    }
  ]
}
```

This returns `1` because the candidate preserves the baseline output `verify`, adds distinctions in the declared cases, derives no contradiction, and remains correction-open. The dominance certificate also states its limit: it proves the encoded finite comparison, not unrestricted superiority across every possible case or translation.

Use each logic's optional `outputs` array when only selected derived relations should count in the comparison. Use `mapping` when equivalent operations use different atom names.

## Filters

Common report filters:

```text
why
proof
derivation
certificate
correct-path
counterexample
canonical
variables
gaps
contradictions
dependencies
state
```

Filters read the solved state. They do not change the binary verdict.

## Local test

```bash
node test_42ndmind_pages_v0_1.js
```

The test suite covers exact arithmetic, propositional validity, symbolic suspension, mass-energy derivations, nonzero-domain safety, OGTS partial evaluation, finite logic comparison, and capsule defeat propagation.
