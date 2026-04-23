import { Button } from "@/components/ui/button";

type Props = {
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  label?: string;
  className?: string;
};

export function buildGpsUrl(address: string, latitude?: number | null, longitude?: number | null) {
  if (latitude != null && longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default function OpenGpsButton({
  address,
  latitude,
  longitude,
  label = "Abrir no GPS",
  className,
}: Props) {
  return (
    <Button asChild variant="outline" size="sm" className={className}>
      <a href={buildGpsUrl(address, latitude, longitude)} target="_blank" rel="noreferrer">
        {label}
      </a>
    </Button>
  );
}
