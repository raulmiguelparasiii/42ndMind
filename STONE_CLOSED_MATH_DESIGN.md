# Closed Stone mathematics — working design

This document belongs to the narrower universal-language track. It does not change the canonical `one-mind.js` mind.

Goal: replace English pole names as algebraic placeholders with a finite mathematical structure whose English labels are optional annotations. The Stone's lower semantic ingredients are also recursively expanded until the live object bottoms out in generic mathematical primitives: finite sets, directed incidence, Boolean/scalar properties, function/update relations, conjunction, normalized signed difference, and L1 normalization.

The object is primer-grounded: the Stone's definitions supply the relational content. This is not a claim that the Stone was autonomously rediscovered from raw reality.

Higher-order construction:

```text
x = Δ(E,P)
z = Δ(W,K)
y = Δ(A,I)
Δ(a,b) = 0                         if a+b=0
       = (a-b)/(a+b)               otherwise

d = (x,y,z)
C(d)=|x|+|y|+|z|
q = 0                              if C(d)=0
  = d/C(d)                         when a formed orientation is projected to the surface
```

Here E,P,W,K,A,I are not English variables in the compiled object. They are pattern-fit values for six anonymous recursively expanded finite relational structures. English names live only in an external legend.

Null / absence is the zero-contact case: no developed orientation and no formed relationship with the referent, hence all signed balances are zero and `q=(0,0,0)`.

The next implementation file compiles the Stone's primer into anonymous incidence tensors and evaluates signed coordinates from structural fit. It must expose both the pure math object and an optional explanatory legend, and tests must verify that deleting the legend does not change any result.
