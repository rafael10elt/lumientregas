import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPhone, formatPlate } from "@/lib/format";
import { openWhatsApp } from "@/lib/navigation";
import { trpc } from "@/lib/trpc";
import { MessageCircleMore, Pencil, Plus, Trash2, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type DriverForm = {
  name: string;
  email: string;
  phone: string;
  vehicle: string;
  status: "available" | "busy" | "offline";
};

const emptyForm: DriverForm = {
  name: "",
  email: "",
  phone: "",
  vehicle: "",
  status: "offline",
};

const STATUS_LABELS: Record<DriverForm["status"], string> = {
  available: "Disponível",
  busy: "Ocupado",
  offline: "Offline",
};

export default function Drivers() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DriverForm>(emptyForm);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [vehicleForm, setVehicleForm] = useState({
    model: "",
    plate: "",
    nickname: "",
    isPrimary: false,
  });

  const { data: drivers = [], refetch } = trpc.drivers.list.useQuery();
  const createMutation = trpc.drivers.create.useMutation();
  const updateMutation = trpc.drivers.update.useMutation();
  const deleteMutation = trpc.drivers.delete.useMutation();
  const { data: vehicles = [], refetch: refetchVehicles } = trpc.driverVehicles.list.useQuery(
    selectedDriverId ? { driverId: selectedDriverId } : undefined,
    {
      enabled: Boolean(selectedDriverId),
    }
  );
  const createVehicleMutation = trpc.driverVehicles.create.useMutation();
  const deleteVehicleMutation = trpc.driverVehicles.delete.useMutation();

  const sortedDrivers = useMemo(
    () => [...drivers].sort((a: any, b: any) => a.name.localeCompare(b.name)),
    [drivers]
  );

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setOpen(true);
  };

  const openEdit = (driver: any) => {
    setEditingId(driver.id);
    setFormData({
      name: driver.name ?? "",
      email: driver.email ?? "",
      phone: driver.phone ?? "",
      vehicle: driver.vehicle ?? "",
      status: driver.status ?? "offline",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!formData.name) {
      toast.error("Informe o nome do motorista");
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          ...formData,
        });
        toast.success("Motorista atualizado");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Motorista criado");
      }

      setOpen(false);
      refetch();
    } catch {
      toast.error("Não foi possível salvar o motorista");
    }
  };

  const submitVehicle = async () => {
    if (!selectedDriverId) {
      toast.error("Selecione um motorista");
      return;
    }
    if (!vehicleForm.model || !vehicleForm.plate) {
      toast.error("Informe modelo e placa");
      return;
    }

    try {
      await createVehicleMutation.mutateAsync({
        driverId: selectedDriverId,
        model: vehicleForm.model,
        plate: vehicleForm.plate.toUpperCase(),
        nickname: vehicleForm.nickname || undefined,
        isPrimary: vehicleForm.isPrimary,
      });
      setVehicleForm({ model: "", plate: "", nickname: "", isPrimary: false });
      toast.success("Veículo adicionado");
      refetchVehicles();
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível salvar o veículo");
    }
  };

  const removeVehicle = async (vehicleId: string) => {
    if (!confirm("Deseja excluir este veículo?")) return;

    try {
      await deleteVehicleMutation.mutateAsync(vehicleId);
      toast.success("Veículo excluído");
      refetchVehicles();
    } catch {
      toast.error("Não foi possível excluir o veículo");
    }
  };

  const removeDriver = async (id: string) => {
    if (!confirm("Deseja excluir este motorista?")) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Motorista excluído");
      refetch();
    } catch {
      toast.error("Não foi possível excluir o motorista");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Motoristas</h1>
          <p className="text-muted-foreground mt-1">
            Cadastro, edição e disponibilidade da equipe
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Novo Motorista
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Motorista" : "Novo Motorista"}</DialogTitle>
              <DialogDescription>
                Preencha os dados do motorista para usá-lo na roteirização.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      phone: formatPhone(e.target.value),
                    }))
                  }
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
              <div className="space-y-2">
                <Label>Veículo</Label>
                <Input value={formData.vehicle} onChange={e => setFormData(prev => ({ ...prev, vehicle: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={value => setFormData(prev => ({ ...prev, status: value as DriverForm["status"] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="busy">Ocupado</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={submit} className="w-full">
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-semibold">{sortedDrivers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Disponíveis</p>
            <p className="text-2xl font-semibold">
              {sortedDrivers.filter((d: any) => d.status === "available").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Ocupados</p>
            <p className="text-2xl font-semibold">
              {sortedDrivers.filter((d: any) => d.status === "busy").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Motoristas</CardTitle>
          <CardDescription>Use esta tela para gerir cadastro e disponibilidade</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-muted-foreground">Nome</th>
                  <th className="text-left py-3 px-4 text-muted-foreground">Contato</th>
                  <th className="text-left py-3 px-4 text-muted-foreground">Veículo</th>
                  <th className="text-left py-3 px-4 text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedDrivers.map((driver: any) => (
                  <tr key={driver.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{driver.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>{driver.email || driver.phone || "-"}</span>
                        {driver.phone ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              openWhatsApp(
                                driver.phone,
                                `Olá ${driver.name}, tudo bem?`
                              )
                            }
                            aria-label="Abrir WhatsApp"
                          >
                            <MessageCircleMore className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{driver.vehicle || "-"}</td>
                    <td className="py-3 px-4">
                      <Select
                        value={driver.status}
                        onValueChange={value =>
                          updateMutation.mutateAsync({ id: driver.id, status: value as any })
                            .then(() => refetch())
                            .catch(() => toast.error("Erro ao atualizar status"))
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Disponível</SelectItem>
                          <SelectItem value="busy">Ocupado</SelectItem>
                          <SelectItem value="offline">Offline</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="sr-only">{STATUS_LABELS[driver.status as DriverForm["status"]]}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(driver)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeDriver(driver.id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Veículos do Motorista</CardTitle>
          <CardDescription>
            Cada motorista pode ter vários veículos cadastrados com modelo e placa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Motorista</Label>
              <Select
                value={selectedDriverId ? String(selectedDriverId) : ""}
                onValueChange={value => setSelectedDriverId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um motorista" />
                </SelectTrigger>
                <SelectContent>
                  {sortedDrivers.map((driver: any) => (
                    <SelectItem key={driver.id} value={String(driver.id)}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input
                value={vehicleForm.model}
                onChange={e => setVehicleForm(prev => ({ ...prev, model: e.target.value }))}
                placeholder="Ex: Fiorino"
              />
            </div>
            <div className="space-y-2">
              <Label>Placa</Label>
              <Input
                value={vehicleForm.plate}
                onChange={e =>
                  setVehicleForm(prev => ({ ...prev, plate: formatPlate(e.target.value) }))
                }
                placeholder="ABC1D23"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Apelido</Label>
              <Input
                value={vehicleForm.nickname}
                onChange={e => setVehicleForm(prev => ({ ...prev, nickname: e.target.value }))}
                placeholder="Carro principal, reserva..."
              />
            </div>
            <div className="space-y-2 flex items-end">
              <Button
                variant={vehicleForm.isPrimary ? "default" : "outline"}
                className="w-full"
                onClick={() => setVehicleForm(prev => ({ ...prev, isPrimary: !prev.isPrimary }))}
              >
                {vehicleForm.isPrimary ? "Principal" : "Marcar como principal"}
              </Button>
            </div>
          </div>
          <Button onClick={submitVehicle} disabled={!selectedDriverId}>
            Adicionar veículo
          </Button>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-muted-foreground">Modelo</th>
                  <th className="text-left py-3 px-4 text-muted-foreground">Placa</th>
                  <th className="text-left py-3 px-4 text-muted-foreground">Apelido</th>
                  <th className="text-left py-3 px-4 text-muted-foreground">Principal</th>
                  <th className="text-left py-3 px-4 text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {!selectedDriverId ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Selecione um motorista para ver os veículos
                    </td>
                  </tr>
                ) : vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Nenhum veículo cadastrado para este motorista
                    </td>
                  </tr>
                ) : (
                  vehicles.map((vehicle: any) => (
                    <tr key={vehicle.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{vehicle.model}</td>
                      <td className="py-3 px-4 text-muted-foreground">{vehicle.plate}</td>
                      <td className="py-3 px-4 text-muted-foreground">{vehicle.nickname || "-"}</td>
                      <td className="py-3 px-4">{vehicle.isPrimary ? "Sim" : "Não"}</td>
                      <td className="py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeVehicle(vehicle.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
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
