'use strict';

// Persistent external reality for the minimal developmental core.
// The world contains continuous dynamics and viability consequences. M receives
// only raw continuous contact and its own viability. No labels or task answers.

const fs = require('fs');
const path = require('path');
const Mind = require('./one-mind.js');

const ROOT = __dirname;
const STATE_DIR = path.join(ROOT, 'state');
const MIND_PATH = path.join(STATE_DIR, 'canonical-mind.json');
const WORLD_PATH = path.join(STATE_DIR, 'canonical-world.json');
const REPORT_PATH = path.join(STATE_DIR, 'life-report.json');
const STEPS = Math.max(1, Math.floor(Number(process.env.LIFE_STEPS || 96)));

function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
function newWorld() {
  return {
    adaptive_field_world: 1,
    step: 0,
    phase: 0.137,
    x: 0.21,
    y: -0.34,
    viability: 0.88,
  };
}
function sense(W) {
  return {
    sense: [
      W.x,
      W.y,
      Math.sin(W.phase),
      Math.cos(0.73 * W.phase + W.x),
    ],
    viability: W.viability,
  };
}
function act(W, motor) {
  const a = Number.isFinite(motor) ? clamp(motor, -1, 1) : 0;
  W.phase += 0.071 + 0.013 * W.y;
  const nx = Math.tanh(1.17 * W.x - 0.43 * W.y + 0.31 * Math.sin(W.phase) + 0.09 * a);
  const ny = Math.tanh(0.38 * W.x + 0.91 * W.y + 0.27 * Math.cos(0.61 * W.phase) - 0.07 * a);
  W.x = nx;
  W.y = ny;
  const demand = Math.tanh(0.8 * W.x - 0.6 * W.y + 0.25 * Math.sin(W.phase));
  const mismatch = Math.abs(a - demand);
  W.viability = clamp(W.viability - 0.0025 - 0.0025 * mismatch + 0.002 * Math.max(0, 1 - mismatch), 0, 0.98);
  W.step += 1;
}
function validMind(M) {
  return M && M.whole === 1 && Array.isArray(M.field) && M.field.length >= 1 && 'growth' in M;
}
function loadOrCreate() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  let M = null, W = null;
  if (fs.existsSync(MIND_PATH)) {
    const x = JSON.parse(fs.readFileSync(MIND_PATH, 'utf8'));
    if (validMind(x)) M = x;
  }
  if (fs.existsSync(WORLD_PATH)) {
    const x = JSON.parse(fs.readFileSync(WORLD_PATH, 'utf8'));
    if (x && x.adaptive_field_world === 1) W = x;
  }
  return { M: M || Mind.one(), W: W || newWorld() };
}
function save(file, x) { fs.writeFileSync(file, JSON.stringify(x, null, 2) + '\n'); }

function run() {
  const { M, W } = loadOrCreate();
  const birthLike = M.age === 0;
  const startCells = M.field.length;
  const startGrowth = M.growth;
  for (let i = 0; i < STEPS && M.alive; i++) {
    Mind.C(M, sense(W));
    if (M.alive) act(W, M.action);
  }
  if (M.alive) Mind.C(M, sense(W));
  const report = {
    whole: M.whole,
    alive: M.alive,
    began_at_birth: birthLike,
    cells_at_start: startCells,
    cells_now: M.field.length,
    cells_built_this_run: M.field.length - startCells,
    growth_total: M.growth,
    growth_this_run: M.growth - startGrowth,
    residual: M.residual,
    viability: M.viability,
    need: M.need,
    want: M.want,
    action: M.action,
    age: M.age,
    world_step: W.step,
  };
  save(MIND_PATH, M);
  save(WORLD_PATH, W);
  save(REPORT_PATH, report);
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}
run();
