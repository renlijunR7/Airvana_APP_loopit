import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import Matter from 'matter-js';

const source = readFileSync(new URL('../public/reference-action-v1.js', import.meta.url), 'utf8');
const window = { Matter, AirvanaPhysicsModes: { existing: true } };
vm.runInNewContext(source, { window });
const Sky = window.AirvanaPhysicsModes['sky-raid'];
const Sling = window.AirvanaPhysicsModes['island-sling'];
const advance = (m, seconds) => { for (let i = 0; i < seconds * 120 && m.status === 'playing'; i++) m.update(1 / 120); };
const pull = (m, x, y) => { m.pointerDown(m.snapshot().anchor); m.pointerMove({ x, y }); m.pointerUp(); };
function canvas() {
  const calls = [];
  return new Proxy({ calls }, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'createLinearGradient') return () => ({ addColorStop() {} });
      return (...args) => { calls.push(key); args.filter(a => typeof a === 'number').forEach(a => assert.ok(Number.isFinite(a), String(key) + ' coordinates finite')); };
    },
    set(target, key, value) { target[key] = value; return true; }
  });
}
function pilot(m) {
  // Aim at visible targets, avoid their projected bullets, and use the same public controls as a player.
  const s = m.snapshot(), y = 450;
  let aimX = s.boss ? s.boss.x : (s.enemies.find(e => e.y < 350)?.x || 180);
  if (s.boss?.laser && Math.abs(aimX - s.boss.laser.x) < 38) aimX += aimX < 180 ? 60 : -60;
  let safest = aimX, best = -Infinity;
  for (let x = Math.max(28, aimX - 45); x <= Math.min(332, aimX + 45); x += 15) {
    let risk = 0;
    for (const b of s.enemyBullets) {
      const t = Math.max(0, Math.min(.45, (y - b.y) / (b.vy || 1)));
      risk += Math.max(0, 35 - Math.hypot(x - b.x - b.vx * t, y - b.y - b.vy * t)) * 4;
    }
    const quality = -Math.abs(x - aimX) * .3 - risk;
    if (quality > best) { best = quality; safest = x; }
  }
  m.pointerDown({ x: safest, y }); m.pointerUp();
  if (s.boss && s.bombs > 0 && s.boss.age > 1) m.perform('bomb');
  if (s.health <= 2 && s.shields > 0) m.perform('shield');
}

test('registers two isolated, original, three-level models without external or autonomous work', () => {
  assert.equal(window.AirvanaPhysicsModes.existing, true);
  assert.doesNotMatch(source, /\b(?:fetch|Image|document|requestAnimationFrame|setInterval|setTimeout)\b/);
  for (const Type of [Sky, Sling]) {
    assert.equal(Type.levelCount, 3);
    const m = new Type({ level: 900 }); assert.equal(m.level, 3); assert.equal(m.levelCount, 3);
    assert.equal(m.status, 'playing'); assert.ok(m.title.length > 2); assert.ok(m.instruction.length > 10);
    assert.doesNotThrow(() => JSON.stringify(m.snapshot()));
    const snapshot = JSON.stringify(m.snapshot()); m.draw(canvas()); assert.equal(JSON.stringify(m.snapshot()), snapshot, 'draw is pure');
    m.destroy(); m.destroy();
  }
});

for (let level = 1; level <= 3; level++) {
  test(`sky-raid level ${level}: aimed movement and finite skills clear real waves and defeat the boss`, () => {
    const m = new Sky({ level }); let moved = false, bulletsObserved = false, bossObserved = false;
    for (let frame = 0; frame < 9000 && m.status === 'playing'; frame++) {
      pilot(m); m.update(1 / 120);
      moved ||= Math.abs(m.player.x - 180) > 50;
      bulletsObserved ||= m.enemyBullets.length > 0 && m.bullets.length > 0;
      bossObserved ||= !!m.boss;
      assert.ok(m.enemies.length <= 24 && m.enemyBullets.length <= 100 && m.bullets.length <= 100 && m.particles.length <= 120);
    }
    assert.equal(m.status, 'success', JSON.stringify(m.snapshot()));
    assert.equal(m.boss.hp, 0); assert.ok(m.spawnIndex === m.spawnTotal && m.kills >= 8);
    assert.ok(m.health > 0 && m.score > 2000); assert.ok(moved && bulletsObserved && bossObserved);
    assert.ok(m.time > 15 && m.time < 50, 'a real encounter, not click-to-complete');
    const terminal = JSON.stringify(m.snapshot()); m.update(.05); m.pointerDown({ x: 20, y: 200 }); m.key('1'); m.perform('shield');
    assert.equal(JSON.stringify(m.snapshot()), terminal); m.draw(canvas()); m.destroy();
  });
  test(`sky-raid level ${level}: collision and missed dodges exhaust the hull and fail`, () => {
    const m = new Sky({ level }); m.pointerDown({ x: 180, y: 145 }); m.pointerUp(); advance(m, 70);
    assert.equal(m.status, 'failure'); assert.equal(m.health, 0); assert.ok(m.message.includes('战机受损'));
    const terminal = JSON.stringify(m.snapshot()); m.update(.05); m.perform('bomb'); assert.equal(JSON.stringify(m.snapshot()), terminal); m.destroy();
  });
}

