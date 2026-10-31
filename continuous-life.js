'use strict';

// Minimal external life for the infant core.
// The world knows the consequences. M does not.

const fs = require('fs');
const path = require('path');
const Mind = require('./one-mind.js');

const ROOT = __dirname;
const STATE_DIR = path.join(ROOT, 'state');
const MIND_PATH = path.join(STATE_DIR, 'canonical-mind.json');
const WORLD_PATH = path.join(STATE_DIR, 'canonical-world.json');
const REPORT_PATH = path.join(STATE_DIR, 'life-report.json');

const ACTIONS = 2;
const STEPS = Math.max(1, Math.floor(Number(process.env.LIFE_STEPS || 80)));

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

function newWorld() {
  return {
    infant_core: 1,
    step: 0,
    viability: 0.55,
    situation: 0,
  };
}

function sense(world) {
  return {
    // One raw external distinction. M receives no name or meaning for it.
    sense: [world.situation],
    viability: world.viability,
  };
}

function act(world, action) {
  // Existing costs something simply by continuing.
  let v = world.viability - 0.06;

  // Which primitive action helps depends on the current raw situation.
  // M is never told this relation.
  if (action === world.situation) v += 0.22;
  else if (action !== null) v -= 0.03;

  world.viability = clamp01(Number(v.toFixed(6)));
  world.step += 1;

  // Reality changes independently of M.
  if (world.step % 6 === 0) world.situation = world.situation === 0 ? 1 : 0;
}

function isInfantMind(M) {
  return M && M.whole === 1 && Array.isArray(M.relations) && !('knowledge' in M) && !('structure' in M);
}

function loadOrCreate() {
  fs.mkdirSync(STATE_DIR, { recursive: true });

  let M = null;
  let W = null;

  if (fs.existsSync(MIND_PATH)) {
    const candidate = JSON.parse(fs.readFileSync(MIND_PATH, 'utf8'));
    if (isInfantMind(candidate)) M = candidate;
  }
  if (fs.existsSync(WORLD_PATH)) {
    const candidate = JSON.parse(fs.readFileSync(WORLD_PATH, 'utf8'));
    if (candidate && candidate.infant_core === 1) W = candidate;
  }

  return { M: M || Mind.one(ACTIONS), W: W || newWorld() };
}

function save(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function run() {
  const { M, W } = loadOrCreate();
  const startExperience = M.experience.length;
  const startRelations = M.relations.length;

  for (let i = 0; i < STEPS && M.alive; i++) {
    Mind.C(M, sense(W));
    act(W, M.action);
  }

  // Let M receive the consequence of the final action.
  if (M.alive) Mind.C(M, sense(W));

  const exact = M.relations
    .filter(r => r.context !== null)
    .map(r => ({ context: r.context, action: r.action, seen: r.seen, mean_delta: Number(r.mean_delta.toFixed(6)) }))
    .sort((a, b) => JSON.stringify(a.context).localeCompare(JSON.stringify(b.context)) || a.action - b.action);

  const report = {
    whole: M.whole,
    alive: M.alive,
    viability: Number(M.viability.toFixed(6)),
    need: Number(M.need.toFixed(6)),
    want: Number(M.want.toFixed(6)),
    action: M.action,
    experiences_total: M.experience.length,
    experiences_added: M.experience.length - startExperience,
    relations_total: M.relations.length,
    relations_added: M.relations.length - startRelations,
    learned_exact_relations: exact,
  };

  save(MIND_PATH, M);
  save(WORLD_PATH, W);
  save(REPORT_PATH, report);
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

run();
