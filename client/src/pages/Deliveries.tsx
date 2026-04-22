import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { lookupCep } from "@/lib/cep";
import { Calendar, MapPin, Package2, Pencil, Plus, Search, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const DELIVERY_STATUSES = [
  { value: "pendente", label: "Pendente" },
  { value: "em_rota", label: "Em Rota" },
  { value: "entregue", label: "Entregue" },
  { value: "cancelado", label: "Cancelado" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  em_rota: "bg-blue-100 text-blue-800",
  entregue: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

type DeliveryForm = {
  clientName: string;
  originPostalCode: string;
  originAddress: string;
  destinationPostalCode: string;
  destinationAddress: string;
  driverId: string;
  notes: string;
  scheduledAt: string;
};

const emptyForm: DeliveryForm = {
  clientName: "",
  originPostalCode: "",
  originAddress: "",
  destinationPostalCode: "",
  destinationAddress: "",
  driverId: "",
  notes: "",
  scheduledAt: "",
};

export default function Deliveries() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingCep, setLoadingCep] = useState<"origin" | "destination" | null>(null);
  const [formData, setFormData] = useState<DeliveryForm>(emptyForm);

  const { data: deliveries = [], refetch } = trpc.deliveries.list.useQuery(
    statusFilter === "all" ? undefined : { status: statusFilter }
  );
  const { data: drivers = [] } = trpc.drivers.list.useQuery();
  const createMutation = trpc.deliveries.create.useMutation();
  const updateMutation = trpc.deliveries.update.useMutation();
  const deleteMutation = trpc.deliveries.delete.useMutation();

  const visibleDeliveries = useMemo(() => {
    const filtered = deliveries.filter((d: any) =>
      [d.clientName, d.originAddress, d.destinationAddress, d.originPostalCode, d.destinationPostalCode]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );

    return [...filtered].sort((a: any, b: any) => {
      const aKey = a.destinationPostalCode || a.scheduledAt || "";
      const bKey = b.destinationPostalCode || b.scheduledAt || "";
      return String(aKey).localeCompare(String(bKey));
    });
  }, [deliveries, searchTerm]);

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setOpen(true);
  };

  const openEdit = (delivery: any) => {
    setEditingId(delivery.id);
    setFormData({
      clientName: delivery.clientName ?? "",
      originPostalCode: delivery.originPostalCode ?? "",
      originAddress: delivery.originAddress ?? "",
      destinationPostalCode: delivery.destinationPostalCode ?? "",
      destinationAddress: delivery.destinationAddress ?? "",
      driverId: delivery.driverId ? String(delivery.driverId) : "",
      notes: delivery.notes ?? "",
      scheduledAt: delivery.scheduledAt ? new Date(delivery.scheduledAt).toISOString().slice(0, 16) : "",
    });
    setOpen(true);
  };

  const clearForm = () => {
    setEditingId(null);
    setFormData(emptyForm);
  };

  const fillCep = async (type: "origin" | "destination") => {
    const cep = type === "origin" ? formData.originPostalCode : formData.destinationPostalCode;
    if (!cep) {
      toast.error("Informe um CEP");
      return;
    }

    setLoadingCep(type);
    try {
      const result = await lookupCep(cep);
      if (type === "origin") {
        setFormData(prev => ({
          ...prev,
          originPostalCode: result.cep,
          originAddress: result.fullAddress,
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          destinationPostalCode: result.cep,
          destinationAddress: result.fullAddress,
        }));
      }
      toast.success("CEP localizado com sucesso");
    } catch (error: any) {
      toast.error(error?.message ?? "Erro ao consultar CEP");
    } finally {
      setLoadingCep(null);
    }
  };

  const submitDelivery = async () => {
    if (!formData.clientName || !formData.originAddress || !formData.destinationAddress) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    try {
      const payload = {
        clientName: formData.clientName,
        originPostalCode: formData.originPostalCode || undefined,
        originAddress: formData.originAddress,
        destinationPostalCode: formData.destinationPostalCode || undefined,
        destinationAddress: formData.destinationAddress,
        driverId: formData.driverId ? Number(formData.driverId) : undefined,
        scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt) : undefined,
        notes: formData.notes || undefined,
      };

      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          originPostalCode: payload.originPostalCode,
          originAddress: payload.originAddress,
          destinationPostalCode: payload.destinationPostalCode,
          destinationAddress: payload.destinationAddress,
          driverId: payload.driverId,
          notes: payload.notes,
          status: undefined,
        });
        toast.success("Entrega atualizada com sucesso");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Entrega criada com sucesso");
      }

      setOpen(false);
      clearForm();
      refetch();
    } catch {
      toast.error("Não foi possível salvar a entrega");
    }
  };

  const updateDeliveryStatus = async (deliveryId: number, newStatus: string) => {
    try {
      await updateMutation.mutateAsync({
        id: deliveryId,
        status: newStatus as any,
      });
      toast.success("Status atualizado");
      refetch();
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const deleteDelivery = async (deliveryId: number) => {
    if (!confirm("Deseja excluir esta entrega?")) return;

    try {
      await deleteMutation.mutateAsync(deliveryId);
      toast.success("Entrega excluída");
      refetch();
    } catch {
      toast.error("Não foi possível excluir a entrega");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Entregas</h1>
          <p className="text-muted-foreground mt-1">
            Cadastro, organização de rota e acompanhamento operacional
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Nova Entrega
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Entrega" : "Criar Nova Entrega"}</DialogTitle>
              <DialogDescription>
                Informe os dados da coleta e da entrega. O CEP pode preencher o endereço automaticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Cliente *</Label>
                <Input
                  placeholder="Ex: João Silva"
                  value={formData.clientName}
                  onChange={e => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>CEP de origem</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="00000-000"
                    value={formData.originPostalCode}
                    onChange={e => setFormData(prev => ({ ...prev, originPostalCode: e.target.value }))}
                  />
                  <Button type="button" variant="outline" onClick={() => fillCep("origin")} disabled={loadingCep === "origin"}>
                    Consultar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>CEP de destino</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="00000-000"
                    value={formData.destinationPostalCode}
                    onChange={e => setFormData(prev => ({ ...prev, destinationPostalCode: e.target.value }))}
                  />
                  <Button type="button" variant="outline" onClick={() => fillCep("destination")} disabled={loadingCep === "destination"}>
                    Consultar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Endereço de origem *</Label>
                <Input
                  placeholder="Rua, número, bairro"
                  value={formData.originAddress}
                  onChange={e => setFormData(prev => ({ ...prev, originAddress: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Endereço de destino *</Label>
                <Input
                  placeholder="Rua, número, bairro"
                  value={formData.destinationAddress}
                  onChange={e => setFormData(prev => ({ ...prev, destinationAddress: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Motorista</Label>
                <Select value={formData.driverId || "unassigned"} onValueChange={value => setFormData(prev => ({ ...prev, driverId: value === "unassigned" ? "" : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um motorista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sem motorista</SelectItem>
                    {drivers.map((driver: any) => (
                      <SelectItem key={driver.id} value={String(driver.id)}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data/Hora Agendada</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={e => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Observações adicionais..."
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <Button onClick={submitDelivery} className="md:col-span-2">
                {editingId ? "Salvar alterações" : "Criar Entrega"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total visível</p>
                <p className="text-2xl font-semibold">{visibleDeliveries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Em rota</p>
                <p className="text-2xl font-semibold">
                  {visibleDeliveries.filter((d: any) => d.status === "em_rota").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Entregues</p>
                <p className="text-2xl font-semibold">
                  {visibleDeliveries.filter((d: any) => d.status === "entregue").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-col lg:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, CEP ou endereço..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-56">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {DELIVERY_STATUSES.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Entregas</CardTitle>
          <CardDescription>
            {visibleDeliveries.length} entregas encontradas. A ordenação já prioriza o CEP/data para apoiar a rota.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Cliente</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Destino</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Motorista</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visibleDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-muted-foreground">
                      Nenhuma entrega encontrada
                    </td>
                  </tr>
                ) : (
                  visibleDeliveries.map((delivery: any) => (
                    <tr key={delivery.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{delivery.clientName}</div>
                        <div className="text-xs text-muted-foreground">
                          {delivery.originPostalCode || "-"} | {delivery.scheduledAt ? new Date(delivery.scheduledAt).toLocaleString("pt-BR") : "Sem agendamento"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                          <div>
                            <div className="font-medium text-foreground">{delivery.destinationAddress}</div>
                            <div className="text-xs">{delivery.destinationPostalCode || "-"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {delivery.driverId ? `Motorista ${delivery.driverId}` : "Sem motorista"}
                      </td>
                      <td className="py-3 px-4">
                        <Select value={delivery.status} onValueChange={value => updateDeliveryStatus(delivery.id, value)}>
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
                        <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[delivery.status] || "bg-gray-100 text-gray-800"}`}>
                          {DELIVERY_STATUSES.find(s => s.value === delivery.status)?.label ?? delivery.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(delivery)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteDelivery(delivery.id)}>
                            Excluir
                          </Button>
                        </div>
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
