// Map helpers for Nepal.

export const NEPAL_DEFAULT_CENTER: [number, number] = [28.3949, 84.124];
export const NEPAL_DEFAULT_ZOOM = 7;

// Same bounds the backend uses to validate grievance locations.
export const NEPAL_BOUNDS = {
  minLat: 26.3,
  maxLat: 30.5,
  minLng: 80.0,
  maxLng: 88.3,
};

export const NEPAL_MAX_BOUNDS: [[number, number], [number, number]] = [
  [NEPAL_BOUNDS.minLat - 0.5, NEPAL_BOUNDS.minLng - 0.5],
  [NEPAL_BOUNDS.maxLat + 0.5, NEPAL_BOUNDS.maxLng + 0.5],
];

export function isValidNepalCoordinate(lat: unknown, lng: unknown): boolean {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln) || (la === 0 && ln === 0)) return false;
  return la >= NEPAL_BOUNDS.minLat && la <= NEPAL_BOUNDS.maxLat && ln >= NEPAL_BOUNDS.minLng && ln <= NEPAL_BOUNDS.maxLng;
}

/** Center of the given points, or the center of Nepal. */
export function centerOf(points: { lat: number; lng: number }[]): [number, number] {
  const valid = points.filter((point) => isValidNepalCoordinate(point.lat, point.lng));
  if (!valid.length) return NEPAL_DEFAULT_CENTER;
  const lat = valid.reduce((sum, point) => sum + point.lat, 0) / valid.length;
  const lng = valid.reduce((sum, point) => sum + point.lng, 0) / valid.length;
  return [lat, lng];
}
