'use strict';

// A tiny closed world for open development. World semantics live here only.
// The mind is never given names such as food, water, danger, trust, shelter,
// weather, day, or body need. It receives primitive world-contact channels plus
// distinct embodied pressure channels and can emit eight primitive motor commands.
//
// The frame tail contains:
//   - continuity of reality-contact;
//   - four distinct embodied pressures whose meanings are not named to the mind.
// Internal physical variables are not duplicated as extra semantic sensor values;
// their materially relevant contact is carried by the pressure channels.

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
function key(x, y) { return `${x},${y}`; }

const DIRS = [[0,-1],[1,0],[0,1],[-1,0]];
const ACTIONS = 8;
const PRESSURE_CHANNELS = 4;

function create(seed = 420044) {
  const random = rng(seed);
  const world = {
    width: 7,
    height: 7,
    t: 0,
    random,
    agent: { x: 1, y: 1, dir: 1, energy: 180, water: 180, temp: 128, injury: 0, alive: true },
    other: { x: 5, y: 5, dir: 3, affinity: 0, signal: 0 },
    walls: new Set(),
    food: new Set(['5,1','1,5']),
    water: new Set(['3,1','5,5']),
    shelter: new Set(['3,5']),
    hazard: new Set(['3,3','4,3']),
    gate: new Set(['2,4']),
    keyItem: new Set(['1,3']),
    hasKey: false,
    weather: 0,
    light: 255,
    ambient: 128,
    lastEffect: 128,
    lastSignal: 0,
    resourceClock: 0,
  };

  for (let x = 0; x < world.width; x++) {
    world.walls.add(key(x,0)); world.walls.add(key(x,world.height-1));
  }
  for (let y = 0; y < world.height; y++) {
    world.walls.add(key(0,y)); world.walls.add(key(world.width-1,y));
  }
  world.walls.add('2,2'); world.walls.add('2,3'); world.walls.add('4,4');
  return world;
}

function occupiedBits(w, x, y) {
  const k = key(x,y);
  let bits = 0;
  if (w.walls.has(k)) bits |= 1;
  if (w.food.has(k)) bits |= 2;
  if (w.water.has(k)) bits |= 4;
  if (w.shelter.has(k)) bits |= 8;
  if (w.hazard.has(k)) bits |= 16;
  if (w.gate.has(k)) bits |= 32;
  if (w.keyItem.has(k)) bits |= 64;
  if (w.other.x === x && w.other.y === y) bits |= 128;
  return bits;
}

function bodyPressures(w) {
  const a = w.agent;
  const p0 = clamp(Math.round(Math.max(0, 180 - a.energy) * 255 / 180), 0, 255);
  const p1 = clamp(Math.round(Math.max(0, 180 - a.water) * 255 / 180), 0, 255);
  const p2 = clamp(Math.round(Math.max(0, Math.abs(a.temp - 128) - 8) * 4), 0, 255);
  const p3 = clamp(Math.round(a.injury), 0, 255);
  return [p0, p1, p2, p3];
}

function bodyFriction(w) { return Math.max(...bodyPressures(w)); }

function sense(w) {
  const a = w.agent;
  const channels = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) channels.push(occupiedBits(w, a.x + dx, a.y + dy));
  }
  channels.push(w.light);
  channels.push(w.ambient);
  channels.push(w.lastEffect);
  channels.push((a.dir & 3) * 64);
  channels.push(w.lastSignal * 85);
  channels.push(a.alive ? 255 : 0);
  channels.push(...bodyPressures(w));
  return channels;
}

function passable(w, x, y) {
  const k = key(x,y);
  if (w.walls.has(k)) return false;
  if (w.gate.has(k) && !w.hasKey) return false;
  return true;
}

