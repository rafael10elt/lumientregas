import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, MapPin, Truck, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  em_rota: "bg-blue-100 text-blue-800",
  entregue: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  em_rota: "Em Rota",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export default function Deliveries() {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [formData, setFormData] = useState({
    clientName: "",
    originAddress: "",
    destinationAddress: "",
    driverId: "",
    notes: "",
    scheduledAt: "",
  });

  const { data: deliveries = [], refetch } = trpc.deliveries.list.useQuery({
    status: statusFilter,
  });
  const { data: drivers = [] } = trpc.drivers.list.useQuery();
  const createMutation = trpc.deliveries.create.useMutation();
  const updateMutation = trpc.deliveries.update.useMutation();

  const filteredDeliveries = deliveries.filter((d: any) =>
    d.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.destinationAddress.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateDelivery = async () => {
    if (!formData.clientName || !formData.originAddress || !formData.destinationAddress) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    try {
      await createMutation.mutateAsync({
        ...formData,
        driverId: formData.driverId ? parseInt(formData.driverId) : undefined,
        scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt) : undefined,
      });
      toast.success("Entrega criada com sucesso");
      setOpen(false);
      setFormData({
        clientName: "",
        originAddress: "",
        destinationAddress: "",
        driverId: "",
        notes: "",
        scheduledAt: "",
      });
      refetch();
    } catch (error) {
      toast.error("Erro ao criar entrega");
    }
  };

  const handleStatusChange = async (deliveryId: number, newStatus: string) => {
    try {
      await updateMutation.mutateAsync({
        id: deliveryId,
        status: newStatus as any,
      });
      toast.success("Status atualizado com sucesso");
      refetch();
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Entregas</h1>
          <p className="text-muted-foreground mt-1">Gerenciar e acompanhar entregas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4" />
              Nova Entrega
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Nova Entrega</DialogTitle>
              <DialogDescription>Preencha os dados da entrega</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="clientName">Nome do Cliente *</Label>
                <Input
                  id="clientName"
                  placeholder="Ex: João Silva"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="originAddress">Endereço de Origem *</Label>
                <Input
                  id="originAddress"
                  placeholder="Ex: Rua A, 123"
                  value={formData.originAddress}
                  onChange={(e) => setFormData({ ...formData, originAddress: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="destinationAddress">Endereço de Destino *</Label>
                <Input
                  id="destinationAddress"
                  placeholder="Ex: Rua B, 456"
                  value={formData.destinationAddress}
                  onChange={(e) => setFormData({ ...formData, destinationAddress: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="driverId">Motorista</Label>
                <Select value={formData.driverId} onValueChange={(value) => setFormData({ ...formData, driverId: value })}>
                  <SelectTrigger>
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
              <div>
                <Label htmlFor="scheduledAt">Data/Hora Agendada</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Observações adicionais..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <Button onClick={handleCreateDelivery} className="w-full bg-primary hover:bg-primary/90">
                Criar Entrega
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente ou endereço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter || ""} onValueChange={(value) => setStatusFilter(value || undefined)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_rota">Em Rota</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Deliveries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Entregas</CardTitle>
          <CardDescription>{filteredDeliveries.length} entregas encontradas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Cliente</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Origem</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Destino</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Motorista</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma entrega encontrada
                    </td>
                  </tr>
                ) : (
                  filteredDeliveries.map((delivery: any) => (
                    <tr key={delivery.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">{delivery.clientName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          {delivery.originAddress.substring(0, 25)}...
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          {delivery.destinationAddress.substring(0, 25)}...
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[delivery.status] || "bg-gray-100 text-gray-800"}`}>
                          {STATUS_LABELS[delivery.status]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {delivery.driverId ? `Motorista ${delivery.driverId}` : "-"}
                      </td>
                      <td className="py-3 px-4">
                        <Button variant="ghost" size="sm">
                          Detalhes
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
