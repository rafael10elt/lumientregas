import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { openGpsRoute, openWhatsApp } from "@/lib/navigation";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  MessageCircleMore,
  Package2,
  Truck,
} from "lucide-react";
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
    () =>
      drivers.find((entry: any) => entry.userId === user?.id) ??
      drivers.find((entry: any) => entry.email && entry.email === user?.email) ??
      null,
    [drivers, user?.email, user?.id]
  );

  const { data: deliveries = [], refetch } = trpc.deliveries.list.useQuery(
    driver ? { driverId: driver.id } : undefined,
    { enabled: Boolean(driver) }
  );
  const { data: vehicles = [] } = trpc.driverVehicles.list.useQuery(
    driver ? { driverId: driver.id } : undefined,
    { enabled: Boolean(driver) }
  );

  const updateMutation = trpc.deliveries.update.useMutation();

  const todayDeliveries = deliveries.filter((delivery: any) => isToday(delivery.scheduledAt));
  const historyDeliveries = deliveries.filter((delivery: any) => !isToday(delivery.scheduledAt));
  const primaryVehicle = vehicles.find((vehicle: any) => vehicle.isPrimary) ?? vehicles[0] ?? null;

  const updateStatus = async (deliveryId: string, status: string) => {
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
            Seu usuário ainda não está vinculado a um motorista cadastrado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">O que fazer agora</p>
            <p className="mt-2">
              Peça ao gestor para vincular seu usuário ao cadastro de motorista. Assim você vai
              enxergar suas entregas, status e veículos.
            </p>
            <p className="mt-2">
              Login atual: <span className="font-medium text-foreground">{user?.email || "-"}</span>
            </p>
          </div>
          <Button onClick={() => (window.location.href = "/")}>Voltar ao sistema</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Painel do Motorista</h1>
        <p className="mt-1 text-muted-foreground">
          {driver.name} • acompanhe as entregas do dia e atualize os status em tempo real
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {driver.phone ? (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => openWhatsApp(driver.phone, `Olá ${driver.name}, tudo bem?`)}
            >
              <MessageCircleMore className="h-4 w-4" />
              WhatsApp do motorista
            </Button>
          ) : null}
          <Button variant="outline" className="gap-2" onClick={() => openGpsRoute("Lumi Entregas")}>
            <MapPin className="h-4 w-4" />
            Abrir no GPS
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
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
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Veículos</p>
                <p className="text-2xl font-semibold">{vehicles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Veículos vinculados</CardTitle>
          <CardDescription>
            {vehicles.length > 0
              ? "Os veículos cadastrados para o seu perfil aparecem abaixo."
              : "Nenhum veículo foi cadastrado para este motorista ainda."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {vehicles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Solicite ao gestor o cadastro do veículo principal para facilitar a operação.
              </div>
            ) : (
              vehicles.map((vehicle: any) => (
                <div key={vehicle.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{vehicle.model}</p>
                      <p className="text-sm text-muted-foreground">{vehicle.plate}</p>
                      <p className="text-xs text-muted-foreground">{vehicle.nickname || "-"}</p>
                    </div>
                    {vehicle.isPrimary ? (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        Principal
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
          {primaryVehicle ? (
            <div className="mt-4 rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
              Veículo principal:{" "}
              <span className="font-medium text-foreground">
                {primaryVehicle.model} • {primaryVehicle.plate}
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

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
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {delivery.destinationAddress}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {delivery.destinationPostalCode || "-"} •{" "}
                        {delivery.scheduledAt
                          ? new Date(delivery.scheduledAt).toLocaleString("pt-BR")
                          : "Sem horário"}
                      </div>
                    </div>
                    <Select
                      value={delivery.status}
                      onValueChange={value => updateStatus(delivery.id, value)}
                    >
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
                        {delivery.scheduledAt
                          ? new Date(delivery.scheduledAt).toLocaleDateString("pt-BR")
                          : "Sem data"}
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
                      {DELIVERY_STATUSES.find(status => status.value === delivery.status)?.label ??
                        delivery.status}
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
