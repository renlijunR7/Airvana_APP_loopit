// Three voices is a local completion rule; the demo does not reveal its threshold.
export const MIN_CHAIN = 3;

export function segmentHits(from, to, nodes, radius = 34) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length2 = dx * dx + dy * dy;
  return nodes.map(node => {
    const t = length2 === 0 ? 0 : Math.max(0, Math.min(1,
      ((node.x - from.x) * dx + (node.y - from.y) * dy) / length2));
    const distance2 = (node.x - from.x - t * dx) ** 2 + (node.y - from.y - t * dy) ** 2;
    return { id: node.id, t, distance2 };
  }).filter(hit => hit.distance2 <= radius * radius)
    .sort((a, b) => a.t - b.t).map(hit => hit.id);
}

export function extendPath(path, id) {
  if (path.length > 1 && path[path.length - 2] === id) return path.slice(0, -1);
  if (path.includes(id)) return path;
  return [...path, id];
}
