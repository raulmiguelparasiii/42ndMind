# Order-native recursive recompression

The developmental law already contains succession:

```text
M_(t+1) = C(M_t ⊕ R_(t+1))
```

where `⊕` means that the next reality-contact is appended to the history that produced the current mind. No `step1`, `step2`, timestamp, lag label, or temporal concept is required from the caller.

For an ordered history `S`, the same recompression objective is applied to adjacent structure:

```text
C(S) = argmin_D [ L(D) + L(S | D) ]
```

subject to exact reconstruction of `S` from the learned descriptions and residual sequence.

The finite proof-of-concept uses binary learned descriptions. A repeated adjacent pair is replaced only when the symbol declaration plus its two-part definition and residual stream are shorter than the unrecompressed stream. Learned symbols may occur inside later learned descriptions, so repeated application recursively creates longer order-sensitive structures.

The test supplies only a bare event stream. It first contains many occurrences of:

```text
request, ignore
```

plus a few occurrences of the reverse order. The compressor learns `request -> ignore` as reusable ordered structure but does not equate it with `ignore -> request`.

Later experience repeatedly extends the same succession:

```text
request, ignore, repeat
```

and then:

```text
request, ignore, repeat, high-context, withdraw
```

The longer structures are learned recursively from earlier compressed structure. No temporal role names are present in the experience.

Every recompression is required to decode to the exact original event order. Therefore compression cannot gain apparent structure by deleting, permuting, or rewriting experienced events.

This establishes a narrower claim than "the system understands time." It establishes that the succession already inherent in `t -> t+1` can become usable learned relational structure under the same recompression law. Duration, simultaneity, metric time, causal direction, and counterfactual temporal reasoning remain separate falsification targets rather than assumed faculties.
