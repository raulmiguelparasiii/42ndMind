'use strict';

// Zero-state stabilization of competing sourced interpretations.
//
// Induced claims remain historical M material.  When several interpretations of
// the same subject/relation conflict, the uniquely stronger supported route can
// govern current access while weaker routes are reopened rather than deleted.
// No claim is promoted to world actuality here.

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function collect(state) {
  const by = new Map();
  for (const f of state.knowledge?.facts || []) {
    const id = String(f.subject);
    if (!id.startsWith('social-claim:')) continue;
    if (!by.has(id)) by.set(id, { id });
    const row = by.get(id);
    if (f.relation === 'ρ:kind') row.kind = f.object;
    else if (f.relation === 'ρ:epistemic_status') row.status = f.object;
    else if (f.relation === 'ρ:claim_subject') row.subject = f.object;
    else if (f.relation === 'ρ:claim_relation') row.relation = f.object;
    else if (f.relation === 'ρ:claim_object') row.object = f.object;
    else if (f.relation === 'ρ:induction_support') row.support = f.object;
  }
  return [...by.values()].filter(x => x.kind === 'sourced_claim_occurrence' && x.subject !== undefined && x.relation !== undefined && x.object !== undefined);
}
function strength(row) {
  const support = Number(row.support?.support || 0);
  const score = Number(row.support?.score || 0);
  const explicit = Number(row.support?.weight);
  return Number.isFinite(explicit) ? explicit : support * score;
}
function relationalUpdate(state) {
  const groups = new Map();
  for (const row of collect(state)) {
    const key = stable([row.subject, row.relation]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const facts = [];
  for (const rows of groups.values()) {
    const objects = new Map();
    for (const row of rows) {
      const key = stable(row.object);
      if (!objects.has(key)) objects.set(key, { object: row.object, rows: [], strength: 0 });
      const group = objects.get(key);
      group.rows.push(row);
      group.strength = Math.max(group.strength, strength(row));
    }
    const alternatives = [...objects.values()].sort((a,b) => b.strength - a.strength);
    if (alternatives.length < 2) continue;
    const best = alternatives[0];
    const second = alternatives[1];
    // Require a real support margin.  Ambiguity remains ambiguity when competing
    // routes are comparably supported.
    if (!(best.strength > 0 && best.strength >= second.strength * 1.35)) continue;
    for (const alt of alternatives.slice(1)) for (const row of alt.rows) {
      if (row.status === 'outcompeted_induction') continue;
      facts.push([row.id, 'ρ:epistemic_status', 'outcompeted_induction']);
      facts.push([row.id, 'ρ:outcompeted_by', {
        subject: best.rows[0].subject,
        relation: best.rows[0].relation,
        object: best.object,
        stronger_support: best.strength,
        weaker_support: alt.strength,
      }]);
    }
  }
  return facts.length ? { relations: { facts } } : null;
}

module.exports = { relationalUpdate };
