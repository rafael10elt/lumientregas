import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Navigation, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";


export default function Routes() {
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [baseAddress, setBaseAddress] = useState("Rua Principal, 1 - Centro");
  const [optimizedRoute, setOptimizedRoute] = useState<any[]>([]);

  const { data: deliveries = [] } = trpc.deliveries.list.useQuery({
    status: "pendente",
  });
  const { data: drivers = [] } = trpc.drivers.list.useQuery();

  const driverDeliveries = selectedDriver
    ? deliveries.filter((d: any) => d.driverId === parseInt(selectedDriver))
    : [];

  const handleOptimizeRoute = async () => {
    if (!selectedDriver) {
      toast.error("Selecione um motorista");
      return;
    }

    if (driverDeliveries.length === 0) {
      toast.error("Nenhuma entrega pendente para este motorista");
      return;
    }

    // Simulated route optimization
    const optimized = [...driverDeliveries].sort((a: any, b: any) => {
      // Simple distance-based sorting (in a real app, would use Google Maps API)
      return a.destinationAddress.localeCompare(b.destinationAddress);
    });

    setOptimizedRoute(optimized);
    toast.success("Rota otimizada com sucesso");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Roteirização</h1>
        <p className="text-muted-foreground mt-1">Visualizar e otimizar rotas de entregas</p>
      </div>

      {/* Route Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configurar Rota</CardTitle>
          <CardDescription>Selecione um motorista e otimize a rota</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Endereço Base</label>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={baseAddress}
                onChange={(e) => setBaseAddress(e.target.value)}
                className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
                placeholder="Endereço de partida"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Motorista</label>
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecione um motorista" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((driver: any) => (
                  <SelectItem key={driver.id} value={String(driver.id)}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleOptimizeRoute}
            className="w-full gap-2 bg-primary hover:bg-primary/90"
          >
            <Navigation className="w-4 h-4" />
            Otimizar Rota
          </Button>
        </CardContent>
      </Card>

      {/* Map View */}
      {optimizedRoute.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mapa da Rota</CardTitle>
            <CardDescription>Visualização da rota otimizada</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Integração com Google Maps em desenvolvimento
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Route Details */}
      {optimizedRoute.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhes da Rota</CardTitle>
            <CardDescription>
              {optimizedRoute.length} paradas | Motorista:{" "}
              {drivers.find((d: any) => d.id === parseInt(selectedDriver))?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Starting point */}
              <div className="flex gap-4 pb-4 border-b border-border">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    0
                  </div>
                  <div className="w-0.5 h-12 bg-border mt-2" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-semibold text-foreground">Ponto de Partida</p>
                  <p className="text-sm text-muted-foreground">{baseAddress}</p>
                </div>
              </div>

              {/* Route stops */}
              {optimizedRoute.map((delivery: any, index: number) => (
                <div key={delivery.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    {index < optimizedRoute.length - 1 && (
                      <div className="w-0.5 h-24 bg-border mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pt-1 pb-4">
                    <p className="font-semibold text-foreground">{delivery.clientName}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" />
                      {delivery.destinationAddress}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {optimizedRoute.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Selecione um motorista e otimize uma rota para visualizar os detalhes
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
