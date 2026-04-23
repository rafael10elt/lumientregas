export type GeoPoint = {
  lat: number;
  lng: number;
  label?: string;
};

const geoCache = new Map<string, GeoPoint | null>();

function normalizeQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  const normalized = normalizeQuery(address);
  if (!normalized) return null;

  const cached = geoCache.get(normalized);
  if (cached !== undefined) {
    return cached;
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", `${normalized}, Brasil`);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "LumiEntregas/1.0 (route-planner)",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    geoCache.set(normalized, null);
    return null;
  }

  const data = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name?: string;
  }>;

  if (!data[0]) {
    geoCache.set(normalized, null);
    return null;
  }

  const point = {
    lat: Number(data[0].lat),
    lng: Number(data[0].lon),
    label: data[0].display_name,
  };

  geoCache.set(normalized, point);
  return point;
}

export function haversineKm(a: GeoPoint, b: GeoPoint) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(h)));
}

export async function optimizeByProximity<T extends { id: number; address: string }>(
  baseAddress: string,
  stops: T[]
) {
  const base = await geocodeAddress(baseAddress);
  if (!base) {
    return stops.map((stop, index) => ({
      ...stop,
      routeOrder: index + 1,
      distanceFromPreviousKm: null as number | null,
      coordinates: null as GeoPoint | null,
    }));
  }

  const enriched = await Promise.all(
    stops.map(async stop => ({
      stop,
      coordinates: await geocodeAddress(stop.address),
    }))
  );

  const pending = enriched.filter(item => item.coordinates);
  const remaining = new Set(pending.map(item => item.stop.id));
  const route: Array<{
    id: number;
    routeOrder: number;
    distanceFromPreviousKm: number | null;
    coordinates: GeoPoint | null;
  }> = [];

  let currentPoint = base;
  let order = 1;

  while (remaining.size > 0) {
    let nextCandidate: (typeof pending)[number] | null = null;
    let nextDistance = Number.POSITIVE_INFINITY;

    for (const item of pending) {
      if (!remaining.has(item.stop.id) || !item.coordinates) continue;
      const distance = haversineKm(currentPoint, item.coordinates);
      if (distance < nextDistance) {
        nextDistance = distance;
        nextCandidate = item;
      }
    }

    if (!nextCandidate || !nextCandidate.coordinates) {
      break;
    }

    route.push({
      id: nextCandidate.stop.id,
      routeOrder: order,
      distanceFromPreviousKm: Number(nextDistance.toFixed(2)),
      coordinates: nextCandidate.coordinates,
    });
    remaining.delete(nextCandidate.stop.id);
    currentPoint = nextCandidate.coordinates;
    order += 1;
  }

  const leftovers = stops.filter(stop => !route.some(entry => entry.id === stop.id));
  leftovers.forEach(stop => {
    route.push({
      id: stop.id,
      routeOrder: order,
      distanceFromPreviousKm: null,
      coordinates: null,
    });
    order += 1;
  });

  return route;
}
