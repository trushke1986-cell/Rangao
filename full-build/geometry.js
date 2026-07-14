import { constructionData, getStage } from './construction-data.js';

export const distance2D = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

export const distance3D = (a, b) => Math.hypot(
  b[0] - a[0],
  b[1] - a[1],
  b[2] - a[2],
);

export const roofZ = (x, y) => (
  constructionData.roof.z0 + constructionData.roof.slopeXY * (x + y)
);

export const postTop = (id) => {
  const [x, y] = constructionData.points[id];
  return roofZ(x, y);
};

export const rightBoundaryAtY = (y) => (y <= 2000 ? 3000 : 5000 - y);

export const roofPlan = () => [
  [-constructionData.roof.overhang, -constructionData.roof.overhang],
  [3000 + constructionData.roof.overhang, -constructionData.roof.overhang],
  [3000 + constructionData.roof.overhang, 2062],
  [2062, 3000 + constructionData.roof.overhang],
  [-constructionData.roof.overhang, 3000 + constructionData.roof.overhang],
];

const cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];

export function clipInfiniteLineToPolygon(point, direction, polygon) {
  const hits = [];

  polygon.forEach((a, index) => {
    const b = polygon[(index + 1) % polygon.length];
    const edge = [b[0] - a[0], b[1] - a[1]];
    const delta = [a[0] - point[0], a[1] - point[1]];
    const denominator = cross2(direction, edge);
    if (Math.abs(denominator) < 1e-9) return;

    const t = cross2(delta, edge) / denominator;
    const u = cross2(delta, direction) / denominator;
    if (u < -1e-9 || u > 1 + 1e-9) return;

    hits.push({
      t,
      point: [point[0] + t * direction[0], point[1] + t * direction[1]],
    });
  });

  const unique = new Map();
  hits.forEach((hit) => unique.set(hit.t.toFixed(5), hit));
  const ordered = [...unique.values()].sort((a, b) => a.t - b.t);
  if (ordered.length < 2) return null;
  return [ordered[0].point, ordered.at(-1).point];
}

export const visibleLayerIdsForStage = (id) => [...getStage(id).layerIds];

const diagonal = 1 / Math.sqrt(2);

export function computeRafterSegments() {
  const direction = [diagonal, diagonal];
  return constructionData.members.rafters.offsets.flatMap((offset, index) => {
    const segment = clipInfiniteLineToPolygon(
      [offset / 2, -offset / 2],
      direction,
      roofPlan(),
    );
    if (!segment) return [];
    const start = [segment[0][0], segment[0][1], roofZ(...segment[0]) + 75];
    const end = [segment[1][0], segment[1][1], roofZ(...segment[1]) + 75];
    return [{ id: `RAFTER-${String(index + 1).padStart(2, '0')}`, start, end, lengthMm: distance3D(start, end) }];
  });
}

export function computeBattenSegments() {
  const direction = [diagonal, -diagonal];
  return constructionData.members.battens.sums.flatMap((sum, index) => {
    const segment = clipInfiniteLineToPolygon(
      [sum / 2, sum / 2],
      direction,
      roofPlan(),
    );
    if (!segment) return [];
    const start = [segment[0][0], segment[0][1], roofZ(...segment[0]) + 175];
    const end = [segment[1][0], segment[1][1], roofZ(...segment[1]) + 175];
    return [{ id: `BATTEN-${String(index + 1).padStart(2, '0')}`, start, end, lengthMm: distance3D(start, end) }];
  });
}

export const pointAlong = (a, b, t, z) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  z,
];
