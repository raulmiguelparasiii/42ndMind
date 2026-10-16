# 42ndMind Universal Language Track — living project memory

This is the single living memory file for the non-canonical Universal Language Track. Update this file as the project changes. Do not create additional handoff/memory files for conversational continuity. Existing checkpoint/design files are historical evidence records, not competing project memory.

If a future conversation says **“continue the 42ndMind Universal Language Track”**, read this file first, then `AGENTS.md`, and inspect implementation/checkpoint files only when needed for the task. The repository is authoritative; absence from conversational context is not evidence that a capability is absent.

## 1. Two related projects

### Canonical 42ndMind

The older canonical project targets one continuously existing artificial mind:

```text
M_(t+1) = C(M_t ⊕ R_(t+1))
```

`M` is the one developing mind, `R` is reality contact, and `C` is a compact content-neutral developmental transformation: completion, correction, recompression, relation discovery/reuse, and reopening under counterevidence.

The intended direction is reality-first and developmental:

```text
reality contact
    -> foundational relations in one continuing M
    -> increasingly complex internal structure
    -> language eventually attaches to / expresses those grounded relations
```

The canonical project made substantial progress in a bounded artificial world. It learned reusable internal relations from contact, developed persistent anonymous concepts, attached arbitrary word labels bidirectionally, and later showed bounded compositional language and autonomous survival behavior. The bottleneck was not that this direction had failed. The project became large enough that conversational context loss repeatedly caused already-solved mechanisms and design reasons to fall out of view. Its language frontier also remained difficult because it was trying to grow the grounded relational mind first and make English interoperate with the resulting internal relations afterward. The bounded micro-world was useful as an architectural test, but it was still an artificial world whose designer-supplied structure could itself be an inferior or mistaken representation of reality.

Do not replace canonical `one-mind.js`, `M`, or `C` with the parallel Universal Language Track.

### 42ndMind Universal Language Track

The parallel project attacks the language/meaning seam from the other direction:

```text
natural-language intention / mathematical notation / code / other expression
                    <->
       universal mathematical relational structure
                    <->
                 reality
```

Its live state currently follows:

```text
U_(t+1) = F(U_t ⊕ X_(t+1))
```

with `U.whole = 1`, arbitrary relation intake, grounding, stabilization, equivalence/overlap resolution, contradiction/correction, propagation, unresolved mass, and inspectable mathematical anatomy.

The important methodological difference is that this track does not require us to wait for a toy world to rediscover every relation from scratch. An LLM, human, text, or other source may cheaply propose candidate relational structures because the present source may already understand enough of the intended relation to make a useful translation. Proposal is not truth: the mathematical/reality system must be able to merge, distinguish, support, weaken, defeat, reopen, or split those candidates. This lets the project move much faster while keeping correction open.

## 2. Universal language target

The target is not a dictionary of English words and not merely a vector/address space. The target is a mathematical relational substrate in which the internal structure itself carries the meaning.

Different natural languages may each have their own lexical/phrase dictionary or learned interface:

```text
English surface ----\
Indonesian surface ---\
Tagalog surface ------- > universal relational object <-> reality
math notation --------/
programming syntax ---/
```

The dictionaries/interfaces are language-specific. The universal language is not. Ideally paraphrases and translations converge because they instantiate the same relational object.

The universal language is intended to be mathematical in substrate, not a second non-mathematical language beside mathematics. Ordinary mathematical notation is one possible surface serialization of the same underlying relational structures.

## 3. Current evidential status

Established bounded results:

```text
mathematical encoding/address/correlation                    = demonstrated broadly in bounded English tests
grounded executable/state-transition mathematical anatomy   = demonstrated in 16 bounded anti-cheat families
Stone-pole primer-grounded relational mathematical anatomy   = demonstrated 7/7
closed Stone recursive mathematical compilation              = demonstrated for all 7 Stone structures
Empathy intervention/reality-contact bridge                  = demonstrated in bounded anonymous novel worlds
corrigible external relation proposals                       = demonstrated
recursive relation reduction + canonical normal form         = demonstrated in bounded structural tests
full arbitrary abstract/compositional intention anatomy      = not yet demonstrated
all Stone structures grounded from unrestricted raw reality  = not demonstrated
universal mathematical language                              = target, not established result
```

### Grounded executable intentions

