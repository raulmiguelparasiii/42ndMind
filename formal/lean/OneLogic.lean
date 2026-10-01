namespace OneLogic

universe u v o q r

abbrev Live (World : Type u) := World → Prop
abbrev Query (World : Type u) (Value : Type v) := World → Option Value
abbrev Transition (World : Type u) (Outcome : Type o) := World → Outcome → World → Prop

def NonemptyLive {World : Type u} (K : Live World) : Prop :=
  ∃ w, K w

def Categorical
    {World : Type u} {Value : Type v}
    (K : Live World) (query : Query World Value) (value : Value) : Prop :=
  NonemptyLive K ∧ ∀ w, K w → query w = some value

/--
T1. Any categorical rule that is sound over every live possibility is bounded by
invariance across the live state. With a nonempty live state, the sound conclusion
is a categorical consequence.
-/
theorem greatestSoundCategorical
    {World : Type u} {Value : Type v}
    (K : Live World) (query : Query World Value)
    (R : Value → Prop)
    (hNonempty : NonemptyLive K)
    (hSound : ∀ value, R value → ∀ w, K w → query w = some value) :
    ∀ value, R value → Categorical K query value := by
  intro value hR
  exact ⟨hNonempty, hSound value hR⟩

/-- Objective transition relation induced by an inquiry or intervention. -/
def SharpUpdate
    {World : Type u} {Outcome : Type o}
    (K : Live World) (T : Transition World Outcome) (outcome : Outcome) : Live World :=
  fun after => ∃ before, K before ∧ T before outcome after

/-- A posterior is sound for a channel iff it keeps every reachable posterior state. -/
def UpdateSound
    {World : Type u} {Outcome : Type o}
    (K : Live World) (T : Transition World Outcome) (outcome : Outcome)
    (posterior : Live World) : Prop :=
  ∀ before after, K before → T before outcome after → posterior after

/-- T2a. The sharp update itself is sound. -/
theorem sharpUpdateSound
    {World : Type u} {Outcome : Type o}
    (K : Live World) (T : Transition World Outcome) (outcome : Outcome) :
    UpdateSound K T outcome (SharpUpdate K T outcome) := by
  intro before after hK hT
  exact ⟨before, hK, hT⟩

/--
T2b. Every sound posterior contains the sharp posterior. Hence SharpUpdate is the
unique smallest sound posterior under set inclusion.
-/
theorem sharpUpdateSubsetOfEverySoundPosterior
    {World : Type u} {Outcome : Type o}
    (K : Live World) (T : Transition World Outcome) (outcome : Outcome)
    (posterior : Live World)
    (hSound : UpdateSound K T outcome posterior) :
    ∀ after, SharpUpdate K T outcome after → posterior after := by
  intro after hSharp
  rcases hSharp with ⟨before, hK, hT⟩
  exact hSound before after hK hT

/-- T3. Faithful modeled inquiry preserves the actual successor state. -/
theorem realityPreservedUnderFaithfulUpdate
    {World : Type u} {Outcome : Type o}
    (K : Live World) (T : Transition World Outcome)
    (actual actualNext : World) (outcome : Outcome)
    (hActual : K actual)
    (hReality : T actual outcome actualNext) :
    SharpUpdate K T outcome actualNext := by
  exact ⟨actual, hActual, hReality⟩

def Intersect {World : Type u} (K₁ K₂ : Live World) : Live World :=
  fun w => K₁ w ∧ K₂ w

/-- T4a. Two sound states about the same actual reality remain sound when pooled. -/
theorem soundPooling
    {World : Type u}
    (K₁ K₂ : Live World) (actual : World)
    (h₁ : K₁ actual) (h₂ : K₂ actual) :
    Intersect K₁ K₂ actual := by
  exact ⟨h₁, h₂⟩

/-- T4b. Pooling two sound states cannot create an empty live state. -/
theorem soundPoolingNonempty
    {World : Type u}
    (K₁ K₂ : Live World) (actual : World)
    (h₁ : K₁ actual) (h₂ : K₂ actual) :
    NonemptyLive (Intersect K₁ K₂) := by
  exact ⟨actual, ⟨h₁, h₂⟩⟩

def Subset {World : Type u} (A B : Live World) : Prop :=
  ∀ w, A w → B w

