import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { captureCurrentLocation } from "@/lib/geolocation";
import { openGpsRoute, openWhatsApp } from "@/lib/navigation";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Loader2,
  MapPin,
  MessageCircleMore,
  Navigation,
  Package2,
  Route,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const DELIVERY_STATUSES = [
  { value: "pendente", label: "Pendente" },
  { value: "em_rota", label: "Em rota" },
  { value: "entregue", label: "Entregue" },
  { value: "cancelado", label: "Cancelado" },
] as const;

const STATUS_STYLES: Record<string, string> = {
  pendente: "border-yellow-200 bg-yellow-50 text-yellow-800",
  em_rota: "border-blue-200 bg-blue-50 text-blue-800",
  entregue: "border-emerald-200 bg-emerald-50 text-emerald-800",
  cancelado: "border-rose-200 bg-rose-50 text-rose-800",
};

function isToday(value: string | Date | null | undefined) {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("pt-BR");
}

function DriverDeliveryCard({
  delivery,
  onStatusChange,
}: {
  delivery: any;
  onStatusChange: (deliveryId: string, status: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: events = [] } = trpc.deliveryEvents.list.useQuery(
    { deliveryId: delivery.id },
    { enabled: expanded }
  );

  const latestEvent = events[0];

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="rounded-2xl border border-border/70 bg-background shadow-sm transition-shadow hover:shadow-md">
        <div className="flex flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={STATUS_STYLES[delivery.status] ?? ""}>
                {DELIVERY_STATUSES.find(status => status.value === delivery.status)?.label ??
                  delivery.status}
              </Badge>
              <Badge variant="secondary">Ordem {delivery.routeOrder ?? "auto"}</Badge>
              <Badge variant="outline">{delivery.destinationPostalCode || "Sem CEP"}</Badge>
            </div>

            <div>
              <div className="font-semibold text-foreground">{delivery.clientName}</div>
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {delivery.destinationAddress}
              </div>
            </div>

            <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="font-medium text-foreground">Agenda</div>
                <div className="mt-1">{formatDateTime(delivery.scheduledAt)}</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="font-medium text-foreground">Ultima movimentacao</div>
                <div className="mt-1">
                  {latestEvent ? formatDateTime(latestEvent.recordedAt) : "Sem registro ainda"}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:min-w-[240px]">
            <div className="grid grid-cols-2 gap-2">
              {DELIVERY_STATUSES.map(status => (
                <Button
                  key={status.value}
                  size="sm"
                  variant={delivery.status === status.value ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => onStatusChange(delivery.id, status.value)}
                >
                  {status.label}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              className="justify-between"
              onClick={() => setExpanded(prev => !prev)}
            >
              <span>Detalhes da entrega</span>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="gap-2" onClick={() => openGpsRoute(delivery.destinationAddress)}>
                <Navigation className="h-4 w-4" />
                GPS
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => onStatusChange(delivery.id, delivery.status)}>
                <Route className="h-4 w-4" />
                Registrar
              </Button>
            </div>
          </div>
        </div>

        <CollapsibleContent>
          <div className="border-t border-border/60 px-4 py-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Origem
                </div>
                <div className="mt-1 text-sm text-foreground">{delivery.originAddress}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {delivery.originPostalCode || "Sem CEP"}
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Observacoes
                </div>
                <div className="mt-1 text-sm text-foreground">
                  {delivery.notes || "Sem observacoes"}
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Evento atual
                </div>
                <div className="mt-1 text-sm text-foreground">
                  {latestEvent ? `${latestEvent.fromStatus || "inicio"} -> ${latestEvent.toStatus}` : "Sem registro"}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {latestEvent?.metadata?.actorRole ? `Autor: ${String(latestEvent.metadata.actorRole)}` : "Motorista ou gestor"}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Clock3 className="h-4 w-4 text-primary" />
                Historico de status
              </div>
              <div className="space-y-2">
                {events.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Nenhum evento registrado ainda.
                  </div>
                ) : (
                  events.map((event: any) => (
                    <div key={event.id} className="rounded-lg border border-border/60 bg-background p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium text-foreground">
                          {event.fromStatus || "inicio"} {" -> "} {event.toStatus}
                        </div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(event.recordedAt)}</div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {event.latitude && event.longitude
                          ? `GPS ${event.latitude}, ${event.longitude}`
                          : "GPS nao capturado"}
                        {event.accuracy ? ` • Precisao ${event.accuracy}m` : ""}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
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

  const updateStatusMutation = trpc.deliveries.updateStatus.useMutation();

  const todayDeliveries = deliveries.filter((delivery: any) => isToday(delivery.scheduledAt));
  const historyDeliveries = deliveries.filter((delivery: any) => !isToday(delivery.scheduledAt));
  const primaryVehicle = vehicles.find((vehicle: any) => vehicle.isPrimary) ?? vehicles[0] ?? null;

  const updateStatus = async (deliveryId: string, status: string) => {
    try {
      const location = await captureCurrentLocation();
      await updateStatusMutation.mutateAsync({
        id: deliveryId,
        status: status as any,
        latitude: location?.latitude,
        longitude: location?.longitude,
        accuracy: location?.accuracy ?? undefined,
        metadata: {
          source: "driver_portal",
          driverId: driver?.id ?? null,
        },
      });
      toast.success("Status atualizado");
      refetch();
    } catch {
      toast.error("Nao foi possivel atualizar o status");
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
            Seu usuario ainda nao esta vinculado a um motorista cadastrado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">O que fazer agora</p>
            <p className="mt-2">
              Peça ao gestor para vincular seu usuario ao cadastro de motorista. Assim voce vai
              enxergar suas entregas, status e veiculos.
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
                <p className="text-sm text-muted-foreground">Historico</p>
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
                <p className="text-sm text-muted-foreground">Concluidas</p>
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
                <p className="text-sm text-muted-foreground">Veiculos</p>
                <p className="text-2xl font-semibold">{vehicles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Veiculos vinculados</CardTitle>
          <CardDescription>
            {vehicles.length > 0
              ? "Os veiculos cadastrados para o seu perfil aparecem abaixo."
              : "Nenhum veiculo foi cadastrado para este motorista ainda."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {vehicles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Solicite ao gestor o cadastro do veiculo principal para facilitar a operacao.
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
              Veiculo principal:{" "}
              <span className="font-medium text-foreground">
                {primaryVehicle.model} • {primaryVehicle.plate}
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entregas de hoje</CardTitle>
          <CardDescription>Atualize a etapa assim que cada entrega avancar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {todayDeliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma entrega programada para hoje.</p>
            ) : (
              todayDeliveries.map((delivery: any) => (
                <DriverDeliveryCard
                  key={delivery.id}
                  delivery={delivery}
                  onStatusChange={updateStatus}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historico</CardTitle>
          <CardDescription>Entregas anteriores do motorista</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {historyDeliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum historico disponivel.</p>
            ) : (
              historyDeliveries.map((delivery: any) => (
                <DriverDeliveryCard
                  key={delivery.id}
                  delivery={delivery}
                  onStatusChange={updateStatus}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
