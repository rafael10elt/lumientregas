import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCep } from "@/lib/format";
import { openGpsRoute } from "@/lib/navigation";
import { trpc } from "@/lib/trpc";
import { lookupCep } from "@/lib/cep";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock3,
  MapPin,
  Navigation,
  Package2,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const DELIVERY_STATUSES = [
  { value: "all", label: "Todos" },
  { value: "pendente", label: "Pendente" },
  { value: "em_rota", label: "Em rota" },
  { value: "entregue", label: "Entregue" },
  { value: "cancelado", label: "Cancelado" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  em_rota: "bg-blue-100 text-blue-800",
  entregue: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("pt-BR");
}

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

type RescheduleForm = {
  driverId: string;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<string[] | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState<RescheduleForm>({
    driverId: "",
    scheduledAt: "",
  });
  const [loadingCep, setLoadingCep] = useState<"origin" | "destination" | null>(null);
  const [formData, setFormData] = useState<DeliveryForm>(emptyForm);

  const queryInput = useMemo(() => {
    const input: {
      status?: string;
      driverId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {};

    if (statusFilter !== "all") input.status = statusFilter;
    if (driverFilter !== "all") input.driverId = driverFilter;
    if (startDate) input.startDate = new Date(`${startDate}T00:00:00`);
    if (endDate) input.endDate = new Date(`${endDate}T23:59:59`);
    return input;
  }, [driverFilter, endDate, startDate, statusFilter]);

  const { data: deliveries = [], refetch } = trpc.deliveries.list.useQuery(queryInput);
  const { data: drivers = [] } = trpc.drivers.list.useQuery();
  const createMutation = trpc.deliveries.create.useMutation();
  const updateMutation = trpc.deliveries.update.useMutation();
  const updateStatusMutation = trpc.deliveries.updateStatus.useMutation();
  const deleteMutation = trpc.deliveries.delete.useMutation();
  const bulkDeleteMutation = trpc.deliveries.bulkDelete.useMutation();
  const bulkRescheduleMutation = trpc.deliveries.bulkReschedule.useMutation();

  const visibleDeliveries = useMemo(() => {
    const filtered = deliveries.filter((d: any) =>
      [d.clientName, d.originAddress, d.destinationAddress, d.originPostalCode, d.destinationPostalCode]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );

    return [...filtered].sort((a: any, b: any) => {
      const aKey = Number.isFinite(a.routeOrder) ? a.routeOrder : a.scheduledAt || "";
      const bKey = Number.isFinite(b.routeOrder) ? b.routeOrder : b.scheduledAt || "";
      return String(aKey).localeCompare(String(bKey));
    });
  }, [deliveries, searchTerm]);

  const selectedDeliveries = visibleDeliveries.filter((delivery: any) => selectedIds.includes(delivery.id));
  const openDeliveries = visibleDeliveries.filter((delivery: any) => delivery.status !== "entregue" && delivery.status !== "cancelado");
  const deliveriesInProgress = visibleDeliveries.filter((delivery: any) => delivery.status === "em_rota");

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
        driverId: formData.driverId || undefined,
        scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt) : undefined,
        notes: formData.notes || undefined,
      };

      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          ...payload,
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

  const updateDeliveryStatus = async (deliveryId: string, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: deliveryId,
        status: newStatus as any,
      });
      toast.success("Status atualizado");
      refetch();
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const deleteDelivery = async (deliveryId: string) => {
    if (!confirm("Deseja excluir esta entrega?")) return;

    try {
      await deleteMutation.mutateAsync(deliveryId);
      toast.success("Entrega excluída");
      refetch();
    } catch {
      toast.error("Não foi possível excluir a entrega");
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Excluir ${selectedIds.length} entregas selecionadas?`)) return;

    try {
      await bulkDeleteMutation.mutateAsync(selectedIds);
      setSelectedIds([]);
      toast.success("Entregas excluídas");
      refetch();
    } catch {
      toast.error("Não foi possível excluir as entregas selecionadas");
    }
  };

  const openReschedule = (ids: string[]) => {
    setRescheduleTarget(ids);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setRescheduleForm({
      driverId: "",
      scheduledAt: tomorrow.toISOString().slice(0, 16),
    });
    setRescheduleOpen(true);
  };

  const submitReschedule = async () => {
    if (!rescheduleTarget || !rescheduleForm.scheduledAt) {
      toast.error("Informe o novo dia");
      return;
    }

    try {
      await bulkRescheduleMutation.mutateAsync({
        ids: rescheduleTarget,
        driverId: rescheduleForm.driverId || undefined,
        scheduledAt: new Date(rescheduleForm.scheduledAt),
        status: "pendente",
      });
      setRescheduleOpen(false);
      setRescheduleTarget(null);
      setSelectedIds([]);
      toast.success("Entregas remanejadas");
      refetch();
    } catch {
      toast.error("Não foi possível remanejar as entregas");
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? visibleDeliveries.map((delivery: any) => delivery.id) : []);
  };

  const toggleSelected = (deliveryId: string, checked: boolean) => {
    setSelectedIds(prev =>
      checked ? [...prev, deliveryId] : prev.filter(id => id !== deliveryId)
    );
  };

  const toggleExpanded = (deliveryId: string) => {
    setExpandedIds(prev =>
      prev.includes(deliveryId) ? prev.filter(id => id !== deliveryId) : [...prev, deliveryId]
    );
  };

  function DeliveryRow({ delivery }: { delivery: any }) {
    const expanded = expandedIds.includes(delivery.id);
    const { data: events = [] } = trpc.deliveryEvents.list.useQuery(
      { deliveryId: delivery.id },
      { enabled: expanded }
    );

    const latestEvent = events[0];
    const canReschedule = delivery.status !== "entregue" && delivery.status !== "cancelado";

    return (
      <>
        <tr className="border-b border-border hover:bg-muted/50">
          <td className="py-3 px-4">
            <Checkbox
              checked={selectedIds.includes(delivery.id)}
              onCheckedChange={value => toggleSelected(delivery.id, Boolean(value))}
            />
          </td>
          <td className="py-3 px-4">
            <div className="font-medium">{delivery.clientName}</div>
            <div className="text-xs text-muted-foreground">{delivery.originPostalCode || "-"}</div>
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
          <td className="py-3 px-4">
            <Select value={delivery.status} onValueChange={value => updateDeliveryStatus(delivery.id, value)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_STATUSES.filter(status => status.value !== "all").map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span
              className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[delivery.status] || "bg-gray-100 text-gray-800"}`}
            >
              {DELIVERY_STATUSES.find(s => s.value === delivery.status)?.label ?? delivery.status}
            </span>
          </td>
          <td className="py-3 px-4 text-muted-foreground">
            <div>{formatDateTime(delivery.scheduledAt)}</div>
            <div className="text-xs">Ordem: {delivery.routeOrder ?? "automatica"}</div>
            <div className="text-xs">
              {latestEvent ? `Ultima acao: ${formatDateTime(latestEvent.recordedAt)}` : "Sem log ainda"}
            </div>
          </td>
          <td className="py-3 px-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => openEdit(delivery)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
              {canReschedule ? (
                <Button variant="ghost" size="sm" onClick={() => openReschedule([delivery.id])}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Remanejar
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={() => openGpsRoute(delivery.destinationAddress)}>
                <Navigation className="mr-2 h-4 w-4" />
                GPS
              </Button>
              <Button variant="ghost" size="sm" onClick={() => toggleExpanded(delivery.id)}>
                {expanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                {expanded ? "Recolher" : "Detalhes"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => deleteDelivery(delivery.id)}
              >
                Excluir
              </Button>
            </div>
          </td>
        </tr>
        {expanded ? (
          <tr className="border-b border-border bg-muted/20">
            <td colSpan={6} className="px-4 py-4">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-background p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Trajeto
                  </div>
                  <div className="mt-2 text-sm text-foreground">
                    Origem: {delivery.originAddress}
                  </div>
                  <div className="mt-1 text-sm text-foreground">
                    Destino: {delivery.destinationAddress}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Motorista: {drivers.find((driver: any) => String(driver.id) === String(delivery.driverId))?.name || "Sem motorista"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {delivery.notes || "Sem observacoes"}
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-background p-4 lg:col-span-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock3 className="h-4 w-4 text-primary" />
                    Historico de status
                  </div>
                  <div className="mt-3 space-y-2">
                    {events.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        Nenhum evento registrado ainda.
                      </div>
                    ) : (
                      events.map((event: any) => (
                        <div key={event.id} className="rounded-lg border border-border/60 p-3 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-medium text-foreground">
                              {event.fromStatus || "inicio"} -> {event.toStatus}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(event.recordedAt)}
                            </div>
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
            </td>
          </tr>
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Entregas</h1>
          <p className="text-muted-foreground mt-1">
            Cadastro, revisão, remanejamento e acompanhamento operacional
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
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      originPostalCode: formatCep(e.target.value),
                    }))
                  }
                  inputMode="numeric"
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
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      destinationPostalCode: formatCep(e.target.value),
                    }))
                  }
                  inputMode="numeric"
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

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Em andamento</p>
            <p className="text-2xl font-semibold">{openDeliveries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Selecionadas</p>
            <p className="text-2xl font-semibold">{selectedIds.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Em rota</p>
            <p className="text-2xl font-semibold">{deliveriesInProgress.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Entregues</p>
            <p className="text-2xl font-semibold">
              {visibleDeliveries.filter((d: any) => d.status === "entregue").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="flex-1 relative lg:col-span-2">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, CEP ou endereço..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por motorista" />
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
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
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
        </CardContent>
      </Card>

      {selectedIds.length > 0 ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldAlert className="h-4 w-4 text-primary" />
                {selectedIds.length} entregas selecionadas
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => openReschedule(selectedIds)}>
                  Remanejar selecionadas
                </Button>
                <Button variant="destructive" onClick={bulkDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir em lote
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Entregas</CardTitle>
          <CardDescription>
            {visibleDeliveries.length} entregas encontradas. A ordenação considera a ordem manual e, depois, a data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-10 py-3 px-4">
                    <Checkbox
                      checked={visibleDeliveries.length > 0 && selectedIds.length === visibleDeliveries.length}
                      onCheckedChange={value => toggleSelectAll(Boolean(value))}
                    />
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Cliente</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Destino</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Agenda</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visibleDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground">
                      Nenhuma entrega encontrada
                    </td>
                  </tr>
                ) : (
                  visibleDeliveries.map((delivery: any) => <DeliveryRow key={delivery.id} delivery={delivery} />)
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remanejar entregas</DialogTitle>
            <DialogDescription>
              Reagende para o dia seguinte ou para a data desejada e escolha o motorista.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motorista</Label>
              <Select value={rescheduleForm.driverId || "unassigned"} onValueChange={value => setRescheduleForm(prev => ({ ...prev, driverId: value === "unassigned" ? "" : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um motorista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Manter motorista atual</SelectItem>
                  {drivers.map((driver: any) => (
                    <SelectItem key={driver.id} value={String(driver.id)}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nova data</Label>
              <Input
                type="datetime-local"
                value={rescheduleForm.scheduledAt}
                onChange={e => setRescheduleForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
              />
            </div>
            <Button onClick={submitReschedule} className="w-full">
              Confirmar remanejamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
