'use strict';

// External reality for one persistent infant M. The world owns consequences.
// M begins with one internal node and is never given the world's hidden action law.

const fs = require('fs');
const path = require('path');
const Mind = require('./one-mind.js');

const ROOT = __dirname;
const STATE_DIR = path.join(ROOT, 'state');
const MIND_PATH = path.join(STATE_DIR, 'canonical-mind.json');
const WORLD_PATH = path.join(STATE_DIR, 'canonical-world.json');
const REPORT_PATH = path.join(STATE_DIR, 'life-report.json');
const ACTIONS = 2;
const STEPS = Math.max(1, Math.floor(Number(process.env.LIFE_STEPS || 96)));

function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
function next(seed) { return (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0; }
function newWorld() {
  let seed = 0x42d1f00d;
  seed = next(seed);
  const first = seed & 1;
  return {
    self_build_world: 1,
    step: 0,
    viability: 0.55,
    situation: 0,
    hidden: [first, 1 - first],
    rng: seed,
  };
}
function sense(W) { return { sense: [W.situation], viability: W.viability }; }
function act(W, action) {
  if (action === null) return;
  let v = W.viability - 0.04;
  v += action === W.hidden[W.situation] ? 0.12 : -0.03;
  W.viability = Number(clamp(v, 0, 0.9).toFixed(6));
  W.step++;
  W.situation = 1 - W.situation;
}
function selfBuilding(M) {
  return M && M.whole === 1 && Array.isArray(M.nodes) && M.nodes.length >= 1 && M.nodes[0].id === 0 && Array.isArray(M.trace);
}
function loadOrCreate() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  let M = null, W = null;
  if (fs.existsSync(MIND_PATH)) {
    const x = JSON.parse(fs.readFileSync(MIND_PATH, 'utf8'));
    if (selfBuilding(x)) M = x;
  }
  if (fs.existsSync(WORLD_PATH)) {
    const x = JSON.parse(fs.readFileSync(WORLD_PATH, 'utf8'));
    if (x && x.self_build_world === 1) W = x;
  }
  return { M: M || Mind.one(ACTIONS), W: W || newWorld() };
}
function save(file, x) { fs.writeFileSync(file, JSON.stringify(x, null, 2) + '\n'); }
function run() {
  const { M, W } = loadOrCreate();
  const startNodes = M.nodes.length;
  const startDepth = Math.max(...M.nodes.map(n => n.depth));
  for (let i = 0; i < STEPS && M.alive; i++) {
    Mind.C(M, sense(W));
    act(W, M.action);
  }
  if (M.alive) Mind.C(M, sense(W));
  const maxDepth = Math.max(...M.nodes.map(n => n.depth));
  const report = {
    whole: M.whole,
    alive: M.alive,
    viability: M.viability,
    need: M.need,
    want: M.want,
    nodes_at_start: startNodes,
    nodes_now: M.nodes.length,
    nodes_built_this_run: M.nodes.length - startNodes,
    depth_at_start: startDepth,
    depth_now: maxDepth,
    recursively_self_built: maxDepth >= 3,
    compressed_trace_length: M.trace.length,
    world_step: W.step,
  };
  save(MIND_PATH, M);
  save(WORLD_PATH, W);
  save(REPORT_PATH, report);
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}
run();
