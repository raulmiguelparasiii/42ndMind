"""Exhaustive and adversarial finite-model attacks on the One Objective Logic core."""
from __future__ import annotations

import itertools
import random
from dataclasses import dataclass
from typing import Iterable

from .core import (
    Assertion,
    Query,
    Transition,
    UNDEFINED,
    assertion_sound_over,
    categorical_consequences,
    deviation_from_ideal,
    inquiry_identifies,
    needs_ontology_expansion,
    observation_update,
    pooled,
    query_quotient,
    representation_preserves_queries,
    sharp_update,
    sound,
    strictly_dominates,
    update_deviation,
    update_is_sound,
    weakly_dominates,
)


@dataclass
class Report:
    checks: int = 0
    failures: list[str] | None = None

    def __post_init__(self) -> None:
        if self.failures is None:
            self.failures = []

    def ok(self, condition: bool, label: str) -> None:
        self.checks += 1
        if not condition:
            self.failures.append(label)


def subsets(items: tuple[int, ...]) -> Iterable[frozenset[int]]:
    for mask in range(1 << len(items)):
        yield frozenset(items[i] for i in range(len(items)) if mask & (1 << i))


def nonempty_subsets(items: tuple[int, ...]) -> Iterable[frozenset[int]]:
    for s in subsets(items):
        if s:
            yield s


def all_query_maps(worlds: tuple[int, ...], values=(0, 1, UNDEFINED)):
    for assignment in itertools.product(values, repeat=len(worlds)):
        yield Query("q", dict(zip(worlds, assignment)))


def attack_categorical_consequence(max_worlds: int, r: Report) -> None:
    """Search for a sound categorical assertion excluded by C(K), or an unsound one included."""
    for n in range(1, max_worlds + 1):
        worlds = tuple(range(n))
        for k in nonempty_subsets(worlds):
            for q in all_query_maps(worlds):
                qmap = {q.name: q}
                c = categorical_consequences(k, [q])
                possible_assertions = [Assertion("q", 0), Assertion("q", 1)]
                for a in possible_assertions:
                    snd = assertion_sound_over(a, k, qmap)
                    r.ok((a in c) == snd, f"categorical mismatch n={n} K={k} q={q.values} a={a}")


def attack_soundness_and_pooling(max_worlds: int, r: Report) -> None:
    for n in range(1, max_worlds + 1):
        worlds = tuple(range(n))
        for actual in worlds:
            containing = [k for k in nonempty_subsets(worlds) if actual in k]
            for k in containing:
                r.ok(sound(actual, k), "sound state lost actuality")
                for j in containing:
                    r.ok(actual in pooled(k, j), f"pooling excluded actuality n={n} a={actual} K={k} J={j}")
                    r.ok(bool(pooled(k, j)), "two sound states pooled to obstruction")


def attack_correction_direction(max_worlds: int, r: Report) -> None:
    for n in range(2, max_worlds + 1):
        worlds = tuple(range(n))
        for actual in worlds:
            for k in subsets(worlds):
                if actual in k:
                    continue
                for kp in subsets(tuple(k)):
                    r.ok(actual not in kp, f"contraction repaired false state n={n} a={actual} K={k} K'={kp}")


def attack_observation(max_worlds: int, r: Report) -> None:
    for n in range(1, max_worlds + 1):
        worlds = tuple(range(n))
        for obs_values in itertools.product((0, 1), repeat=n):
            obs = dict(zip(worlds, obs_values))
            for actual in worlds:
                for k in nonempty_subsets(worlds):
                    if actual not in k:
                        continue
                    kp = observation_update(k, obs[actual], obs)
                    r.ok(actual in kp, f"observation lost actuality n={n} a={actual} K={k} obs={obs}")
                    if len(set(obs[w] for w in k)) == 1:
                        r.ok(kp == k, f"non-discriminating observation changed K n={n} K={k} obs={obs}")


def attack_identifiability(max_worlds: int, r: Report) -> None:
    for n in range(1, max_worlds + 1):
        worlds = tuple(range(n))
        for k in nonempty_subsets(worlds):
            for q in all_query_maps(worlds, values=(0, 1)):
                for obs_values in itertools.product((0, 1), repeat=n):
                    obs = dict(zip(worlds, obs_values))
                    ident = inquiry_identifies(k, q, obs)
                    expected = all(
                        obs[a] != obs[b] or q.value(a) == q.value(b)
                        for a in k for b in k
                    )
                    r.ok(ident == expected, "identifiability definition mismatch")