test('sky skills have finite inventory, shield blocks collisions, and bombs clear actual bullets', () => {
  const m = new Sky(); advance(m, 5); assert.ok(m.enemyBullets.length > 0);
  assert.equal(m.perform('bomb'), true); assert.equal(m.bombs, 1); assert.equal(m.enemyBullets.length, 0);
  m.perform('bomb'); const score = m.score; assert.equal(m.perform('bomb'), false); assert.equal(m.bombs, 0); assert.equal(m.score, score);
  assert.equal(m.perform('shield'), true); assert.equal(m.shieldTime, 4); assert.equal(m.perform('shield'), false);
  const hp = m.health; m.pointerDown({ x: 180, y: 145 }); m.pointerUp(); advance(m, 3); assert.equal(m.health, hp);
  assert.equal(m.shields, 0); assert.ok(m.actions().every(a => a.disabled)); m.destroy();
});

test('sky pointer cancel, coordinate clamping, keyboard and zero-step pause are deterministic', () => {
  const m = new Sky(); m.pointerDown({ x: -90, y: 999 }); assert.equal(m.player.tx, 24); assert.equal(m.player.ty, 458);
  m.cancelPointer(); m.pointerMove({ x: 320, y: 150 }); assert.equal(m.player.tx, 24);
  m.pointerDown({ x: NaN, y: Infinity }); assert.equal(m.dragging, false);
  m.key('ArrowRight'); assert.equal(m.player.tx, 42); m.pointerUp();
  const paused = JSON.stringify(m.snapshot()); m.update(0); m.update(NaN); m.update(-1); m.draw(canvas()); assert.equal(JSON.stringify(m.snapshot()), paused);
  m.key('2'); assert.equal(m.shields, 0); m.destroy();
});

for (let level = 1; level <= 3; level++) {
  test(`island-sling level ${level}: real drag trajectories and proximity bursts free every floating island`, () => {
    const m = new Sling({ level }); const initial = m.snapshot(); let moved = false, inFlight = false;
    for (let attempt = 0; attempt < initial.ammo && m.status === 'playing'; attempt++) {
      const target = m.snapshot().guards.find(g => g.alive);
      const aim = target.index === 0 ? [6, 419] : target.index === 1 ? [5, 444] : [20, 473];
      pull(m, ...aim); assert.ok(m.shots > 0); assert.ok(m.projectile);
      for (let frame = 0; frame < 780 && m.status === 'playing' && (m.projectile || m.victoryAt !== null); frame++) {
        const s = m.snapshot(); inFlight ||= !!s.projectile && s.projectile.x > 100;
        if (s.projectile && s.guards.some(g => g.alive && Math.hypot(g.x - s.projectile.x, g.y - s.projectile.y) < 72)) m.perform('burst');
        m.update(1 / 120);
        moved ||= m.snapshot().blocks.some((b, i) => !initial.blocks[i] || Math.hypot(b.x - initial.blocks[i].x, b.y - initial.blocks[i].y) > 2);
      }
    }
    assert.equal(m.status, 'success', JSON.stringify(m.snapshot())); assert.ok(m.guards.every(g => !g.alive));
    assert.ok(inFlight && moved, 'projectiles travel and rigid structures are displaced'); assert.ok(m.score >= level * 250);
    assert.ok(m.bursts >= 0 && m.bursts < 3 && m.ammo >= 0); assert.ok(m.engine.world.bodies.length <= initial.blocks.length + level * 2 + 1);
    const terminal = JSON.stringify(m.snapshot()); m.update(.05); m.pointerDown(m.anchor); m.perform('burst'); m.key('Enter');
    assert.equal(JSON.stringify(m.snapshot()), terminal); m.draw(canvas()); m.destroy();
  });
}

test('island-sling demolition works through collisions even without the burst skill', () => {
  const m = new Sling(); pull(m, 6, 419); advance(m, 6.5);
  assert.equal(m.status, 'success'); assert.equal(m.bursts, 3); assert.equal(m.shots, 1); m.destroy();
});

