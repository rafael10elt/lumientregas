import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import OpenGpsButton from "@/components/OpenGpsButton";
import { useAuth } from "@/_core/hooks/useAuth";

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  em_rota: "Em rota",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export default function DriverPortal() {
  const { user } = useAuth();
  const [driverId, setDriverId] = useState("");
  const today = useMemo(() => new Date(), []);
  const startDate = new Date(today);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setHours(23, 59, 59, 999);

  const { data: drivers = [] } = trpc.drivers.list.useQuery();
  const { data: meDriver } = trpc.drivers.me.useQuery(undefined, { enabled: user?.role === "motorista" });

  useEffect(() => {
    if (meDriver?.id) {
      setDriverId(meDriver.id);
    }
  }, [meDriver?.id]);

  const { data: todayDeliveries = [], refetch } = trpc.deliveries.list.useQuery({
    driverId: driverId || undefined,
    startDate,
    endDate,
  });
  const { data: history = [] } = trpc.deliveries.list.useQuery({
    driverId: driverId || undefined,
  });
  const updateMutation = trpc.deliveries.update.useMutation();

  const updateStatus = async (id: string, status: string) => {
    await updateMutation.mutateAsync({ id, status: status as any });
    toast.success("Status atualizado");
    refetch();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Painel do Motorista</h1>
        <p className="text-muted-foreground">Entregas do dia, histórico e atualização de status.</p>
      </div>

      {user?.role !== "motorista" ? (
        <Card>
          <CardHeader>
            <CardTitle>Selecionar motorista</CardTitle>
            <CardDescription>Use esta tela para acompanhar qualquer motorista da operação.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Escolha um motorista" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((driver: any) => (
                  <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Motorista logado</CardTitle>
            <CardDescription>{meDriver?.name || "Perfil motorista vinculado ao usuário atual."}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Entregas de hoje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayDeliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma entrega para hoje.</p>
            ) : todayDeliveries.map((delivery: any) => (
              <div key={delivery.id} className="rounded-lg border p-4 space-y-3">
                <div>
                  <p className="font-medium">{delivery.clientName}</p>
                  <p className="text-sm text-muted-foreground">{delivery.destinationAddress}</p>
                </div>
                <OpenGpsButton
                  address={delivery.destinationAddress}
                  latitude={delivery.destinationLatitude}
                  longitude={delivery.destinationLongitude}
                />
                <div className="flex flex-wrap gap-2">
                  {["em_rota", "entregue", "cancelado"].map(status => (
                    <Button key={status} variant="outline" size="sm" onClick={() => updateStatus(delivery.id, status)}>
                      {STATUS_LABELS[status]}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum histórico disponível.</p>
            ) : history.map((delivery: any) => (
              <div key={delivery.id} className="rounded-lg border p-4 space-y-2">
                <p className="font-medium">{delivery.clientName}</p>
                <p className="text-sm text-muted-foreground">{delivery.destinationAddress}</p>
                <OpenGpsButton
                  address={delivery.destinationAddress}
                  latitude={delivery.destinationLatitude}
                  longitude={delivery.destinationLongitude}
                  label="Abrir rota"
                />
                <p className="text-xs mt-2">{STATUS_LABELS[delivery.status] || delivery.status}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