Sixteen executable/state-transition families yield inspectable mathematical predicates over before/after coordinates. English labels are not the mathematical answer. Relevant neighboring intentions remain mathematically distinct, English-only holdouts resolve to their anatomy, counterevidence can reopen anatomy, non-temporal insertion order is invariant in the tested gate, and the local whole remains `1`.

### Stone mathematical structure

The seven basic Stone states — externally labelled Empathy, Practicality, Knowledge, Wisdom, Answerability, Insulation, and Absence/null — each compile to a distinct finite mathematical relational object. The live compiled object recursively expands lower semantic ingredients and reduces source relation words to a fixed generic operator basis. The English pole names are optional audit annotations.

Current fixed operator basis in `stone-closed-math.js`:

```text
O0  membership / set incidence
O1  finite mapping
O2  dependence under variation
O3  restriction / admissible-subset relation
O4  state update under event/intervention
O5  order / scale
O6  entailment or support
O7  incompatibility
O8  equivalence under declared core
O9  composition
O10 cardinality
```

Each anonymous Stone structure is therefore a finite operator-labelled relational graph/tensor plus scalar constraints rather than an English-named algebraic variable.

Let the seven compiled structures be `G0...G6`; their external legend currently maps them to Empathy, Practicality, Knowledge, Wisdom, Answerability, Insulation, and Absence, but runtime computation does not require those names.

The directional pairing is stored numerically:

```text
P = [[0,1],[4,5],[3,2]]
```

Let `φ(Gi,R)` be the structural fit/instantiation of anonymous structure `Gi` in current relational contact `R`. Define:

```text
δ(a,b) = 0                 if a+b=0
       = (a-b)/(a+b)       otherwise

d = (
      δ(φ(G0,R),φ(G1,R)),
      δ(φ(G4,R),φ(G5,R)),
      δ(φ(G3,R),φ(G2,R))
    )

C(d) = |d1|+|d2|+|d3|

Π(d) = 0                   if C(d)=0
     = d/C(d)              otherwise
```

This is a compressed anonymous directional/structural projection without requiring `E`, `P`, `W`, `K`, `A`, or `I` as unexplained algebraic placeholders. `Gi` denotes an actual anonymous finite relational structure, not a semantic name. It must not automatically be identified with the full Stone orientation unless its magnitude relative to the active referent is warranted.

Null/absence compiles to zero entity-referent relational cardinality and gives zero directional structure; it is not Collapse/Insulation.

#### Correct Stone frame: entity q, referent r, development, realization

Do **not** use `r` as an independent scalar for development. In the Stone source, `q` is the entity and `r` is the materially relevant referent/scope. The actual orientation is the entity–referent relation

```text
Φ(q,r) = (x,y,z) ∈ O_r
O_r = { (x,y,z) ∈ R^3 : |x|+|y|+|z| <= 1 }
```

Development is already the L1 magnitude of that relative orientation:

```text
L1(q,r) = ||Φ(q,r)||_1 = |x|+|y|+|z|
```

so:

```text
L1(q,r) = 0       null relative to r
0 < L1(q,r) < 1   developing orientation relative to r
L1(q,r) = 1       formed stance relative to r
```

Realization extends the frame by changing the materially relevant reality itself:

```text
r -> r'
Φ(q,r) -> Φ(q,r')
```

The entity `q` remains the same while the scope against which it is situated changes. A broadened `r'` may make unchanged prior development occupy a smaller proportion of the now-relevant reality and therefore place the entity closer to null relative to that larger scope; realization can also reorganize the orientation itself.

Therefore the previous living-memory idea `p = r Π(d)` with `r∈[0,1]` as a free completion scalar was a notation/structural mistake and is withdrawn. The full interior should eventually be obtained by grounding `Φ(q,r)` itself relative to the active referent, not by attaching an independently named radial variable to a normalized direction. The current `projectSurface(d)` utility is a surface/direction projection for the bounded closed-math experiment; it must not be cited as proof that an arbitrary developing orientation has already reached the stance boundary.

### Empathy reality contact

Empathy is no longer only a stored/primer graph. `stone-reality-contact.js` can mine anonymous intervention contact with no pole name or semantic relation label supplied to the miner. In a novel world with renamed IDs it can recover the non-self consequence-bearing state channel whose changes can change the queried orientation. Self-only behavior, observational correlation without controlled dependence, and a broken consequence chain are rejected in the bounded gate.

### Corrigible relation proposals

`relation-hypotheses.js` allows LLMs, humans, texts, or other sources to propose mathematical relational patterns without granting them authority. Verified properties include:

