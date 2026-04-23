import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { lookupCep } from "@/lib/cep";
import { formatCep } from "@/lib/format";
import { openGpsRoute } from "@/lib/navigation";
import { trpc } from "@/lib/trpc";
import { ArrowDown, ArrowUp, MapPin, Navigation, RefreshCw, Save, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type RoutePlanItem = any & {
  routeOrder?: number | null;
  distanceFromPreviousKm?: number | null;
};

type RoutePlans = Record<string, RoutePlanItem[]>;

export default function Routes() {
  const [basePostalCode, setBasePostalCode] = useState("");
  const [baseAddress, setBaseAddress] = useState("Rua Principal, 1 - Centro");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("all");
  const [routePlans, setRoutePlans] = useState<RoutePlans>({});
  const [activeDriverIds, setActiveDriverIds] = useState<string[]>([]);
  const [loadingBase, setLoadingBase] = useState(false);

  const todayStart = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const todayEnd = useMemo(() => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date;
  }, []);

  const { data: deliveries = [], refetch } = trpc.deliveries.list.useQuery({
    startDate: todayStart,
    endDate: todayEnd,
  });
  const { data: drivers = [] } = trpc.drivers.list.useQuery();
  const optimizeMutation = trpc.routes.optimize.useMutation();
  const reorderMutation = trpc.deliveries.reorder.useMutation();

  const openDeliveries = useMemo(
    () =>
      deliveries.filter(
        (delivery: any) => delivery.status !== "entregue" && delivery.status !== "cancelado"
      ),
    [deliveries]
  );

  const visibleDrivers = useMemo(() => {
    const byDriver = new Map<string, RoutePlanItem[]>();
    for (const delivery of openDeliveries) {
      if (!delivery.driverId) continue;
      const current = byDriver.get(delivery.driverId) ?? [];
      current.push(delivery);
      byDriver.set(delivery.driverId, current);
    }

    const result = drivers.filter((driver: any) =>
      selectedDriverId === "all" ? true : driver.id === selectedDriverId
    );

    return result.map((driver: any) => ({
      driver,
      deliveries: byDriver.get(driver.id) ?? [],
    }));
  }, [drivers, openDeliveries, selectedDriverId]);

  const fillBaseFromCep = async () => {
    if (!basePostalCode) {
      toast.error("Informe o CEP da base");
      return;
    }

    setLoadingBase(true);
    try {
      const result = await lookupCep(basePostalCode);
      setBasePostalCode(result.cep);
      setBaseAddress(result.fullAddress);
      toast.success("Base preenchida com sucesso");
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível consultar o CEP");
    } finally {
      setLoadingBase(false);
    }
  };

  const generateRoute = async (driverId: string) => {
    try {
      const data = await optimizeMutation.mutateAsync({
        driverId,
        baseAddress,
        scheduledAt: todayStart,
      });

      setRoutePlans(prev => ({
        ...prev,
        [driverId]: (data?.deliveries ?? []).map((delivery: any) => ({
          ...delivery,
          routeOrder: delivery.routeOrder,
        })),
      }));

      if (!activeDriverIds.includes(driverId)) {
        setActiveDriverIds(prev => [...prev, driverId]);
      }

      toast.success("Rota gerada e pronta para revisão");
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível gerar a rota");
    }
  };

  const moveStop = (driverId: string, index: number, direction: -1 | 1) => {
    setRoutePlans(prev => {
      const plan = [...(prev[driverId] ?? [])];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= plan.length) return prev;
      [plan[index], plan[targetIndex]] = [plan[targetIndex], plan[index]];
      return {
        ...prev,
        [driverId]: plan.map((item, idx) => ({ ...item, routeOrder: idx + 1 })),
      };
    });
  };

  const saveRoute = async (driverId: string) => {
    const plan = routePlans[driverId] ?? [];
    if (plan.length === 0) {
      toast.error("Não há rota gerada para salvar");
      return;
    }

    try {
      await reorderMutation.mutateAsync({
        driverId,
        scheduledAt: todayStart,
        order: plan.map((item, index) => ({
          id: item.id,
          routeOrder: index + 1,
        })),
      });

      setActiveDriverIds(prev => (prev.includes(driverId) ? prev : [...prev, driverId]));
      toast.success("Rota salva com sucesso");
      refetch();
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível salvar a rota");
    }
  };

  const resetRoute = (driverId: string) => {
    setRoutePlans(prev => {
      const next = { ...prev };
      delete next[driverId];
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Roteirização</h1>
        <p className="text-muted-foreground mt-1">
          Revisão de rotas automáticas, ordenação manual e base por CEP.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Base operacional</CardTitle>
          <CardDescription>
            Informe o CEP da origem para preencher o endereço completo automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr,2fr,auto]">
          <div className="space-y-2">
            <Label>CEP da base</Label>
            <Input
              placeholder="00000-000"
              value={basePostalCode}
              onChange={e => setBasePostalCode(formatCep(e.target.value))}
              inputMode="numeric"
            />
          </div>
          <div className="space-y-2">
            <Label>Endereço base</Label>
            <Input value={baseAddress} onChange={e => setBaseAddress(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={fillBaseFromCep} disabled={loadingBase}>
              <Search className="mr-2 h-4 w-4" />
              Consultar CEP
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="space-y-2 lg:col-span-2">
              <Label>Motorista</Label>
              <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os motoristas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os motoristas</SelectItem>
                  {drivers.map((driver: any) => (
                    <SelectItem key={driver.id} value={String(driver.id)}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setRoutePlans({});
                  setActiveDriverIds([]);
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Limpar revisões
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Entregas em aberto</p>
            <p className="text-2xl font-semibold">{openDeliveries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Motoristas com rota</p>
            <p className="text-2xl font-semibold">{visibleDrivers.filter(entry => entry.deliveries.length > 0).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Rotas revisadas</p>
            <p className="text-2xl font-semibold">{activeDriverIds.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Base</p>
            <p className="text-sm font-medium truncate">{baseAddress}</p>
          </CardContent>
        </Card>
      </div>

      {visibleDrivers.map(({ driver, deliveries: driverDeliveries }: any) => {
        const currentPlan = routePlans[driver.id] ?? driverDeliveries;
        const hasPlan = Boolean(routePlans[driver.id]);

        return (
          <Card key={driver.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>{driver.name}</CardTitle>
                  <CardDescription>
                    {driverDeliveries.length} entregas em aberto para hoje
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => generateRoute(driver.id)} disabled={driverDeliveries.length === 0}>
                    <Navigation className="mr-2 h-4 w-4" />
                    Gerar rota automática
                  </Button>
                  <Button variant="default" onClick={() => saveRoute(driver.id)} disabled={!hasPlan}>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar revisão
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {currentPlan.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  Nenhuma entrega atribuída para este motorista hoje.
                </div>
              ) : (
                <div className="space-y-3">
                  {currentPlan.map((delivery: any, index: number) => (
                    <div key={delivery.id} className="flex items-start gap-3 rounded-lg border p-4">
                      <div className="flex flex-col items-center gap-2 pt-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveStop(driver.id, index, -1)}
                          disabled={index === 0 || !hasPlan}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                          {delivery.routeOrder ?? index + 1}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveStop(driver.id, index, 1)}
                          disabled={index === currentPlan.length - 1 || !hasPlan}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{delivery.clientName}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {delivery.destinationAddress}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {delivery.destinationPostalCode || "Sem CEP"} • Ordem{" "}
                              {delivery.routeOrder ?? index + 1}
                            </div>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mb-2"
                              onClick={() => openGpsRoute(delivery.destinationAddress)}
                            >
                              Abrir GPS
                            </Button>
                            <div>{delivery.scheduledAt ? new Date(delivery.scheduledAt).toLocaleString("pt-BR") : "Sem agendamento"}</div>
                            <div>
                              {delivery.distanceFromPreviousKm != null
                                ? `${delivery.distanceFromPreviousKm} km da parada anterior`
                                : "Distância em revisão"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
