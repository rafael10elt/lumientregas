export type CapturedLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export async function captureCurrentLocation(timeoutMs = 10000): Promise<CapturedLocation | null> {
  if (!("geolocation" in navigator)) {
    return null;
  }

  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      }
    );
  });
}
