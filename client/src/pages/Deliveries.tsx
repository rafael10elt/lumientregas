import { useMemo, useState } from "react";
import AddressFields, { defaultAddressValue } from "@/components/AddressFields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, MapPin, Plus, Search, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import OpenGpsButton from "@/components/OpenGpsButton";

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  em_rota: "Em Rota",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  em_rota: "bg-blue-100 text-blue-800",
  entregue: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

export default function Deliveries() {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    clientId: "",
    clientName: "",
    baseId: "",
    driverId: "none",
    scheduledAt: "",
    notes: "",
    origin: defaultAddressValue(),
    destination: defaultAddressValue(),
  });

  const { data: deliveries = [], refetch } = trpc.deliveries.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const { data: drivers = [] } = trpc.drivers.list.useQuery();
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: bases = [] } = trpc.clientBases.list.useQuery({
    clientId: form.clientId || undefined,
  });

  const createMutation = trpc.deliveries.create.useMutation();
  const updateMutation = trpc.deliveries.update.useMutation();
  const bulkDeleteMutation = trpc.deliveries.bulkDelete.useMutation();
  const bulkRescheduleMutation = trpc.deliveries.bulkReschedule.useMutation();
  const deleteMutation = trpc.deliveries.delete.useMutation();

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((delivery: any) => {
      const search = searchTerm.toLowerCase();
      return (
        delivery.clientName?.toLowerCase().includes(search) ||
        delivery.destinationAddress?.toLowerCase().includes(search) ||
        delivery.originAddress?.toLowerCase().includes(search) ||
        delivery.destinationPostalCode?.includes(searchTerm.replace(/\D/g, ""))
      );
    });
  }, [deliveries, searchTerm]);

  const selectedCount = selectedIds.length;

  const syncBaseAddress = (baseId: string) => {
    const base = bases.find((item: any) => item.id === baseId);
    if (!base) return;
    setForm(current => ({
      ...current,
      clientId: base.clientId || current.clientId,
      baseId,
      origin: {
        postalCode: base.postalCode || "",
        street: base.street || "",
        number: base.number || "",
        neighborhood: base.neighborhood || "",
        city: base.city || "",
        state: base.state || "",
        complement: base.complement || "",
        reference: base.reference || "",
        latitude: base.latitude ? String(base.latitude) : "",
        longitude: base.longitude ? String(base.longitude) : "",
      },
    }));
  };

  const handleCreateDelivery = async () => {
    if (!form.clientName.trim()) {
      toast.error("Preencha o nome do cliente");
      return;
    }
    if (!form.destination.street || !form.destination.number || !form.destination.city) {
      toast.error("Preencha o endereço de destino completo");
      return;
    }
    if (!form.baseId && (!form.origin.street || !form.origin.number || !form.origin.city)) {
      toast.error("Preencha a origem ou selecione uma base padrão");
      return;
    }

    try {
      await createMutation.mutateAsync({
        clientId: form.clientId || undefined,
        clientName: form.clientName,
        baseId: form.baseId || undefined,
        driverId: form.driverId === "none" ? undefined : form.driverId,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt) : undefined,
        notes: form.notes || undefined,
        originPostalCode: form.origin.postalCode || undefined,
        originStreet: form.origin.street || undefined,
        originNumber: form.origin.number || undefined,
        originNeighborhood: form.origin.neighborhood || undefined,
        originCity: form.origin.city || undefined,
        originState: form.origin.state || undefined,
        originComplement: form.origin.complement || undefined,
        originReference: form.origin.reference || undefined,
        originLatitude: form.origin.latitude ? Number(form.origin.latitude) : undefined,
        originLongitude: form.origin.longitude ? Number(form.origin.longitude) : undefined,
        originAddress: [
          form.origin.street,
          form.origin.number,
          form.origin.neighborhood,
          form.origin.city,
          form.origin.state,
        ].filter(Boolean).join(" - "),
        destinationPostalCode: form.destination.postalCode || undefined,
        destinationStreet: form.destination.street || undefined,
        destinationNumber: form.destination.number || undefined,
        destinationNeighborhood: form.destination.neighborhood || undefined,
        destinationCity: form.destination.city || undefined,
        destinationState: form.destination.state || undefined,
        destinationComplement: form.destination.complement || undefined,
        destinationReference: form.destination.reference || undefined,
        destinationLatitude: form.destination.latitude ? Number(form.destination.latitude) : undefined,
        destinationLongitude: form.destination.longitude ? Number(form.destination.longitude) : undefined,
        destinationAddress: [
          form.destination.street,
          form.destination.number,
          form.destination.neighborhood,
          form.destination.city,
          form.destination.state,
        ].filter(Boolean).join(" - "),
      });
      toast.success("Entrega criada com sucesso");
      setOpen(false);
      setForm({
        clientId: "",
        clientName: "",
        baseId: "",
        driverId: "none",
        scheduledAt: "",
        notes: "",
        origin: defaultAddressValue(),
        destination: defaultAddressValue(),
      });
      setSelectedIds([]);
      refetch();
    } catch {
      toast.error("Erro ao criar entrega");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    await bulkDeleteMutation.mutateAsync(selectedIds);
    toast.success("Entregas excluídas");
    setSelectedIds([]);
    refetch();
  };

  const handleRescheduleSelected = async () => {
    const nextDate = window.prompt("Nova data (AAAA-MM-DD) para as entregas selecionadas:");
    if (!nextDate) return;

    const driverId = window.prompt("Motorista (opcional, UUID) para remanejamento:");
    await bulkRescheduleMutation.mutateAsync({
      ids: selectedIds,
      scheduledAt: new Date(`${nextDate}T08:00:00`),
      driverId: driverId || undefined,
    });
    toast.success("Entregas remanejadas");
    setSelectedIds([]);
    refetch();
  };

  const handleStatusChange = async (deliveryId: string, newStatus: string) => {
    await updateMutation.mutateAsync({ id: deliveryId, status: newStatus as any });
    toast.success("Status atualizado");
    refetch();
  };

  const handleDelete = async (deliveryId: string) => {
    await deleteMutation.mutateAsync(deliveryId);
    toast.success("Entrega excluída");
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Entregas</h1>
          <p className="text-muted-foreground">Cadastro, revisão, remanejamento e acompanhamento operacional.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Entrega
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Criar nova entrega</DialogTitle>
              <DialogDescription>Selecione cliente, base e preencha os endereços de coleta/destino.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Cliente *</Label>
                <Select value={form.clientId} onValueChange={value => setForm({ ...form, clientId: value, baseId: "" })}>
                  <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nome do cliente</Label>
                <Input value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} placeholder="Nome usado na entrega" />
              </div>
              <div className="space-y-2">
                <Label>Base padrão</Label>
                <Select value={form.baseId} onValueChange={value => syncBaseAddress(value)}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma base" /></SelectTrigger>
                  <SelectContent>
                    {bases.map((base: any) => (
                      <SelectItem key={base.id} value={base.id}>{base.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Motorista</Label>
                  <Select value={form.driverId} onValueChange={value => setForm({ ...form, driverId: value })}>
                  <SelectTrigger><SelectValue placeholder="Sem motorista" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem motorista</SelectItem>
                    {drivers.map((driver: any) => (
                      <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data/Hora Agendada</Label>
                <Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />
              </div>
            </div>

            <AddressFields title="Endereço de origem" value={form.origin} onChange={origin => setForm({ ...form, origin })} />
            <AddressFields title="Endereço de destino" value={form.destination} onChange={destination => setForm({ ...form, destination })} />

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>

            <Button onClick={handleCreateDelivery}>Criar entrega</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Em andamento</p><p className="text-3xl font-bold">{deliveries.filter((d: any) => d.status === "em_rota").length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Selecionadas</p><p className="text-3xl font-bold">{selectedCount}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Rota em revisão</p><p className="text-3xl font-bold">{deliveries.filter((d: any) => d.routeOrder != null).length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Entregues</p><p className="text-3xl font-bold">{deliveries.filter((d: any) => d.status === "entregue").length}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-10" placeholder="Buscar por cliente, CEP ou endereço..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_rota">Em rota</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRescheduleSelected} disabled={selectedIds.length === 0} className="gap-2">
              <Calendar className="h-4 w-4" />
              Remanejar
            </Button>
            <Button variant="destructive" onClick={handleDeleteSelected} disabled={selectedIds.length === 0} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Excluir em lote
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de entregas</CardTitle>
          <CardDescription>{filteredDeliveries.length} entregas encontradas. A ordenação considera ordem manual e depois data.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-3 text-left"><Checkbox checked={selectedIds.length === filteredDeliveries.length && filteredDeliveries.length > 0} onCheckedChange={checked => setSelectedIds(checked ? filteredDeliveries.map((delivery: any) => delivery.id) : [])} /></th>
                <th className="py-3 text-left">Cliente</th>
                <th className="py-3 text-left">Destino</th>
                <th className="py-3 text-left">Status</th>
                <th className="py-3 text-left">Agenda</th>
                <th className="py-3 text-left">Motorista</th>
                <th className="py-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeliveries.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">Nenhuma entrega encontrada</td></tr>
              ) : filteredDeliveries.map((delivery: any) => (
                <tr key={delivery.id} className="border-b">
                  <td className="py-3">
                    <Checkbox
                      checked={selectedIds.includes(delivery.id)}
                      onCheckedChange={checked => {
                        setSelectedIds(current => checked ? [...current, delivery.id] : current.filter(id => id !== delivery.id));
                      }}
                    />
                  </td>
                  <td className="py-3 font-medium">{delivery.clientName}</td>
                  <td className="py-3 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {delivery.destinationAddress}
                    </div>
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[delivery.status] || "bg-gray-100 text-gray-800"}`}>
                      {STATUS_LABELS[delivery.status] || delivery.status}
                    </span>
                  </td>
                  <td className="py-3">{delivery.scheduledAt ? new Date(delivery.scheduledAt).toLocaleString("pt-BR") : "-"}</td>
                  <td className="py-3">{drivers.find((driver: any) => driver.id === delivery.driverId)?.name || "Sem motorista"}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <Select value={delivery.status} onValueChange={value => handleStatusChange(delivery.id, value)}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="em_rota">Em rota</SelectItem>
                          <SelectItem value="entregue">Entregue</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                      <OpenGpsButton
                        address={delivery.destinationAddress}
                        latitude={delivery.destinationLatitude}
                        longitude={delivery.destinationLongitude}
                        label="GPS"
                      />
                      <Button variant="outline" size="sm" onClick={() => handleDelete(delivery.id)}>
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
