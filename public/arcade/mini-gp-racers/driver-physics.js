(function (root) {
  'use strict';
  function clamp(x, low, high) { return Math.max(low, Math.min(high, x)); }
  function angleDelta(a, b) { return Math.atan2(Math.sin(a - b), Math.cos(a - b)); }
  function approachZero(value, amount) { return Math.sign(value) * Math.max(0, Math.abs(value) - amount); }
  function step(state, input, stats, surface, dt) {
    dt = clamp(dt, 0, .05);
    var speed = Number(state.speed) || 0;
    var heading = Number(state.heading) || 0;
    var motionHeading = Number.isFinite(state.motionHeading) ? state.motionHeading : heading;
    var steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    var throttle = !!input.throttle;
    var brake = !!input.brake;
    var reverseHold = Number(state.reverseHold) || 0;
    var reverseLimit = Math.min(4.2, stats.maxSpeed * .32);
    var offRoad = !!surface.offRoad;
    var onGrass = !!surface.onGrass;
    var boosting = !!input.boost && throttle && !brake && speed >= 0 && !input.drift && !onGrass && state.boost > .1;
    var mode = clamp(state.ersMode || 0, 0, 2);
    var maximum = stats.maxSpeed * (boosting ? [1.08, 1.14, 1.18][mode] : 1);

    if (brake && throttle) {
      speed = approachZero(speed, stats.brakePower * dt);
      reverseHold = 0;
    } else if (brake) {
      if (speed > .04) {
        speed = Math.max(0, speed - stats.brakePower * dt);
        reverseHold = 0;
      } else {
        reverseHold += dt;
        if (speed < -.04 || reverseHold >= .3) speed -= stats.acceleration * .6 * dt;
        else speed = 0;
      }
    } else if (throttle) {
      reverseHold = 0;
      if (speed < 0) speed = Math.min(0, speed + stats.brakePower * dt);
      else speed += stats.acceleration * (1 - clamp(speed / maximum, 0, 1) * .64) * dt;
    } else {
      reverseHold = 0;
      speed = approachZero(speed, (.75 + Math.abs(speed) * .018) * dt);
    }

    var drifting = !!input.drift && steer !== 0 && speed > 3.4 && !brake && !onGrass;
    var amount = Number(state.driftAmount) || 0;
    amount += ((drifting ? 1 : 0) - amount) * (1 - Math.exp(-(drifting ? 5 : 4.5) * dt));
    var drag = .13 + speed * speed * .0006 + amount * .5;
    if (offRoad) drag += 3.2 + Math.abs(speed) * .16;
    if (onGrass) drag += 5.8 + Math.abs(speed) * .23;
    speed = approachZero(speed, drag * dt);
    if (boosting) {
      speed += stats.boostPower * [.78, 1, 1.28][mode] * dt;
      state.boost = Math.max(0, state.boost - [18, 26, 33][mode] * dt);
    } else {
      state.boost = Math.min(stats.boostCapacity, state.boost + [9, 3.2, 1.4][mode] * dt);
    }
    speed = clamp(speed, -reverseLimit, maximum);
    var ratio = clamp(Math.abs(speed) / stats.maxSpeed, 0, 1);
    var moving = clamp(Math.abs(speed) / .9, 0, 1);
    var direction = speed < 0 ? -1 : 1;
    heading += steer * stats.steerRate * (.18 + ratio * .92) * moving * direction * (offRoad ? .58 : 1) * (1 + amount * 1.15) * dt;
    if (speed > .1 && Number.isFinite(surface.trackHeading)) {
      heading += angleDelta(surface.trackHeading, heading) * (offRoad ? .44 : .115) * (1 - amount) * dt * (.2 + ratio);
    }
    // Lower rear grip lets the body rotate ahead of the actual travel direction.
    var grip = drifting ? 2.1 : 13;
    if (Math.abs(speed) < .1 || speed < 0) motionHeading = heading;
    else motionHeading += angleDelta(heading, motionHeading) * (1 - Math.exp(-grip * dt));
    state.speed = speed;
    state.heading = heading;
    state.motionHeading = motionHeading;
    state.reverseHold = reverseHold;
    state.driftAmount = amount;
    state.drifting = drifting;
    state.slipAngle = angleDelta(heading, motionHeading);
    state.boosting = boosting;
    state.dx = Math.sin(motionHeading) * speed * dt;
    state.dz = Math.cos(motionHeading) * speed * dt;
    return state;
  }
  var api = { step: step, angleDelta: angleDelta };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MiniGPDriverPhysics = api;
})(typeof window === 'object' ? window : globalThis);
