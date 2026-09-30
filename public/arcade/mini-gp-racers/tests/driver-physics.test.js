const test = require('node:test');
const assert = require('node:assert/strict');
const physics = require('../driver-physics.js');

// Stock Comet values from the engine's car-stat conversion.
const stats = Object.freeze({
  maxSpeed: 11.162,
  acceleration: 5.346,
  brakePower: 10.06,
  steerRate: 0.968,
  boostPower: 1.8,
  boostCapacity: 100
});
const road = Object.freeze({ offRoad: false, onGrass: false });

function state(overrides = {}) {
  return Object.assign({
    speed: 0, heading: 0, motionHeading: 0, reverseHold: 0,
    boost: 80, ersMode: 0, driftAmount: 0
  }, overrides);
}

function advance(car, input, seconds, dt = 1 / 60, surface = road) {
  const frames = Math.round(seconds / dt);
  for (let frame = 0; frame < frames; frame++) {
    physics.step(car, input, stats, surface, dt);
  }
  return car;
}

for (const dt of [1 / 60, 1 / 30, 0.05]) {
  test(`holding brake stops forward travel before delayed reverse (${dt}s frames)`, () => {
    const car = state({ speed: 8 });
    let stoppedAt = null;
    let reversedAt = null;
    for (let frame = 1; frame <= Math.ceil(3 / dt); frame++) {
      physics.step(car, { brake: true }, stats, road, dt);
      if (car.speed === 0 && stoppedAt === null) stoppedAt = frame * dt;
      if (car.speed < 0) {
        reversedAt = frame * dt;
        assert.notEqual(stoppedAt, null, 'car must come to a full stop first');
        break;
      }
    }
    assert.notEqual(reversedAt, null, 'a sustained brake press must eventually reverse');
    assert.ok(reversedAt - stoppedAt >= 0.25, 'reverse needs a deliberate hold after stopping');
    assert.ok(reversedAt - stoppedAt <= 0.36, 'reverse should engage without an excessive delay');
    assert.ok(car.dz < 0, 'reverse must produce actual backwards displacement');
  });
}

test('releasing reverse preserves backwards inertia then decelerates to rest', () => {
  const car = state({ speed: -3 });
  physics.step(car, {}, stats, road, 1 / 60);
  assert.ok(car.speed < 0, 'releasing input should not snap the car to rest');
  assert.ok(car.dz < 0);
  let previousMagnitude = 3;
  for (let frame = 0; frame < 600; frame++) {
    physics.step(car, {}, stats, road, 1 / 60);
    assert.ok(Math.abs(car.speed) <= previousMagnitude + 1e-12, 'coasting must never accelerate backwards');
    assert.ok(car.speed <= 0, 'coasting must never switch to forward travel');
    previousMagnitude = Math.abs(car.speed);
  }
  assert.equal(car.speed, 0);
  assert.equal(car.dz, 0);
});

test('throttle brakes reverse to zero before accelerating forwards', () => {
  const car = state({ speed: -3 });
  let stopped = false;
  for (let frame = 0; frame < 120; frame++) {
    physics.step(car, { throttle: true }, stats, road, 1 / 60);
    if (car.speed === 0) {
      stopped = true;
      assert.equal(car.dz, 0);
      break;
    }
    assert.ok(car.speed < 0, 'must not cross directly from reverse to forward');
  }
  assert.ok(stopped, 'throttle must stop backwards motion');
  physics.step(car, { throttle: true }, stats, road, 1 / 60);
  assert.ok(car.speed > 0);
  assert.ok(car.dz > 0);
});

test('throttle still stops tiny backwards velocities before changing direction', () => {
  for (const initialSpeed of [-0.04, -0.02, -0.001]) {
    const car = state({ speed: initialSpeed });
    physics.step(car, { throttle: true }, stats, road, 1 / 60);
    assert.equal(car.speed, 0, `reverse speed ${initialSpeed} must reach rest before forward acceleration`);
    assert.equal(car.dz, 0);
    physics.step(car, { throttle: true }, stats, road, 1 / 60);
    assert.ok(car.speed > 0);
  }
});

