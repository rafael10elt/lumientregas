import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { openGpsRoute } from "@/lib/navigation";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock3, Loader2, MapPin, Package2 } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

const DELIVERY_STATUSES = [
  { value: "pendente", label: "Pendente" },
  { value: "em_rota", label: "Em Rota" },
  { value: "entregue", label: "Entregue" },
  { value: "cancelado", label: "Cancelado" },
] as const;

function isToday(value: string | Date | null | undefined) {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export default function DriverPortal() {
  const { user, loading } = useAuth();
  const { data: drivers = [] } = trpc.drivers.list.useQuery();
  const driver = useMemo(
    () => drivers.find((entry: any) => entry.email && entry.email === user?.email) ?? null,
    [drivers, user?.email]
  );

  const { data: deliveries = [], refetch } = trpc.deliveries.list.useQuery(
    driver ? { driverId: driver.id } : undefined,
    { enabled: Boolean(driver) }
  );

  const updateMutation = trpc.deliveries.update.useMutation();

  const todayDeliveries = deliveries.filter((delivery: any) => isToday(delivery.scheduledAt));
  const historyDeliveries = deliveries.filter((delivery: any) => !isToday(delivery.scheduledAt));

  const updateStatus = async (deliveryId: number, status: string) => {
    try {
      await updateMutation.mutateAsync({ id: deliveryId, status: status as any });
      toast.success("Status atualizado");
      refetch();
    } catch {
      toast.error("Não foi possível atualizar o status");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!driver) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Painel do motorista</CardTitle>
          <CardDescription>
            Seu e-mail não está vinculado a um motorista cadastrado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Peça para o gestor cadastrar seu e-mail no cadastro de motoristas.
          </p>
          <Button onClick={() => (window.location.href = "/")}>Voltar ao sistema</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Painel do Motorista</h1>
        <p className="text-muted-foreground mt-1">
          {driver.name} • Acompanhe as entregas do dia e atualize os status em tempo real
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Entregas hoje</p>
                <p className="text-2xl font-semibold">{todayDeliveries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Histórico</p>
                <p className="text-2xl font-semibold">{historyDeliveries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Concluídas</p>
                <p className="text-2xl font-semibold">
                  {deliveries.filter((delivery: any) => delivery.status === "entregue").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entregas de Hoje</CardTitle>
          <CardDescription>Atualize a etapa assim que cada entrega avançar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {todayDeliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma entrega programada para hoje.</p>
            ) : (
              todayDeliveries.map((delivery: any) => (
                <div key={delivery.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
                    <div className="space-y-1">
                      <div className="font-semibold">{delivery.clientName}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {delivery.destinationAddress}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {delivery.destinationPostalCode || "-"} • {delivery.scheduledAt ? new Date(delivery.scheduledAt).toLocaleString("pt-BR") : "Sem horário"}
                      </div>
                    </div>
                    <Select value={delivery.status} onValueChange={value => updateStatus(delivery.id, value)}>
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DELIVERY_STATUSES.map(status => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    className="mt-3 w-full md:w-auto"
                    onClick={() => openGpsRoute(delivery.destinationAddress)}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Abrir no GPS
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
          <CardDescription>Entregas anteriores do motorista</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {historyDeliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum histórico disponível.</p>
            ) : (
              historyDeliveries.map((delivery: any) => (
                <div key={delivery.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold">{delivery.clientName}</div>
                      <div className="text-sm text-muted-foreground">{delivery.destinationAddress}</div>
                      <div className="text-xs text-muted-foreground">
                        {delivery.scheduledAt ? new Date(delivery.scheduledAt).toLocaleDateString("pt-BR") : "Sem data"}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openGpsRoute(delivery.destinationAddress)}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      GPS
                    </Button>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                      {DELIVERY_STATUSES.find(status => status.value === delivery.status)?.label ?? delivery.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