```text
proposer confidence is not truth
alpha-equivalent proposals merge
incomplete contact remains unknown
independent matched structure can support a proposal
complete counterevidence can defeat a proposal
later counterevidence can reopen a previously supported proposal
```

This is the scaffold for broad relation seeding. The proposer may be useful precisely because it can translate a concept into many candidate relations faster than a toy world can rediscover them, while the live system remains responsible for correction.

### Recursive reduction / canonical relational normal form

`relational-normal-form.js` addresses the fact that even the current operator vocabulary must not be treated as metaphysically final merely because it is convenient. A relation symbol may itself have a relational definition, and that definition may recursively contain other defined relations.

The generic pipeline is:

```text
surface relation pattern
    -> recursively expand warranted relation definitions
    -> preserve undefined/circular remainder explicitly
    -> canonicalize the resulting directed labelled structure
    -> compare canonical normal forms
```

The bounded falsification gate verifies that independently named nested relation systems converge when they reduce to the same terminal structure; arbitrary vertex names and edge order do not matter; corrections to a lower definition change dependent normal forms; materially different terminal structure stays different; and circular definitions terminate as explicit unresolved reduction rather than being guessed away.

This does **not** prove that `O0...O10` are the final irreducible relations. It supplies machinery for reducing them too if later warranted definitions are discovered. The universal invariant is therefore intended to be the recursively reduced relational structure up to structure-preserving equivalence, not a privileged alphabet of operator names.

## 4. Meaning of `1`

Do not force heterogeneous semantic relations to be mutually exclusive probability pieces merely so they add to one.

For a resolved intention predicate `P_I`, let:

```text
K_I = { ω : P_I(ω) }
```

Then the local resolved whole is:

```text
μ_I(K_I) = 1
```

The constraints jointly define the whole. Under uncertainty, resolved candidate mass plus explicit unknown mass may close to one. Overlapping relations may overlap, nest, coincide, contradict, or contain one another; resolution must handle that structure rather than naïvely summing raw relations.

Useful shorthand:

```text
add freely, resolve globally
```

## 5. How intent mathematization and universal-relation discovery interact

These are not separate sequential goals. They are the same developing relational system viewed from two directions.

When an intention is mathematized, its meaning is exposed as a composition of more general relations. Repeated successful decompositions reveal relations that recur across otherwise different intentions. Those recurrent relations become candidates for the universal relational vocabulary/basis. Conversely, once such relations stabilize, future intentions can be expressed more directly as compositions of already-grounded relations.

So the loop is approximately:

```text
expression/intention
    -> propose/expose relational anatomy
    -> compare with existing relations
    -> recursively reduce / canonicalize when definitions exist
    -> merge/reuse/split as warranted
    -> ground/correct against reality and formal constraints
    -> strengthen the universal relation field
    -> use the improved field to reinterpret old and new intentions
```

There should be one authoritative relational state, not a frozen dictionary plus a separate semantic theory. Older intentions should be able to refine when the relation field becomes better resolved.

## 6. Success criterion

For an expression/intention `I`, a convincing universal result should produce an explicit mathematical relational object `M(I)` such that:

1. internal relations carry the semantic distinctions rather than an opaque label;
2. paraphrases/translations converge because of those relations;
3. relevant differences produce corresponding mathematical differences;
4. objects compose recursively from stabilized relations when possible;
5. relation symbols themselves can recursively reduce when warranted, so arbitrary operator vocabulary does not define identity;
6. unknown/underdetermined parts remain unresolved instead of guessed;
7. grounding can correct them later without manually patching a semantic dictionary;
8. the resolved object closes as the relevant whole `1` without falsely treating overlapping relations as disjoint mass;
9. non-temporal evidence order should not arbitrarily change the resolved result;
10. surviving structure is inspectable enough to explain what each relation contributes;
11. source confidence, prestige, or fluency cannot substitute for independent support.

## 7. Context-loss rule

Before proposing an architectural addition or claiming a missing capability:

1. read this file and `AGENTS.md`;
2. search the repository for the capability/invariant;
3. recover why the existing mechanism was introduced and what falsification it survived;
4. treat absence from active context as unknown, not as evidence of absence;
5. prefer bounded additive experiments over rewriting canonical `one-mind.js` when the relationship is uncertain;
6. preserve prior falsification evidence.

Historical checkpoint/design files may be consulted for exact evidence, but this file is the one living continuity document for the Universal Language Track.
