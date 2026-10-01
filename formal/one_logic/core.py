"""Finite executable semantics for the candidate One Objective Logic.

This module intentionally keeps the semantic core small. A finite model class is a set
of complete structured possibilities. A reasoner's live state K is a subset of that
class. Queries may be partial and multi-valued. Strict categorical consequence is
invariance over K. Inquiry/update is represented by an objective transition relation.

The implementation is finite so it can be exhaustively attacked. The mathematical
claims are stated without assuming that reality itself is finite.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import FrozenSet, Hashable, Iterable, Mapping, Sequence, Tuple

World = Hashable
Value = Hashable
Outcome = Hashable


class _Undefined:
    def __repr__(self) -> str:
        return "UNDEFINED"


UNDEFINED = _Undefined()


@dataclass(frozen=True)
class Query:
    name: str
    values: Mapping[World, object]

    def value(self, world: World) -> object:
        return self.values.get(world, UNDEFINED)


@dataclass(frozen=True)
class Assertion:
    query: str
    value: object


@dataclass(frozen=True)
class Transition:
    before: World
    outcome: Outcome
    after: World


def normalize_live(live: Iterable[World]) -> FrozenSet[World]:
    return frozenset(live)


def sound(actual: World, live: Iterable[World]) -> bool:
    return actual in normalize_live(live)


def categorical_consequences(live: Iterable[World], queries: Sequence[Query]) -> FrozenSet[Assertion]:
    """Greatest strict categorical consequence set for the supplied queries.

    A query contributes a categorical assertion only when K is nonempty, the query is
    defined on every live world, and all live worlds give exactly the same value.
    """
    k = normalize_live(live)
    if not k:
        return frozenset()
    out: set[Assertion] = set()
    for q in queries:
        vals = [q.value(w) for w in k]
        if any(v is UNDEFINED for v in vals):
            continue
        first = vals[0]
        if all(v == first for v in vals[1:]):
            out.add(Assertion(q.name, first))
    return frozenset(out)


def assertion_true_in(assertion: Assertion, world: World, query_by_name: Mapping[str, Query]) -> bool:
    q = query_by_name[assertion.query]
    v = q.value(world)
    return v is not UNDEFINED and v == assertion.value


def assertion_sound_over(assertion: Assertion, live: Iterable[World], query_by_name: Mapping[str, Query]) -> bool:
    k = normalize_live(live)
    return bool(k) and all(assertion_true_in(assertion, w, query_by_name) for w in k)


def gap(live: Iterable[World], query: Query) -> bool:
    """True when at least two live, defined possibilities disagree on q."""
    vals = {query.value(w) for w in normalize_live(live)}
    vals.discard(UNDEFINED)
    return len(vals) >= 2


def undefined_on_live(live: Iterable[World], query: Query) -> bool:
    return any(query.value(w) is UNDEFINED for w in normalize_live(live))


def obstruction(live: Iterable[World]) -> bool:
    return not normalize_live(live)


def sharp_update(live: Iterable[World], outcome: Outcome, transitions: Iterable[Transition]) -> FrozenSet[World]:
    """Unique smallest posterior that is sound for the modeled transition channel."""
    k = normalize_live(live)
    return frozenset(t.after for t in transitions if t.before in k and t.outcome == outcome)


def update_is_sound(live: Iterable[World], outcome: Outcome, transitions: Iterable[Transition], proposed: Iterable[World]) -> bool:
    """A proposed posterior is sound iff it contains every objectively possible posterior."""
    return sharp_update(live, outcome, transitions).issubset(normalize_live(proposed))


def observation_update(live: Iterable[World], observed: Outcome, observation: Mapping[World, Outcome]) -> FrozenSet[World]:
    k = normalize_live(live)
    return frozenset(w for w in k if observation[w] == observed)


def inquiry_identifies(live: Iterable[World], query: Query, observation: Mapping[World, Outcome]) -> bool:
    """Whether equal observable outcomes guarantee equal defined q-values on K."""
    k = tuple(normalize_live(live))
    for i, a in enumerate(k):
        va = query.value(a)
        if va is UNDEFINED:
            return False
        for b in k[i + 1 :]:
            vb = query.value(b)
            if vb is UNDEFINED:
                return False
            if observation[a] == observation[b] and va != vb:
                return False
    return True


def query_signature(world: World, queries: Sequence[Query]) -> Tuple[object, ...]:
    return tuple(q.value(world) for q in queries)


def query_quotient(worlds: Iterable[World], queries: Sequence[Query]) -> Tuple[FrozenSet[World], ...]:
    buckets: dict[Tuple[object, ...], set[World]] = {}
    for w in worlds:
        buckets.setdefault(query_signature(w, queries), set()).add(w)
    return tuple(sorted((frozenset(v) for v in buckets.values()), key=lambda s: tuple(sorted(map(repr, s)))))


def representation_preserves_queries(worlds: Iterable[World], queries: Sequence[Query], representation: Mapping[World, Hashable]) -> bool:
    """True iff h never merges worlds distinguished by any query in Q."""
    ws = tuple(worlds)
    for i, a in enumerate(ws):
        for b in ws[i + 1 :]:
            if representation[a] == representation[b] and query_signature(a, queries) != query_signature(b, queries):
                return False
    return True


def pooled(*live_sets: Iterable[World]) -> FrozenSet[World]:
    sets = [normalize_live(x) for x in live_sets]
    if not sets:
        return frozenset()
    out = set(sets[0])
    for s in sets[1:]:
        out.intersection_update(s)
    return frozenset(out)


def needs_ontology_expansion(actual: World, model_class: Iterable[World]) -> bool:
    return actual not in frozenset(model_class)


def model_class_can_recover_actuality(actual: World, model_class: Iterable[World]) -> bool:
    """No subset-only correction can recover an actuality absent from the model class."""
    return actual in frozenset(model_class)
