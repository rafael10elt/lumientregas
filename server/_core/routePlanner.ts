export type RouteStop = {
  id: string;
  label: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  order?: number | null;
};

export type OptimizedStop = RouteStop & {
  sequence: number;
  distanceFromPreviousMeters: number | null;
};

type NominatimResult = {
  lat: string;
  lon: string;
};

function haversineDistanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) {
  const earthRadiusMeters = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const aa = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(aa)));
}

async function geocodeAddress(address: string) {
  if (!address.trim()) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", address);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "LumiEntregas/1.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as NominatimResult[];
  const first = data[0];
  if (!first) return null;

  const latitude = Number(first.lat);
  const longitude = Number(first.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { latitude, longitude };
}

export async function optimizeRouteByProximity(
  stops: RouteStop[],
  origin?: { latitude: number; longitude: number } | null
) {
  const enriched = await Promise.all(
    stops.map(async stop => ({
      ...stop,
      geocoded: stop.latitude != null && stop.longitude != null
        ? { latitude: stop.latitude, longitude: stop.longitude }
        : await geocodeAddress(stop.address),
    }))
  );

  const remaining = enriched.filter(item => item.geocoded);
  const ordered: OptimizedStop[] = [];
  let cursor = origin ?? null;
  let sequence = 1;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    remaining.forEach((candidate, index) => {
      const distance = cursor
        ? haversineDistanceMeters(cursor, candidate.geocoded!)
        : index;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    const [picked] = remaining.splice(bestIndex, 1);
    ordered.push({
      ...picked,
      latitude: picked.geocoded!.latitude,
      longitude: picked.geocoded!.longitude,
      sequence,
      distanceFromPreviousMeters: Number.isFinite(bestDistance) ? bestDistance : null,
    });
    cursor = picked.geocoded!;
    sequence += 1;
  }

  const unresolved = enriched.filter(item => !item.geocoded);
  for (const stop of unresolved) {
    ordered.push({
      ...stop,
      sequence,
      distanceFromPreviousMeters: null,
    });
    sequence += 1;
  }

  return ordered;
}

export async function geocodePostalCode(postalCode: string) {
  const clean = postalCode.replace(/\D/g, "");
  if (clean.length !== 8) return null;

  const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
  if (!response.ok) return null;

  const data = await response.json();
  if (data.erro) return null;

  return {
    postalCode: clean,
    street: data.logradouro ?? "",
    neighborhood: data.bairro ?? "",
    city: data.localidade ?? "",
    state: data.uf ?? "",
    complement: data.complemento ?? "",
  };
}
