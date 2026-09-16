const RADIANS = Math.PI / 180;

const SAME_SITE_DEG2 = 0.0025;

/** cobe v2 front-center heading for a lat/lon broadcast site. */
export function globeHeading(latitude: number, longitude: number): readonly [number, number] {
  return [Math.PI * 1.5 - longitude * RADIANS, latitude * RADIANS];
}

export function shortestAngle(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function formatGeo(latitude: number, longitude: number): string {
  return `${Math.abs(latitude).toFixed(2)}° ${latitude < 0 ? "S" : "N"} · ${Math.abs(longitude).toFixed(2)}° ${longitude < 0 ? "W" : "E"}`;
}

export function signalArc(
  from: readonly [number, number],
  to: readonly [number, number],
): { from: [number, number]; to: [number, number]; id: "signal" } | null {
  const latitudeDelta = from[0] - to[0];
  const longitudeDelta = from[1] - to[1];

  if (latitudeDelta * latitudeDelta + longitudeDelta * longitudeDelta < SAME_SITE_DEG2) {
    return null;
  }

  return {
    from: [from[0], from[1]],
    to: [to[0], to[1]],
    id: "signal",
  };
}
