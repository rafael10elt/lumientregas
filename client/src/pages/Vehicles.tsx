import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPlate } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Pencil, Plus, Trash2, Truck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type VehicleForm = {
  currentMotoristUserId: string;
  model: string;
  plate: string;
  nickname: string;
  isPrimary: boolean;
};

const emptyForm: VehicleForm = {
  currentMotoristUserId: "",
  model: "",
  plate: "",
  nickname: "",
  isPrimary: false,
};

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("pt-BR");
}

export default function Vehicles() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [formData, setFormData] = useState<VehicleForm>(emptyForm);

  const { data: users = [] } = trpc.users.list.useQuery();
  const { data: drivers = [], refetch: refetchDrivers } = trpc.drivers.list.useQuery();
  const { data: vehicles = [], refetch: refetchVehicles } = trpc.driverVehicles.list.useQuery();
  const { data: assignments = [], refetch: refetchAssignments } = trpc.vehicleAssignments.list.useQuery(
    selectedVehicleId ? { vehicleId: selectedVehicleId } : undefined,
    { enabled: Boolean(selectedVehicleId) }
  );

  const createMutation = trpc.driverVehicles.create.useMutation();
  const updateMutation = trpc.driverVehicles.update.useMutation();
  const deleteMutation = trpc.driverVehicles.delete.useMutation();

  const activeMotorists = useMemo(
    () =>
      [...users]
        .filter((user: any) => user.role === "motorista" && user.status === "active")
        .sort((a: any, b: any) => String(a.name ?? a.email ?? "").localeCompare(String(b.name ?? b.email ?? ""))),
    [users]
  );

  const activeDriverByUserId = useMemo(
    () =>
      new Map(
        drivers
          .filter((driver: any) => driver.userId && activeMotorists.some((user: any) => user.id === driver.userId))
          .map((driver: any) => [driver.userId, driver])
      ),
    [activeMotorists, drivers]
  );

  const driverById = useMemo(() => new Map(drivers.map((driver: any) => [driver.id, driver])), [drivers]);

  const vehicleRows = useMemo(
    () =>
      [...vehicles].sort((a: any, b: any) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
        return String(a.model ?? "").localeCompare(String(b.model ?? ""));
      }),
    [vehicles]
  );

  const selectedVehicle = useMemo(
    () => vehicleRows.find((vehicle: any) => vehicle.id === selectedVehicleId) ?? null,
    [selectedVehicleId, vehicleRows]
  );

  const selectedVehicleDriver = useMemo(() => {
    if (!selectedVehicle?.currentDriverId) return null;
    return driverById.get(selectedVehicle.currentDriverId) ?? null;
  }, [driverById, selectedVehicle]);

  const selectedVehicleUser = useMemo(() => {
    if (!selectedVehicleDriver?.userId) return null;
    return users.find((user: any) => user.id === selectedVehicleDriver.userId) ?? null;
  }, [selectedVehicleDriver, users]);

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setOpen(true);
  };

  const openEdit = (vehicle: any) => {
    setEditingId(vehicle.id);
    const vehicleDriver = vehicle.currentDriverId ? driverById.get(vehicle.currentDriverId) ?? null : null;
    setFormData({
      currentMotoristUserId: vehicleDriver?.userId ?? "",
      model: vehicle.model ?? "",
      plate: vehicle.plate ?? "",
      nickname: vehicle.nickname ?? "",
      isPrimary: Boolean(vehicle.isPrimary),
    });
    setSelectedVehicleId(vehicle.id);
    setOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(emptyForm);
  };

  useEffect(() => {
    if (!selectedVehicleId && vehicleRows.length > 0) {
      setSelectedVehicleId(vehicleRows[0].id);
    }
  }, [selectedVehicleId, vehicleRows]);

  const submit = async () => {
    if (!formData.model || !formData.plate) {
      toast.error("Informe modelo e placa");
      return;
    }

    const resolvedDriver = formData.currentMotoristUserId
      ? activeDriverByUserId.get(formData.currentMotoristUserId) ?? null
      : null;

    if (formData.currentMotoristUserId && !resolvedDriver) {
      toast.error("Este motorista ativo ainda não possui perfil interno sincronizado");
      return;
    }

    try {
      const payload = {
        currentDriverId: resolvedDriver?.id ?? null,
        model: formData.model,
        plate: formData.plate.toUpperCase(),
        nickname: formData.nickname || undefined,
        isPrimary: formData.isPrimary,
      };

      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
        toast.success("Veículo atualizado");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Veículo criado");
      }

      setOpen(false);
      resetForm();
      refetchVehicles();
      refetchDrivers();
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível salvar o veículo");
    }
  };

  const removeVehicle = async (vehicleId: string) => {
    if (!confirm("Deseja excluir este veículo?")) return;

    try {
      await deleteMutation.mutateAsync(vehicleId);
      toast.success("Veículo excluído");
      if (selectedVehicleId === vehicleId) {
        setSelectedVehicleId(null);
      }
      refetchVehicles();
      refetchAssignments();
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível excluir o veículo");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Veículos</h1>
          <p className="mt-1 text-muted-foreground">
            Gerencie a frota do tenant e vincule cada veículo a um motorista ativo.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Novo Veículo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Veículo" : "Novo Veículo"}</DialogTitle>
              <DialogDescription>
                Use um motorista ativo como vínculo operacional. O histórico do veículo será preservado.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Motorista ativo</Label>
                <Select
                  value={formData.currentMotoristUserId || "unassigned"}
                  onValueChange={value =>
                    setFormData(prev => ({
                      ...prev,
                      currentMotoristUserId: value === "unassigned" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um motorista ativo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sem vínculo</SelectItem>
                    {activeMotorists.map((user: any) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.name || user.email || user.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Modelo *</Label>
                <Input
                  value={formData.model}
                  onChange={e => setFormData(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="Ex: Fiorino"
                />
              </div>

              <div className="space-y-2">
                <Label>Placa *</Label>
                <Input
                  value={formData.plate}
                  onChange={e => setFormData(prev => ({ ...prev, plate: formatPlate(e.target.value) }))}
                  placeholder="ABC1D23"
                />
              </div>

              <div className="space-y-2">
                <Label>Apelido</Label>
                <Input
                  value={formData.nickname}
                  onChange={e => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                  placeholder="Carro principal, reserva..."
                />
              </div>

              <Button
                type="button"
                variant={formData.isPrimary ? "default" : "outline"}
                className="w-full"
                onClick={() => setFormData(prev => ({ ...prev, isPrimary: !prev.isPrimary }))}
              >
                {formData.isPrimary ? "Veículo principal" : "Marcar como principal"}
              </Button>

              <div className="flex gap-2">
                <Button onClick={submit} className="flex-1">
                  Salvar
                </Button>
                {editingId ? (
                  <Button variant="outline" onClick={resetForm}>
                    Cancelar edição
                  </Button>
                ) : null}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-semibold">{vehicleRows.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Principais</p>
            <p className="text-2xl font-semibold">
              {vehicleRows.filter((vehicle: any) => vehicle.isPrimary).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Vinculados</p>
            <p className="text-2xl font-semibold">
              {vehicleRows.filter((vehicle: any) => Boolean(vehicle.currentDriverId)).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Motoristas ativos</p>
            <p className="text-2xl font-semibold">{activeMotorists.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Frota do tenant</CardTitle>
          <CardDescription>
            Cadastre veículos, defina o principal e acompanhe o vínculo atual com motoristas ativos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-muted-foreground">Modelo</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Placa</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Motorista atual</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Principal</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {vehicleRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-muted-foreground">
                      Nenhum veículo cadastrado
                    </td>
                  </tr>
                ) : (
                  vehicleRows.map((vehicle: any) => {
                    const vehicleDriver = vehicle.currentDriverId ? driverById.get(vehicle.currentDriverId) ?? null : null;
                    const vehicleUser = vehicleDriver?.userId
                      ? users.find((user: any) => user.id === vehicleDriver.userId) ?? null
                      : null;

                    return (
                      <tr key={vehicle.id} className="border-b border-border hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">
                          <div className="space-y-1">
                            <div>{vehicle.model}</div>
                            {vehicle.nickname ? (
                              <div className="text-xs text-muted-foreground">{vehicle.nickname}</div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{vehicle.plate}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {vehicleUser ? vehicleUser.name || vehicleUser.email || vehicleUser.id : "Sem vínculo"}
                        </td>
                        <td className="px-4 py-3">{vehicle.isPrimary ? "Sim" : "Não"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(vehicle)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeVehicle(vehicle.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Histórico de vínculo</CardTitle>
            <CardDescription>
              Acompanhe quando o veículo foi vinculado ou desvinculado de um motorista.
            </CardDescription>
          </div>
          <div className="w-full max-w-sm">
            <Select
              value={selectedVehicleId ?? ""}
              onValueChange={value => setSelectedVehicleId(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um veículo" />
              </SelectTrigger>
              <SelectContent>
                {vehicleRows.map((vehicle: any) => (
                  <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                    {vehicle.model} • {vehicle.plate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedVehicle ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              Selecione um veículo para ver o histórico.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4 text-primary" />
                  Vínculo atual
                </div>
                <div className="mt-2 text-sm text-foreground">
                  {selectedVehicleUser ? selectedVehicleUser.name || selectedVehicleUser.email || selectedVehicleUser.id : "Sem motorista vinculado"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedVehicleDriver ? `Perfil interno: ${selectedVehicleDriver.name}` : "Perfil interno não localizado"}
                </div>
              </div>

              {assignments.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Nenhum vínculo registrado para este veículo.
                </div>
              ) : (
                assignments.map((assignment: any) => {
                  const assignedDriver = assignment.driverId ? driverById.get(assignment.driverId) ?? null : null;
                  const assignedUser = assignedDriver?.userId
                    ? users.find((user: any) => user.id === assignedDriver.userId) ?? null
                    : null;

                  return (
                    <div key={assignment.id} className="rounded-lg border border-border/60 bg-background p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">
                          {assignedUser ? assignedUser.name || assignedUser.email || assignedUser.id : assignedDriver?.name || assignment.driverId}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {assignment.unassignedAt ? "Desvinculado" : "Ativo"}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Início: {formatDateTime(assignment.assignedAt)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Fim: {formatDateTime(assignment.unassignedAt)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