test('steering or drift input cannot rotate a stationary car', () => {
  for (const direction of ['left', 'right']) {
    const car = state({ heading: 0.4, motionHeading: 0.4 });
    advance(car, { [direction]: true, drift: true }, 2);
    assert.equal(car.speed, 0);
    assert.equal(car.heading, 0.4);
    assert.equal(car.motionHeading, 0.4);
    assert.equal(car.dx, 0);
    assert.equal(car.dz, 0);
    assert.equal(car.drifting, false);
  }
});

test('the same steering input turns the car in the opposite direction in reverse', () => {
  for (const direction of ['left', 'right']) {
    const forward = state({ speed: 3 });
    const reverse = state({ speed: -3 });
    physics.step(forward, { [direction]: true }, stats, road, 1 / 60);
    physics.step(reverse, { [direction]: true }, stats, road, 1 / 60);
    assert.ok(forward.heading * reverse.heading < 0);
    assert.equal(reverse.motionHeading, reverse.heading, 'reverse must retain grip');
  }
});

test('drift creates a real heading/travel slip angle, then recovers after release', () => {
  const car = state({ speed: 7 });
  advance(car, { throttle: true, right: true, drift: true }, 1);
  assert.equal(car.drifting, true);
  assert.ok(Math.abs(car.slipAngle) > 0.1, 'drift should visibly separate body and travel headings');
  assert.ok(Math.abs(physics.angleDelta(car.heading, car.motionHeading)) > 0.1);
  const displacementHeading = Math.atan2(car.dx, car.dz);
  assert.ok(Math.abs(physics.angleDelta(displacementHeading, car.motionHeading)) < 1e-10,
    'actual displacement must follow the slipping travel direction');
  const peakSlip = Math.abs(car.slipAngle);
  advance(car, { throttle: true }, 1.5);
  assert.equal(car.drifting, false);
  assert.ok(Math.abs(car.slipAngle) < peakSlip * 0.05, 'releasing drift must restore grip');
  assert.ok(car.driftAmount < 0.01, 'drift visuals/steering influence must settle too');
});

test('drift is unavailable while reversing, driving slowly, or driving on grass', () => {
  const scenarios = [
    { car: state({ speed: -3 }), input: { brake: true, right: true, drift: true }, surface: road },
    { car: state({ speed: 2 }), input: { right: true, drift: true }, surface: road },
    { car: state({ speed: 7 }), input: { throttle: true, right: true, drift: true }, surface: { offRoad: true, onGrass: true } }
  ];
  scenarios.forEach(({ car, input, surface }) => {
    advance(car, input, 0.2, 1 / 60, surface);
    assert.equal(car.drifting, false);
    assert.equal(car.driftAmount, 0);
  });
});

test('reverse speed stays bounded during a sustained reverse press', () => {
  const car = state();
  advance(car, { brake: true }, 8);
  assert.ok(car.speed < -1);
  assert.ok(car.speed >= -4.2, 'reverse must remain much slower than normal forward speed');
  assert.ok(Math.abs(car.speed) < stats.maxSpeed / 2);
});

test('simultaneous brake, throttle and boost only brake; they never reverse or boost', () => {
  for (const initialSpeed of [-3, 0, 7]) {
    const car = state({ speed: initialSpeed, reverseHold: 0.29 });
    let previousMagnitude = Math.abs(initialSpeed);
    let previousBoost = car.boost;
    for (let frame = 0; frame < 240; frame++) {
      physics.step(car, { throttle: true, brake: true, boost: true }, stats, road, 1 / 60);
      assert.equal(car.boosting, false);
      assert.ok(Math.abs(car.speed) <= previousMagnitude + 1e-12);
      assert.ok(initialSpeed === 0 ? car.speed === 0 : car.speed * initialSpeed >= 0,
        'conflicting pedals must never change drive direction');
      assert.ok(car.boost >= previousBoost, 'conflicting pedals must not consume ERS');
      assert.equal(car.reverseHold, 0);
      previousMagnitude = Math.abs(car.speed);
      previousBoost = car.boost;
    }
    assert.equal(car.speed, 0);
  }
});
