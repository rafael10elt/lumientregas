import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, MapPin, Navigation, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import OpenGpsButton from "@/components/OpenGpsButton";

export default function Routes() {
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedBaseId, setSelectedBaseId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [manualRoute, setManualRoute] = useState<any[]>([]);

  const { data: drivers = [] } = trpc.drivers.list.useQuery();
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: bases = [] } = trpc.clientBases.list.useQuery({
    clientId: selectedClientId || undefined,
  });
  const { data: deliveries = [] } = trpc.deliveries.list.useQuery({
    driverId: selectedDriverId || undefined,
    onlyUncompleted: true,
  });

  const optimizeMutation = trpc.routes.optimize.useMutation({
    onSuccess: (result) => {
      setManualRoute(result.stops);
      toast.success("Rota otimizada com sucesso");
    },
  });
  const reorderMutation = trpc.deliveries.reorder.useMutation();

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((delivery: any) => {
      const term = searchTerm.toLowerCase();
      return (
        delivery.clientName?.toLowerCase().includes(term) ||
        delivery.destinationAddress?.toLowerCase().includes(term)
      );
    });
  }, [deliveries, searchTerm]);

  const handleOptimizeRoute = async () => {
    if (!selectedDriverId) {
      toast.error("Selecione um motorista");
      return;
    }

    const base = bases.find((item: any) => item.id === selectedBaseId);
    await optimizeMutation.mutateAsync({
      driverId: selectedDriverId,
      baseAddress: base
        ? [base.street, base.number, base.neighborhood, base.city, base.state].filter(Boolean).join(" - ")
        : undefined,
      baseLatitude: base?.latitude ?? undefined,
      baseLongitude: base?.longitude ?? undefined,
      scheduledAt: scheduledDate ? new Date(scheduledDate) : undefined,
    });
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    setManualRoute(current => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const saveOrder = async () => {
    if (!selectedDriverId) return;
    await reorderMutation.mutateAsync({
      updates: manualRoute.map((item, index) => ({
        id: item.id,
        routeOrder: index + 1,
        driverId: selectedDriverId,
        scheduledAt: scheduledDate ? new Date(scheduledDate) : undefined,
      })),
    });
    toast.success("Ordem salva");
  };

  const base = bases.find((item: any) => item.id === selectedBaseId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Roteirização</h1>
        <p className="text-muted-foreground mt-1">O gestor cria, revisa e ajusta rotas de forma manual ou automática.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurar rota</CardTitle>
          <CardDescription>Escolha motorista, base e data para calcular a melhor sequência.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Motorista</label>
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger><SelectValue placeholder="Selecione um motorista" /></SelectTrigger>
              <SelectContent>
                {drivers.map((driver: any) => (
                  <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Cliente</label>
            <Select value={selectedClientId} onValueChange={value => { setSelectedClientId(value); setSelectedBaseId(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
              <SelectContent>
                {clients.map((client: any) => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Base</label>
            <Select value={selectedBaseId} onValueChange={setSelectedBaseId}>
              <SelectTrigger><SelectValue placeholder="Selecione a base" /></SelectTrigger>
              <SelectContent>
                {bases.map((item: any) => (
                  <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Data da rota</label>
            <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
          </div>
          <div className="md:col-span-2 rounded-lg border p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Base selecionada</p>
            <p>{base ? [base.street, base.number, base.neighborhood, base.city, base.state].filter(Boolean).join(" - ") : "Nenhuma base selecionada"}</p>
            {base ? (
              <div className="mt-3">
                <OpenGpsButton
                  address={[base.street, base.number, base.neighborhood, base.city, base.state].filter(Boolean).join(" - ")}
                  latitude={base.latitude}
                  longitude={base.longitude}
                />
              </div>
            ) : null}
          </div>
          <Button onClick={handleOptimizeRoute} className="md:col-span-2 gap-2">
            <Navigation className="h-4 w-4" />
            Otimizar rota
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entregas do motorista</CardTitle>
          <CardDescription>Resultados disponíveis para revisão e ajuste manual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar entrega..." />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="py-3 px-4 text-left">Cliente</th>
                  <th className="py-3 px-4 text-left">Destino</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Agenda</th>
                  <th className="py-3 px-4 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">Nenhuma entrega encontrada</td></tr>
                ) : filteredDeliveries.map((delivery: any, index: number) => (
                  <tr key={delivery.id} className="border-b">
                    <td className="py-3 px-4 font-medium">{delivery.clientName}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {delivery.destinationAddress}
                      </div>
                    </td>
                    <td className="py-3 px-4">{delivery.status}</td>
                    <td className="py-3 px-4">{delivery.scheduledAt ? new Date(delivery.scheduledAt).toLocaleString("pt-BR") : "-"}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => moveItem(index, -1)}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => moveItem(index, 1)}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveOrder} disabled={manualRoute.length === 0} className="gap-2">
              Salvar revisão da rota
            </Button>
          </div>
        </CardContent>
      </Card>

      {manualRoute.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rota otimizada</CardTitle>
            <CardDescription>Sequência sugerida com base na geocodificação e proximidade.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {manualRoute.map((stop, index) => (
              <div key={stop.id} className="flex items-start gap-4 rounded-lg border p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{stop.label}</p>
                  <p className="text-sm text-muted-foreground">{stop.address}</p>
                  <div className="mt-2">
                    <OpenGpsButton address={stop.address} latitude={stop.latitude} longitude={stop.longitude} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {stop.distanceFromPreviousMeters ? `${Math.round(stop.distanceFromPreviousMeters)} m` : "N/D"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
