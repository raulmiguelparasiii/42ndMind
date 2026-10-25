# Architecture decision — one-being constraint as live M material

Date: 2026-10-24

The live law remains:

```text
M(t+1) = C(M(t) ⊕ R(t+1))
```

There is still one persistent canonical M and one developmental authority C. No reward system, task set, focus state, working-memory object, priority ledger, planner, or second cognitive state is introduced here.

## Whole

`whole: 1` may not remain only a construction tag. The same individual must remain accountable to unresolved structure produced by its own current settlement.

The live view is written as:

```text
B(M) = 1
```

Unknown or unresolved coordinates do not make the individual fractional or create another mind. They remain inside the same whole. A local helper is not allowed to make an unresolved current subset disappear merely because the next contact overwrites that helper's transient current representation.

`agi/whole-being.js` is a zero-state derivation over canonical M plus the current disposable affected field. It does not store a second being state.

## Current unresolved subset -> ordinary M formation

A non-empty current `unresolved*` / `unknown*` subset is read generically from `M.current`. When it occurs inside an actually grounded relational context, the unsolved constraint is reified as ordinary canonical M:

```text
whole-residual:<id>
  formation_status = open
  residual_path = <current coordinate>
  residual_value = <unresolved value>
  residual_term -> whole-residual-term:<id>
```

The residual term is future-bearable. Therefore the already-existing affected-field continuity rule can keep it current across unrelated contact without storing activation or priority.

Unrelated contact cannot resolve it. A recurrence of the same grounded relational context resolves the old residual only when the exact `[path,value]` constraint is absent. If the value changes, the old residual resolves and the new one forms.

## Lived occurrence, not bookkeeping

An unresolved constraint is also an internal M-owned lived occurrence on the same lived order that exposed it:

```text
whole-residual-occurrence
  kind = lived_occurrence
  instantiates -> whole-residual-term
  lived_order = current order
  grounded_by -> current lived contact
```

When the same grounded context later returns without that constraint, resolution is likewise a lived internal occurrence:

```text
whole-residual-resolution-occurrence
  kind = lived_occurrence
  instantiates -> whole-residual-resolution-term
  resolution-term resolves -> whole-residual
```

This is crucial. The existing generic ordered-recompression / recurrence machinery can now learn the actual relation between:

```text
unresolved constraint
-> intervening evidence / action / other lived material
-> resolution
```

No special learner knows in advance whether the material is language, embodiment, welfare, time, storage, compute, complexity, evidence, or some future modality. Those distinctions must come from experienced relational consequences.

## Direct saved-M4 inspection

This frontier was driven by the actual saved `continued-M4` state, not by CI or a synthetic benchmark.

M4 contained:

```text
22,210 retained relational facts
22,237 current closure facts
lived order 121
```

Its current `why do you say yume belongs to the animal class?` settlement contained two unsolved current coordinates:

```text
sequence.unresolved_channels = [1]
sequence.unresolved_output_positions = ["canonical_object"]
```

The live relational context already contained the canonical Yume class relation and its support. Reifying those two constraints produced two future-bearing canonical whole-residual terms.

Direct state mutation/inspection then showed:

1. replacing the transient current surface state with an unrelated `hello` state removed all current `unresolved*` fields but both canonical whole-residual terms remained future-bearing;
2. recurring the same grounded Yume context without those exact constraints resolved both and removed their forward pressure;
3. after adding generic lived-occurrence anatomy, both residual terms appear in the same generic temporal stream used by ordinary expressions, relations, actions, and internal evidence;
4. resolution terms occupy the later resolving lived order, making the successful transition itself learnable.

This is persistence from the unsolved constraint itself, not from attention or a task ledger.

## Boundary

This does not yet assert that every unknown is suffering, harm, or a motivational cost. Nor does it hard-code time, storage, compute, welfare, evidence, or complexity penalties. Those can become materially relevant only through the consequences the individual actually experiences or learns as relations in M.

The invariant also does not license a surface utterance merely because a relation is live. Expression remains a separate learned transduction problem.

Development continues by direct live-state/math inspection. Regression suites are collateral-damage guards only; they are not the evaluator of cognition.
