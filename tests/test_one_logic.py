import pathlib
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "formal"))

from one_logic.core import (  # noqa: E402
    Assertion,
    Query,
    Transition,
    UNDEFINED,
    bridge_valid,
    categorical_consequences,
    deviation_from_ideal,
    gap,
    inference_deviation,
    inquiry_identifies,
    needs_ontology_expansion,
    observation_update,
    pooled,
    query_quotient,
    sharp_update,
    sound,
    strictly_dominates,
    undefined_on_live,
    update_deviation,
    update_is_sound,
    weakly_dominates,
)
from one_logic.falsifier import run  # noqa: E402


class OneLogicCoreTests(unittest.TestCase):
    def test_consequence_is_invariance(self):
        q = Query("q", {0: 1, 1: 1, 2: 0})
        self.assertEqual(categorical_consequences({0, 1}, [q]), frozenset({Assertion("q", 1)}))
        self.assertEqual(categorical_consequences({0, 2}, [q]), frozenset())
        self.assertTrue(gap({0, 2}, q))

    def test_partial_query_is_not_false(self):
        q = Query("liar-like", {0: UNDEFINED, 1: 1})
        self.assertTrue(undefined_on_live({0, 1}, q))
        self.assertEqual(categorical_consequences({0, 1}, [q]), frozenset())

    def test_observation_preserves_actuality(self):
        obs = {0: "red", 1: "blue", 2: "red"}
        k = frozenset({0, 1, 2})
        actual = 2
        kp = observation_update(k, obs[actual], obs)
        self.assertTrue(sound(actual, kp))
        self.assertEqual(kp, frozenset({0, 2}))

    def test_performative_transition_changes_world(self):
        t = {
            Transition("predict-0", "reveal-0", "agent-does-1"),
            Transition("predict-1", "reveal-1", "agent-does-0"),
        }
        k = {"predict-0", "predict-1"}
        self.assertEqual(sharp_update(k, "reveal-0", t), frozenset({"agent-does-1"}))

    def test_sharp_update_is_smallest_sound(self):
        t = {
            Transition(0, "o", 2),
            Transition(1, "o", 3),
            Transition(1, "x", 4),
        }
        star = sharp_update({0, 1}, "o", t)
        self.assertEqual(star, frozenset({2, 3}))
        self.assertTrue(update_is_sound({0, 1}, "o", t, {2, 3}))
        self.assertTrue(update_is_sound({0, 1}, "o", t, {2, 3, 4}))
        self.assertFalse(update_is_sound({0, 1}, "o", t, {2}))

    def test_fallacy_deviation_two_directions(self):
        ideal = {1, 2}
        proposed = {2, 3}
        d = deviation_from_ideal(ideal, proposed)
        self.assertEqual(d.unsupported_exclusion, frozenset({1}))
        self.assertEqual(d.unsupported_retention, frozenset({3}))
        self.assertFalse(d.exact)

    def test_ideal_strictly_dominates_any_material_deviation(self):
        ideal = {1, 2}
        candidate = {2, 3}
        self.assertTrue(weakly_dominates(ideal, ideal, candidate))
        self.assertTrue(strictly_dominates(ideal, ideal, candidate))
        self.assertFalse(strictly_dominates(ideal, ideal, ideal))

    def test_sound_update_can_only_err_by_retaining_extra_worlds(self):
        t = {Transition(0, "o", 2), Transition(1, "o", 3)}
        d = update_deviation({0, 1}, "o", t, {2, 3, 4})
        self.assertFalse(d.unsupported_exclusion)
        self.assertEqual(d.unsupported_retention, frozenset({4}))
        self.assertTrue(update_is_sound({0, 1}, "o", t, {2, 3, 4}))

    def test_unsound_update_has_unsupported_exclusion(self):
        t = {Transition(0, "o", 2), Transition(1, "o", 3)}
        d = update_deviation({0, 1}, "o", t, {2})
        self.assertEqual(d.unsupported_exclusion, frozenset({3}))
        self.assertFalse(update_is_sound({0, 1}, "o", t, {2}))

    def test_inference_overreach_and_omission_are_distinct(self):
        q1 = Query("q1", {0: 1, 1: 1})
        q2 = Query("q2", {0: 0, 1: 1})
        forced = Assertion("q1", 1)
        unsupported = Assertion("q2", 1)
        d = inference_deviation({0, 1}, [q1, q2], {unsupported})
        self.assertEqual(d.unsupported_exclusion, frozenset({forced}))
        self.assertEqual(d.unsupported_retention, frozenset({unsupported}))

    def test_bridge_validity_targets_reason_not_insult_wording(self):
        # "Person is dishonest" can be a genuine belief without proving an unrelated claim false.
        trait = Query("dishonest", {0: True, 1: True, 2: False})
        theorem = Query("theorem_true", {0: True, 1: False, 2: True})
        self.assertFalse(bridge_valid({0, 1, 2}, trait, True, theorem, False))

        # The same personal fact can be relevant to a different query when the live structure warrants it.
        testimony_reliable = Query("testimony_reliable", {0: False, 1: False, 2: True})
        self.assertTrue(bridge_valid({0, 1, 2}, trait, True, testimony_reliable, False))

    def test_identifiability(self):
        q = Query("disease", {0: 0, 1: 1, 2: 1})
        weak = {0: "same", 1: "same", 2: "same"}
        strong = {0: "neg", 1: "pos", 2: "pos"}
        self.assertFalse(inquiry_identifies({0, 1, 2}, q, weak))
        self.assertTrue(inquiry_identifies({0, 1, 2}, q, strong))

    def test_query_quotient_erases_only_irrelevant_labels(self):
        q = Query("q", {"a": 0, "b": 0, "c": 1})
        blocks = set(query_quotient({"a", "b", "c"}, [q]))
        self.assertIn(frozenset({"a", "b"}), blocks)
        self.assertIn(frozenset({"c"}), blocks)

    def test_sound_information_pools(self):
        self.assertEqual(pooled({0, 1}, {1, 2}), frozenset({1}))
        self.assertTrue(sound(1, pooled({0, 1}, {1, 2})))

    def test_missing_actuality_requires_model_expansion(self):
        self.assertTrue(needs_ontology_expansion("x", {0, 1, 2}))

    def test_exhaustive_falsifier(self):
        report = run(max_worlds=3, random_trials=1000, seed=42)
        self.assertEqual(report.failures, [], "\n".join(report.failures[:10]))


if __name__ == "__main__":
    unittest.main()