test('island-sling wrong direction cannot hit targets, burns ammo, and fails naturally', () => {
  const m = new Sling(); const ammo = m.ammo;
  for (let i = 0; i < ammo; i++) { pull(m, 125, 409); advance(m, 6.5); }
  assert.equal(m.status, 'failure'); assert.equal(m.ammo, 0); assert.equal(m.shots, ammo); assert.equal(m.score, 0);
  assert.ok(m.guards.every(g => g.alive)); assert.ok(m.message.includes('弹药用尽')); m.destroy();
});

test('island-sling final-ammo burst allows moving wood to hit a guard before judging failure', () => {
  const m = new Sling();
  for (let i = 0; i < 4; i++) { pull(m, 125, 409); advance(m, 6.5); }
  assert.equal(m.ammo, 1); assert.equal(m.status, 'playing');
  pull(m, 6, 419); advance(m, .18); assert.equal(m.ammo, 0);
  assert.equal(m.perform('burst'), true);
  assert.ok(m.guards[0].alive, 'burst does not directly touch the guard; wood must do the work');
  assert.equal(m.projectile, null); assert.ok(m.blocks.some(b => b.body.speed > 1));
  m.update(.02); assert.equal(m.status, 'playing'); assert.ok(m.actions().every(a => a.disabled));
  assert.ok(m.instruction.includes('结算')); advance(m, 2.7);
  assert.equal(m.status, 'success'); assert.ok(m.guards.every(g => !g.alive));
  assert.equal(m.shots, 5); assert.equal(m.ammo, 0); assert.ok(m.score >= 250); m.destroy();
});

test('island-sling final missed shot has a bounded two-second settling window and then fails', () => {
  const m = new Sling();
  for (let i = 0; i < 4; i++) { pull(m, 125, 409); advance(m, 6.5); }
  pull(m, 125, 409);
  while (m.projectile && m.status === 'playing') m.update(1 / 120);
  assert.equal(m.status, 'playing'); assert.equal(m.ammo, 0); const retiredAt = m.time;
  advance(m, 1.8); assert.equal(m.status, 'playing'); assert.ok(m.guards.every(g => g.alive));
  const before = JSON.stringify(m.snapshot()); m.perform('angle'); m.key('Enter'); m.perform('burst'); assert.equal(JSON.stringify(m.snapshot()), before);
  advance(m, .4); assert.equal(m.status, 'failure'); assert.ok(m.time >= retiredAt + 2 && m.time < retiredAt + 2.1);
  assert.equal(m.score, 0); assert.ok(m.message.includes('弹药用尽')); m.destroy();
});

test('island-sling proximity blast is not a win button; inventory and physics stay bounded', () => {
  const m = new Sling({ level: 3 });
  assert.equal(m.perform('burst'), false);
  for (let i = 0; i < 3; i++) { m.perform('launch'); assert.equal(m.perform('burst'), true); m.update(1 / 120); }
  assert.equal(m.bursts, 0); assert.ok(m.guards.every(g => g.alive)); assert.equal(m.score, 0);
  m.perform('launch'); assert.equal(m.perform('burst'), false); advance(m, 7);
  assert.ok(m.engine.world.bodies.length <= 19 && m.particles.length <= 120); m.destroy();
});

test('island-sling drag cancellation spends nothing and accessible controls launch the same trajectory', () => {
  const m = new Sling({ level: 2 }); const initial = m.snapshot();
  m.pointerDown({ x: 290, y: 400 }); assert.equal(m.drag, null);
  m.pointerDown(m.anchor); m.pointerMove({ x: -999, y: 999 }); assert.ok(Math.hypot(m.drag.x - 56, m.drag.y - 409) <= 78.001);
  const aim = JSON.stringify(m.aim); m.pointerMove({ x: NaN, y: Infinity }); assert.equal(JSON.stringify(m.aim), aim);
  m.cancelPointer(); m.pointerUp(); assert.equal(m.shots, 0); assert.equal(m.ammo, initial.ammo);
  m.key('ArrowUp'); assert.notEqual(JSON.stringify(m.aim), aim); m.key('Enter'); assert.equal(m.ammo, initial.ammo - 1);
  const projectile = m.snapshot().projectile; advance(m, .08); assert.ok(m.projectile.position.x > projectile.x); assert.ok(m.projectile.velocity.y > projectile.vy, 'gravity changes velocity');
  const paused = JSON.stringify(m.snapshot()); m.update(0); m.update(NaN); m.update(-2); m.draw(canvas()); assert.equal(JSON.stringify(m.snapshot()), paused);
  m.cancelPointer(); m.destroy(); assert.equal(m.engine.world.bodies.length, 0);
});
