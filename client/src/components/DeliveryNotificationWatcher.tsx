import { useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { notifyDeliveryCreated, primeDeliveryAlertAudio } from "@/lib/deliveryNotifications";

export default function DeliveryNotificationWatcher() {
  const { tenant, user } = useAuth();
  const seenIdsRef = useRef<Set<string> | null>(null);

  const shouldWatch = Boolean(tenant?.id) && user?.role !== "motorista";

  const { data: deliveries = [] } = trpc.deliveries.list.useQuery(undefined, {
    enabled: shouldWatch,
    refetchInterval: shouldWatch ? 15000 : false,
    refetchOnWindowFocus: true,
    retry: false,
  });

  useEffect(() => {
    primeDeliveryAlertAudio();
  }, []);

  useEffect(() => {
    if (!shouldWatch) {
      seenIdsRef.current = null;
      return;
    }

    const currentIds = new Set(deliveries.map((delivery: any) => String(delivery.id)));

    if (!seenIdsRef.current) {
      seenIdsRef.current = currentIds;
      return;
    }

    const freshDeliveries = deliveries.filter((delivery: any) => !seenIdsRef.current?.has(String(delivery.id)));
    if (freshDeliveries.length > 0) {
      notifyDeliveryCreated(
        freshDeliveries.map((delivery: any) => ({
          id: String(delivery.id),
          deliveryCode: delivery.deliveryCode ?? null,
          clientName: delivery.clientName ?? null,
        }))
      );
    }

    seenIdsRef.current = currentIds;
  }, [deliveries, shouldWatch]);

  return null;
}
