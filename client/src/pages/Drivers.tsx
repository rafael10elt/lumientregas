import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatPhone, formatPlate } from "@/lib/format";
import { openWhatsApp } from "@/lib/navigation";
import { trpc } from "@/lib/trpc";
import { MessageCircleMore, Pencil, Plus, Trash2, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type DriverForm = {
  name: string;
  email: string;
  phone: string;
  userId: string;
  notes: string;
  status: "available" | "busy" | "offline";
};

const emptyForm: DriverForm = {
  name: "",
  email: "",
  phone: "",
  userId: "",
  notes: "",
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

  const { data: drivers = [], refetch: refetchDrivers } = trpc.drivers.list.useQuery();
  const { data: users = [] } = trpc.users.list.useQuery();
  const { data: allVehicles = [], refetch: refetchVehicles } = trpc.driverVehicles.list.useQuery();
  const createMutation = trpc.drivers.create.useMutation();
  const updateMutation = trpc.drivers.update.useMutation();
  const deleteMutation = trpc.drivers.delete.useMutation();
  const createVehicleMutation = trpc.driverVehicles.create.useMutation();
  const deleteVehicleMutation = trpc.driverVehicles.delete.useMutation();

  const sortedDrivers = useMemo(
    () => [...drivers].sort((a: any, b: any) => a.name.localeCompare(b.name)),
    [drivers]
  );

  const tenantMotorists = useMemo(
    () =>
      [...users]
        .filter((entry: any) => entry.role === "motorista")
        .sort((a: any, b: any) => String(a.name ?? a.email ?? "").localeCompare(String(b.name ?? b.email ?? ""))),
    [users]
  );

  const driverByUserId = useMemo(() => {
    return new Map(tenantMotorists.map((entry: any) => [entry.id, entry]));
  }, [tenantMotorists]);

  const vehiclesByDriverId = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const vehicle of allVehicles as any[]) {
      const current = map.get(vehicle.driverId) ?? [];
      current.push(vehicle);
      map.set(vehicle.driverId, current);
    }
    return map;
  }, [allVehicles]);

  const selectedDriver = useMemo(
    () => sortedDrivers.find((entry: any) => entry.id === selectedDriverId) ?? null,
    [selectedDriverId, sortedDrivers]
  );

  const selectedDriverVehicles = useMemo(
    () => (selectedDriverId ? vehiclesByDriverId.get(selectedDriverId) ?? [] : []),
    [selectedDriverId, vehiclesByDriverId]
  );

  useEffect(() => {
    if (!selectedDriverId && sortedDrivers.length > 0) {
      setSelectedDriverId(sortedDrivers[0].id);
    }
  }, [selectedDriverId, sortedDrivers]);

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
      userId: driver.userId ?? "",
      notes: driver.notes ?? "",
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
      const payload = {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        userId: formData.userId || undefined,
        notes: formData.notes || undefined,
        status: formData.status,
      };

      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          ...payload,
        });
        toast.success("Motorista atualizado");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Motorista criado");
      }

      setOpen(false);
      refetchDrivers();
      refetchVehicles();
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível salvar o motorista");
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
      refetchDrivers();
      refetchVehicles();
    } catch {
      toast.error("Não foi possível excluir o motorista");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Motoristas</h1>
          <p className="mt-1 text-muted-foreground">
            Cadastre o perfil do motorista, vincule ao usuário correto e gerencie os veículos.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Novo Motorista
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Motorista" : "Novo Motorista"}</DialogTitle>
              <DialogDescription>
                Aqui você ajusta o perfil operacional do motorista. Os veículos são gerenciados na
                seção abaixo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Usuário vinculado</Label>
                <Select
                  value={formData.userId}
                  onValueChange={value => setFormData(prev => ({ ...prev, userId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um motorista cadastrado" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenantMotorists.map((entry: any) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.name || entry.email || entry.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={value =>
                    setFormData(prev => ({ ...prev, status: value as DriverForm["status"] }))
                  }
                >
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
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Ex: turno da manhã, preferências, observações operacionais..."
                  rows={3}
                />
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
          <CardDescription>
            Visualize todos os motoristas do tenant, o vínculo com o usuário e os veículos
            principais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-muted-foreground">Nome</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Contato</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Usuário</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Veículos</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedDrivers.map((driver: any) => {
                  const driverVehicles = vehiclesByDriverId.get(driver.id) ?? [];
                  const primaryVehicle =
                    driverVehicles.find((vehicle: any) => vehicle.isPrimary) ?? driverVehicles[0];
                  const linkedUser = driver.userId ? driverByUserId.get(driver.userId) : null;

                  return (
                    <tr key={driver.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">
                        <div className="space-y-1">
                          <div>{driver.name}</div>
                          {driver.notes ? (
                            <div className="max-w-xs text-xs text-muted-foreground">{driver.notes}</div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span>{driver.email || driver.phone || "-"}</span>
                          {driver.phone ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                openWhatsApp(driver.phone, `Olá ${driver.name}, tudo bem?`)
                              }
                              aria-label="Abrir WhatsApp"
                            >
                              <MessageCircleMore className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {linkedUser ? linkedUser.name || linkedUser.email || linkedUser.id : "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {primaryVehicle ? (
                          <div className="space-y-1">
                            <div className="font-medium text-foreground">{primaryVehicle.model}</div>
                            <div className="text-xs">
                              {primaryVehicle.plate}
                              {driverVehicles.length > 1 ? ` • ${driverVehicles.length} veículos` : ""}
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={driver.status}
                          onValueChange={value =>
                            updateMutation
                              .mutateAsync({ id: driver.id, status: value as any })
                              .then(() => refetchDrivers())
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
                      <td className="px-4 py-3">
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
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Veículos do Motorista</CardTitle>
          <CardDescription>
            Cada motorista pode ter vários veículos cadastrados. Selecione um motorista para
            administrar a frota vinculada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Motorista</Label>
              <Select
                value={selectedDriverId ?? ""}
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
              {selectedDriver ? (
                <p className="text-xs text-muted-foreground">
                  {selectedDriver.name}
                  {selectedDriver.userId ? " • perfil já vinculado ao usuário" : " • sem vínculo com usuário"}
                </p>
              ) : null}
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
                  <th className="px-4 py-3 text-left text-muted-foreground">Modelo</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Placa</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Apelido</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Principal</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {!selectedDriverId ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Selecione um motorista para ver os veículos
                    </td>
                  </tr>
                ) : selectedDriverVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Nenhum veículo cadastrado para este motorista
                    </td>
                  </tr>
                ) : (
                  selectedDriverVehicles.map((vehicle: any) => (
                    <tr key={vehicle.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{vehicle.model}</td>
                      <td className="px-4 py-3 text-muted-foreground">{vehicle.plate}</td>
                      <td className="px-4 py-3 text-muted-foreground">{vehicle.nickname || "-"}</td>
                      <td className="px-4 py-3">{vehicle.isPrimary ? "Sim" : "Não"}</td>
                      <td className="px-4 py-3">
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