function moveOther(w) {
  if (w.random() < 0.45) {
    const d = DIRS[Math.floor(w.random()*4)];
    const nx = w.other.x + d[0], ny = w.other.y + d[1];
    if (passable(w,nx,ny) && !(nx === w.agent.x && ny === w.agent.y)) { w.other.x = nx; w.other.y = ny; }
  }
  const dist = Math.abs(w.other.x-w.agent.x)+Math.abs(w.other.y-w.agent.y);
  if (w.lastSignal === 1) w.other.affinity = clamp(w.other.affinity + 1, -8, 8);
  if (w.lastSignal === 2) w.other.affinity = clamp(w.other.affinity - 1, -8, 8);
  if (dist <= 1 && w.other.affinity >= 3 && w.random() < 0.35) {
    w.agent.energy = clamp(w.agent.energy + 16,0,255);
    w.lastEffect = 190;
  }
}

function environmentTick(w) {
  const a = w.agent;
  w.t++;
  const cycle = w.t % 80;
  w.light = cycle < 48 ? 240 : 45;
  if (w.t % 55 === 0) w.weather = Math.floor(w.random()*3);
  const outdoorTarget = w.weather === 0 ? 128 : w.weather === 1 ? 92 : 166;
  const hereShelter = w.shelter.has(key(a.x,a.y));
  const target = hereShelter ? 128 : outdoorTarget;
  a.temp += (target - a.temp) * 0.08;
  a.energy -= 0.55 + (w.light < 100 ? 0.10 : 0);
  a.water -= 0.70 + (w.weather === 2 ? 0.25 : 0);
  if (a.temp < 88 || a.temp > 170) a.energy -= 0.35;
  if (a.energy < 45 || a.water < 45) a.injury += 0.22;
  if (w.hazard.has(key(a.x,a.y))) a.injury += 2.4;
  a.injury = clamp(a.injury,0,255);
  a.energy = clamp(a.energy,0,255); a.water = clamp(a.water,0,255); a.temp = clamp(a.temp,0,255);
  w.ambient = clamp(Math.round(128 + (w.weather-1)*32 + (w.light<100?-18:10)),0,255);

  w.resourceClock++;
  if (w.resourceClock % 70 === 0) w.food.add(w.random()<0.5?'5,1':'1,5');
  if (w.resourceClock % 85 === 0) w.water.add(w.random()<0.5?'3,1':'5,5');

  if (a.energy <= 0 || a.water <= 0 || a.injury >= 255) a.alive = false;
  moveOther(w);
}

function act(w, action) {
  if (!Number.isInteger(action) || action < 0 || action >= ACTIONS) throw new Error('primitive action must be 0..7');
  const a = w.agent;
  w.lastEffect = 128;
  w.lastSignal = 0;
  if (!a.alive) return sense(w);

  if (action === 1) a.dir = (a.dir + 3) % 4;
  else if (action === 2) a.dir = (a.dir + 1) % 4;
  else if (action === 3) {
    const d = DIRS[a.dir], nx = a.x+d[0], ny = a.y+d[1];
    if (passable(w,nx,ny)) { a.x=nx; a.y=ny; w.lastEffect=145; }
    else w.lastEffect=82;
  } else if (action === 4) {
    const k = key(a.x,a.y);
    if (w.food.has(k)) { w.food.delete(k); a.energy=clamp(a.energy+72,0,255); w.lastEffect=230; }
    else if (w.water.has(k)) { w.water.delete(k); a.water=clamp(a.water+88,0,255); w.lastEffect=214; }
    else if (w.keyItem.has(k)) { w.keyItem.delete(k); w.hasKey=true; w.lastEffect=202; }
    else if (w.gate.has(k) && w.hasKey) { w.gate.delete(k); w.lastEffect=198; }
    else w.lastEffect=106;
  } else if (action === 5) { w.lastSignal=1; w.lastEffect=160; }
  else if (action === 6) { w.lastSignal=2; w.lastEffect=96; }
  else if (action === 7) {
    const hereShelter = w.shelter.has(key(a.x,a.y));
    a.energy=clamp(a.energy+(hereShelter?2.2:0.7),0,255);
    w.lastEffect=hereShelter?188:136;
  }

  environmentTick(w);
  return sense(w);
}

function revive(w) {
  Object.assign(w.agent, { x:1,y:1,dir:1,energy:180,water:180,temp:128,injury:0,alive:true });
  w.lastEffect = 12;
}

module.exports = { create, sense, act, revive, bodyPressures, bodyFriction, ACTIONS, PRESSURE_CHANNELS };
