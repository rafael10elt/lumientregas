export function openGpsRoute(destination: string, origin?: string | null) {
  if (!destination) {
    return;
  }

  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", destination);

  if (origin) {
    url.searchParams.set("origin", origin);
  }

  window.open(url.toString(), "_blank", "noopener,noreferrer");
}