/-- T5. Pure contraction cannot repair a state that has already excluded actuality. -/
theorem contractionCannotRepairExcludedActuality
    {World : Type u}
    (K K' : Live World) (actual : World)
    (hOut : ¬ K actual)
    (hSubset : Subset K' K) :
    ¬ K' actual := by
  intro hActual'
  exact hOut (hSubset actual hActual')

/-- Passive observational conditioning. -/
def ObservationUpdate
    {World : Type u} {Outcome : Type o}
    (K : Live World) (observe : World → Outcome) (outcome : Outcome) : Live World :=
  fun w => K w ∧ observe w = outcome

/-- A faithful actual observation preserves actuality. -/
theorem observationPreservesActuality
    {World : Type u} {Outcome : Type o}
    (K : Live World) (observe : World → Outcome) (actual : World)
    (hActual : K actual) :
    ObservationUpdate K observe (observe actual) actual := by
  exact ⟨hActual, rfl⟩

/-- A nondiscriminating observation cannot refine the live state. -/
theorem nondiscriminatingObservationNoInformation
    {World : Type u} {Outcome : Type o}
    (K : Live World) (observe : World → Outcome) (outcome : Outcome)
    (hSame : ∀ w, K w → observe w = outcome) :
    ∀ w, ObservationUpdate K observe outcome w ↔ K w := by
  intro w
  constructor
  · intro h
    exact h.1
  · intro h
    exact ⟨h, hSame w h⟩

/--
Internal re-expression cannot create actuality information when it both preserves every
live possibility and introduces no new one.
-/
theorem noFreeInformation
    {World : Type u}
    (K R : Live World)
    (hPreserve : ∀ w, K w → R w)
    (hNoInvent : ∀ w, R w → K w) :
    ∀ w, R w ↔ K w := by
  intro w
  constructor
  · exact hNoInvent w
  · exact hPreserve w

/-- Query-relative indistinguishability. -/
def SameQ
    {World : Type u} {Value : Type v} {QueryId : Type q}
    (admitted : QueryId → Prop)
    (evaluate : QueryId → World → Option Value)
    (a b : World) : Prop :=
  ∀ query, admitted query → evaluate query a = evaluate query b

def PreservesQueries
    {World : Type u} {Value : Type v} {QueryId : Type q} {Rep : Type r}
    (admitted : QueryId → Prop)
    (evaluate : QueryId → World → Option Value)
    (represent : World → Rep) : Prop :=
  ∀ a b, represent a = represent b → SameQ admitted evaluate a b

/--
T6. Any representation that merges two worlds separated by an admitted query is
inadequate for that query family. This is the minimality obstruction behind the
query-signature quotient.
-/
theorem mergingDifferentQuerySignaturesIsInadequate
    {World : Type u} {Value : Type v} {QueryId : Type q} {Rep : Type r}
    (admitted : QueryId → Prop)
    (evaluate : QueryId → World → Option Value)
    (represent : World → Rep)
    (a b : World)
    (hMerge : represent a = represent b)
    (hDifferent : ¬ SameQ admitted evaluate a b) :
    ¬ PreservesQueries admitted evaluate represent := by
  intro hPreserves
  exact hDifferent (hPreserves a b hMerge)

/--
T7. If actuality lies outside the current model class, no live state confined to that
class can contain actuality. Ontology/model-class expansion is therefore necessary.
-/
theorem modelClassFailureForcesExpansion
    {World : Type u}
    (modelClass K : Live World) (actual : World)
    (hOutside : ¬ modelClass actual)
    (hConfined : Subset K modelClass) :
    ¬ K actual := by
  intro hK
  exact hOutside (hConfined actual hK)


/-- A candidate deletes a possibility that the objective ideal still permits. -/
def UnsupportedExclusion
    {World : Type u} (ideal candidate : Live World) : Live World :=
  fun w => ideal w ∧ ¬ candidate w

/-- A candidate retains a possibility that the objective ideal has eliminated. -/
def UnsupportedRetention
    {World : Type u} (ideal candidate : Live World) : Live World :=
  fun w => candidate w ∧ ¬ ideal w

/-- Pareto comparison on the two objective directions of set-level deviation. -/
def WeaklyDominates
    {World : Type u} (ideal better worse : Live World) : Prop :=
  Subset (UnsupportedExclusion ideal better) (UnsupportedExclusion ideal worse) ∧
  Subset (UnsupportedRetention ideal better) (UnsupportedRetention ideal worse)

def StrictlyDominates
    {World : Type u} (ideal better worse : Live World) : Prop :=
  WeaklyDominates ideal better worse ∧
  ((∃ w, UnsupportedExclusion ideal worse w ∧ ¬ UnsupportedExclusion ideal better w) ∨
   (∃ w, UnsupportedRetention ideal worse w ∧ ¬ UnsupportedRetention ideal better w))

def HasMaterialDeviation
    {World : Type u} (ideal candidate : Live World) : Prop :=
  NonemptyLive (UnsupportedExclusion ideal candidate) ∨
  NonemptyLive (UnsupportedRetention ideal candidate)

/-- T8a. The independently defined ideal has zero deviation and weakly dominates every alternative. -/
theorem idealWeaklyDominates
    {World : Type u}
    (ideal candidate : Live World) :
    WeaklyDominates ideal ideal candidate := by
  constructor
  · intro w h
    exact False.elim (h.2 h.1)
  · intro w h
    exact False.elim (h.2 h.1)

/-- T8b. Any materially deviant alternative is strictly dominated by the exact ideal. -/
theorem idealStrictlyDominatesMaterialDeviation
    {World : Type u}
    (ideal candidate : Live World)
    (hDeviation : HasMaterialDeviation ideal candidate) :
    StrictlyDominates ideal ideal candidate := by
  constructor
  · exact idealWeaklyDominates ideal candidate
  · cases hDeviation with
    | inl hEx =>
        rcases hEx with ⟨w, hw⟩
        left
        refine ⟨w, hw, ?_⟩
        intro hImpossible
        exact hImpossible.2 hImpossible.1
    | inr hRet =>
        rcases hRet with ⟨w, hw⟩
        right
        refine ⟨w, hw, ?_⟩
        intro hImpossible
        exact hImpossible.2 hImpossible.1

/--
T8c. A sound update cannot commit unsupported exclusion relative to SharpUpdate.
Its only possible set-level inferiority is retaining states the sharp update has ruled out.
-/
theorem soundUpdateHasNoUnsupportedExclusion
    {World : Type u} {Outcome : Type o}
    (K : Live World) (T : Transition World Outcome) (outcome : Outcome)
    (posterior : Live World)
    (hSound : UpdateSound K T outcome posterior) :
    ∀ w, ¬ UnsupportedExclusion (SharpUpdate K T outcome) posterior w := by
  intro w hError
  exact hError.2 (sharpUpdateSubsetOfEverySoundPosterior K T outcome posterior hSound w hError.1)

/-- Any unsupported exclusion relative to SharpUpdate is enough to prove the update unsound. -/
theorem unsupportedExclusionMakesUpdateUnsound
    {World : Type u} {Outcome : Type o}
    (K : Live World) (T : Transition World Outcome) (outcome : Outcome)
    (posterior : Live World) (w : World)
    (hError : UnsupportedExclusion (SharpUpdate K T outcome) posterior w) :
    ¬ UpdateSound K T outcome posterior := by
  intro hSound
  exact hError.2 (sharpUpdateSubsetOfEverySoundPosterior K T outcome posterior hSound w hError.1)

/-- The sharp update strictly dominates every materially deviant posterior. -/
theorem sharpUpdateStrictlyDominatesMaterialDeviation
    {World : Type u} {Outcome : Type o}
    (K : Live World) (T : Transition World Outcome) (outcome : Outcome)
    (posterior : Live World)
    (hDeviation : HasMaterialDeviation (SharpUpdate K T outcome) posterior) :
    StrictlyDominates (SharpUpdate K T outcome) (SharpUpdate K T outcome) posterior := by
  exact idealStrictlyDominatesMaterialDeviation (SharpUpdate K T outcome) posterior hDeviation

/-- A categorical rule overreaches when it asserts a value not forced by the live state. -/
def InferenceOverreach
    {World : Type u} {Value : Type v}
    (K : Live World) (query : Query World Value) (R : Value → Prop) (value : Value) : Prop :=
  R value ∧ ¬ Categorical K query value

/-- A categorical rule omits information when it fails to assert a value that is forced. -/
def InferenceOmission
    {World : Type u} {Value : Type v}
    (K : Live World) (query : Query World Value) (R : Value → Prop) (value : Value) : Prop :=
  Categorical K query value ∧ ¬ R value

/-- T9. A universally sound categorical rule has no inferential overreach. -/
theorem soundCategoricalRuleHasNoOverreach
    {World : Type u} {Value : Type v}
    (K : Live World) (query : Query World Value)
    (R : Value → Prop)
    (hNonempty : NonemptyLive K)
    (hSound : ∀ value, R value → ∀ w, K w → query w = some value) :
    ∀ value, ¬ InferenceOverreach K query R value := by
  intro value hOver
  exact hOver.2 (greatestSoundCategorical K query R hNonempty hSound value hOver.1)

/--
A premise-to-conclusion bridge is valid only if the premise is live-realizable and
every live realization of the premise carries the conclusion.
-/
def BridgeValid
    {World : Type u} {Value : Type v}
    (K : Live World)
    (premise conclusion : Query World Value)
    (premiseValue conclusionValue : Value) : Prop :=
  NonemptyLive (fun w => K w ∧ premise w = some premiseValue) ∧
  ∀ w, K w → premise w = some premiseValue → conclusion w = some conclusionValue

/--
T10. One live counterexample is sufficient to defeat a categorical bridge. This is the
generic failure form behind many named fallacies; the wording or tone of the premise is
irrelevant unless it actually supplies a valid bridge to the conclusion.
-/
theorem liveCounterexampleDefeatsBridge
    {World : Type u} {Value : Type v}
    (K : Live World)
    (premise conclusion : Query World Value)
    (premiseValue conclusionValue : Value)
    (w : World)
    (hLive : K w)
    (hPremise : premise w = some premiseValue)
    (hConclusionFails : conclusion w ≠ some conclusionValue) :
    ¬ BridgeValid K premise conclusion premiseValue conclusionValue := by
  intro hBridge
  exact hConclusionFails (hBridge.2 w hLive hPremise)

end OneLogic
