// Coordinates are relative to the table focus (world y = 1.45).
// Keep the camera and its near plane inside the room's solid walls. Raising
// the orbit near a wall preserves viewing distance instead of zooming into
// the table. This must also run AFTER interpolation, not just on user input.
export const CAMERA_LIMITS = Object.freeze({
  minElevation: 0.58,
  maxElevation: 1.38,
  focusY: 1.45,
  room: Object.freeze({ minX: -8.9, maxX: 8.9, minZ: -5.15, maxZ: 7.5 }),
  landscape: Object.freeze({ minRadius: 8.8, maxRadius: 13.5 }),
  portrait: Object.freeze({ minRadius: 11.8, maxRadius: 15.6 }),
});

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const finite = (v, fallback) => Number.isFinite(v) ? v : fallback;

export function resolveOrbit({ azimuth = 0, elevation = 0.77, radius = 10, portrait = false } = {}) {
  const a = finite(azimuth, 0);
  const requestedElevation = finite(elevation, portrait ? 1 : 0.77);
  const requestedRadius = finite(radius, portrait ? 13.4 : 10);
  const limits = portrait ? CAMERA_LIMITS.portrait : CAMERA_LIMITS.landscape;
  const r = clamp(requestedRadius, limits.minRadius, limits.maxRadius);
  const sin = Math.sin(a), cos = Math.cos(a);
  const { room } = CAMERA_LIMITS;
  const xLimit = (sin < 0 ? -room.minX : room.maxX) / Math.max(1e-12, Math.abs(sin));
  const zLimit = (cos < 0 ? -room.minZ : room.maxZ) / Math.max(1e-12, Math.abs(cos));
  const horizontalLimit = Math.min(xLimit, zLimit);
  const wallElevation = Math.acos(Math.min(1, horizontalLimit / r));
  const e = Math.max(clamp(requestedElevation, CAMERA_LIMITS.minElevation, CAMERA_LIMITS.maxElevation), wallElevation);
  const horizontal = r * Math.cos(e);
  return {
    azimuth: a, elevation: e, radius: r,
    x: sin * horizontal, y: Math.sin(e) * r, z: cos * horizontal,
    limited: Math.abs(e - requestedElevation) > 1e-9 || Math.abs(r - requestedRadius) > 1e-9,
  };
}