def attack_quotient_minimality(max_worlds: int, r: Report) -> None:
    for n in range(1, max_worlds + 1):
        worlds = tuple(range(n))
        query_maps = list(all_query_maps(worlds, values=(0, 1)))
        qsets = [(q,) for q in query_maps]
        qsets += list(itertools.islice(itertools.combinations(query_maps, 2), 64))
        for qs in qsets:
            quotient = query_quotient(worlds, qs)
            rep = {}
            for idx, block in enumerate(quotient):
                for w in block:
                    rep[w] = idx
            r.ok(representation_preserves_queries(worlds, qs, rep), "quotient failed to preserve Q")
            for a in worlds:
                for b in worlds:
                    if a >= b:
                        continue
                    if tuple(q.value(a) for q in qs) != tuple(q.value(b) for q in qs):
                        merged = {w: w for w in worlds}
                        merged[b] = merged[a]
                        r.ok(not representation_preserves_queries(worlds, qs, merged), "inadequate merge was accepted")


def attack_fallacy_dominance(max_worlds: int, r: Report) -> None:
    """Attack the claim that the exact ideal has zero deviation and dominates every alternative."""
    for n in range(max_worlds + 1):
        worlds = tuple(range(n))
        all_sets = list(subsets(worlds))
        for ideal in all_sets:
            exact = deviation_from_ideal(ideal, ideal)
            r.ok(exact.exact, f"ideal deviated from itself n={n} ideal={ideal}")
            for candidate in all_sets:
                d = deviation_from_ideal(ideal, candidate)
                r.ok(weakly_dominates(ideal, ideal, candidate), f"ideal failed weak dominance n={n}")
                r.ok(strictly_dominates(ideal, ideal, candidate) == (candidate != ideal), f"strict dominance mismatch n={n}")
                r.ok(d.exact == (candidate == ideal), f"zero deviation did not characterize equality n={n}")


def attack_dynamic_updates_exhaustive_two_worlds(r: Report) -> None:
    worlds = (0, 1)
    outcomes = (0, 1)
    triples = [Transition(a, o, b) for a in worlds for o in outcomes for b in worlds]
    for mask in range(1 << len(triples)):
        relation = [triples[i] for i in range(len(triples)) if mask & (1 << i)]
        for k in nonempty_subsets(worlds):
            for o in outcomes:
                star = sharp_update(k, o, relation)
                for proposed in subsets(worlds):
                    is_sound = update_is_sound(k, o, relation, proposed)
                    r.ok(is_sound == star.issubset(proposed), "sharp update theorem mismatch")
                    d = update_deviation(k, o, relation, proposed)
                    # Sound alternatives may be less sharp, but may not delete a reachable state.
                    r.ok((not d.unsupported_exclusion) == is_sound, "soundness/exclusion equivalence failed")
                    if is_sound and proposed != star:
                        r.ok(bool(d.unsupported_retention), "non-exact sound update had no retained defeated state")
                        r.ok(strictly_dominates(star, star, proposed), "sharp update failed strict dominance")


def attack_dynamic_updates_random(seed: int, trials: int, r: Report) -> None:
    rng = random.Random(seed)
    worlds = tuple(range(5))
    outcomes = tuple(range(3))
    all_triples = [Transition(a, o, b) for a in worlds for o in outcomes for b in worlds]
    for _ in range(trials):
        relation = [t for t in all_triples if rng.random() < 0.25]
        k = frozenset(w for w in worlds if rng.random() < 0.6) or frozenset({rng.choice(worlds)})
        o = rng.choice(outcomes)
        star = sharp_update(k, o, relation)
        for m in star:
            proposed = set(star)
            proposed.remove(m)
            r.ok(not update_is_sound(k, o, relation, proposed), "random omitted reachable posterior remained sound")
        r.ok(update_is_sound(k, o, relation, star), "sharp posterior itself marked unsound")


def attack_ontology_failure(max_worlds: int, r: Report) -> None:
    external_actual = "actual-outside"
    for n in range(max_worlds + 1):
        model_class = tuple(range(n))
        r.ok(needs_ontology_expansion(external_actual, model_class), "failed to flag missing actuality")
        for k in subsets(model_class):
            r.ok(external_actual not in k, "subset-only correction recovered outside actuality")


def run(max_worlds: int = 4, random_trials: int = 5000, seed: int = 42) -> Report:
    r = Report()
    attack_categorical_consequence(max_worlds, r)
    attack_soundness_and_pooling(max_worlds, r)
    attack_correction_direction(max_worlds, r)
    attack_observation(max_worlds, r)
    attack_identifiability(max_worlds, r)
    attack_quotient_minimality(max_worlds, r)
    attack_fallacy_dominance(max_worlds, r)
    attack_dynamic_updates_exhaustive_two_worlds(r)
    attack_dynamic_updates_random(seed, random_trials, r)
    attack_ontology_failure(max_worlds, r)
    return r


if __name__ == "__main__":
    report = run()
    print(f"checks={report.checks}")
    print(f"failures={len(report.failures)}")
    for failure in report.failures[:20]:
        print("FAIL", failure)
    raise SystemExit(1 if report.failures else 0)
