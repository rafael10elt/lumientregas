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

export function openWhatsApp(phone: string, message?: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return;

  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  const url = new URL(`https://wa.me/${normalized}`);

  if (message) {
    url.searchParams.set("text", message);
  }

  window.open(url.toString(), "_blank", "noopener,noreferrer");
}
