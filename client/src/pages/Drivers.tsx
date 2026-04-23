import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Truck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  available: "Disponível",
  busy: "Ocupado",
  offline: "Offline",
};

export default function Drivers() {
  const [open, setOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [driverForm, setDriverForm] = useState({
    userId: "none",
    name: "",
    email: "",
    phone: "",
    notes: "",
    status: "offline",
  });
  const [vehicleForm, setVehicleForm] = useState({
    driverId: "none",
    model: "",
    plate: "",
    nickname: "",
    isPrimary: true,
  });

  const { data: drivers = [], refetch: refetchDrivers } = trpc.drivers.list.useQuery();
  const { data: users = [] } = trpc.users.list.useQuery();
  const { data: vehicles = [], refetch: refetchVehicles } = trpc.driverVehicles.list.useQuery(
    { driverId: selectedDriverId || undefined }
  );

  const createDriver = trpc.drivers.create.useMutation();
  const createVehicle = trpc.driverVehicles.create.useMutation();

  const driverStats = useMemo(() => ({
    total: drivers.length,
    available: drivers.filter((driver: any) => driver.status === "available").length,
    busy: drivers.filter((driver: any) => driver.status === "busy").length,
  }), [drivers]);

  const submitDriver = async () => {
    if (!driverForm.name.trim()) {
      toast.error("Informe o nome do motorista");
      return;
    }

    await createDriver.mutateAsync({
      userId: driverForm.userId === "none" ? undefined : driverForm.userId,
      name: driverForm.name,
      email: driverForm.email || undefined,
      phone: driverForm.phone || undefined,
      notes: driverForm.notes || undefined,
      status: driverForm.status as any,
    });
    toast.success("Motorista criado");
    setOpen(false);
    setDriverForm({ userId: "none", name: "", email: "", phone: "", notes: "", status: "offline" });
    await refetchDrivers();
  };

  const submitVehicle = async () => {
    if (vehicleForm.driverId === "none" || !vehicleForm.model.trim() || !vehicleForm.plate.trim()) {
      toast.error("Informe motorista, modelo e placa");
      return;
    }

    await createVehicle.mutateAsync({
      driverId: vehicleForm.driverId,
      model: vehicleForm.model,
      plate: vehicleForm.plate.toUpperCase(),
      nickname: vehicleForm.nickname || undefined,
      isPrimary: vehicleForm.isPrimary,
    });
    toast.success("Veículo adicionado");
    setVehicleOpen(false);
    setVehicleForm({ driverId: "none", model: "", plate: "", nickname: "", isPrimary: true });
    await refetchVehicles();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Motoristas</h1>
          <p className="text-muted-foreground">Cadastro, equipe, disponibilidade e veículos.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Motorista
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar motorista</DialogTitle>
              <DialogDescription>Cadastre o motorista e vincule ao usuário de acesso.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Usuário vinculado</Label>
                <Select value={driverForm.userId} onValueChange={value => setDriverForm({ ...driverForm, userId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário motorista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem usuário</SelectItem>
                    {users.filter((item: any) => item.role === "motorista").map((item: any) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name || item.email || item.openId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Nome</Label>
                <Input value={driverForm.name} onChange={e => setDriverForm({ ...driverForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={driverForm.email} onChange={e => setDriverForm({ ...driverForm, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={driverForm.phone} onChange={e => setDriverForm({ ...driverForm, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={driverForm.status} onValueChange={value => setDriverForm({ ...driverForm, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="busy">Ocupado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Observações</Label>
                <Textarea
                  value={driverForm.notes}
                  onChange={e => setDriverForm({ ...driverForm, notes: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={submitDriver}>Salvar motorista</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total</p><p className="text-3xl font-bold">{driverStats.total}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Disponíveis</p><p className="text-3xl font-bold">{driverStats.available}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Ocupados</p><p className="text-3xl font-bold">{driverStats.busy}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de motoristas</CardTitle>
          <CardDescription>Edite disponibilidade e acompanhe os dados principais.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-3 text-left">Nome</th>
                <th className="py-3 text-left">Contato</th>
                <th className="py-3 text-left">Usuário</th>
                <th className="py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Nenhum motorista cadastrado</td></tr>
              ) : drivers.map((driver: any) => (
                <tr key={driver.id} className="border-b">
                  <td className="py-3 font-medium">{driver.name}</td>
                  <td className="py-3 text-muted-foreground">{driver.phone || driver.email || "-"}</td>
                  <td className="py-3 text-muted-foreground">
                    {users.find((item: any) => item.id === driver.userId)?.name || driver.userId || "-"}
                  </td>
                  <td className="py-3">{STATUS_LABELS[driver.status] || driver.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Veículos do motorista</CardTitle>
          <CardDescription>Um motorista pode ter mais de um veículo cadastrado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto]">
            <div className="space-y-2">
              <Label>Motorista</Label>
              <Select value={vehicleForm.driverId || "none"} onValueChange={value => setVehicleForm({ ...vehicleForm, driverId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um motorista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione um motorista</SelectItem>
                  {drivers.map((driver: any) => (
                    <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input value={vehicleForm.model} onChange={e => setVehicleForm({ ...vehicleForm, model: e.target.value })} placeholder="Fiorino" />
            </div>
            <div className="space-y-2">
              <Label>Placa</Label>
              <Input value={vehicleForm.plate} onChange={e => setVehicleForm({ ...vehicleForm, plate: e.target.value })} placeholder="ABC1D23" />
            </div>
            <div className="flex items-end">
              <Dialog open={vehicleOpen} onOpenChange={setVehicleOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Truck className="h-4 w-4" />
                    Adicionar veículo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar veículo</DialogTitle>
                    <DialogDescription>Modelo, placa e apelido opcional.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Motorista</Label>
                      <Select value={vehicleForm.driverId || "none"} onValueChange={value => setVehicleForm({ ...vehicleForm, driverId: value })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Selecione</SelectItem>
                          {drivers.map((driver: any) => (
                            <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Modelo</Label>
                      <Input value={vehicleForm.model} onChange={e => setVehicleForm({ ...vehicleForm, model: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Placa</Label>
                      <Input value={vehicleForm.plate} onChange={e => setVehicleForm({ ...vehicleForm, plate: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Apelido</Label>
                      <Input value={vehicleForm.nickname} onChange={e => setVehicleForm({ ...vehicleForm, nickname: e.target.value })} />
                    </div>
                    <Button onClick={submitVehicle}>Salvar veículo</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3 text-left">Modelo</th>
                  <th className="py-3 text-left">Placa</th>
                  <th className="py-3 text-left">Apelido</th>
                  <th className="py-3 text-left">Principal</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Nenhum veículo encontrado</td></tr>
                ) : vehicles.map((vehicle: any) => (
                  <tr key={vehicle.id} className="border-b">
                    <td className="py-3">{vehicle.model}</td>
                    <td className="py-3">{vehicle.plate}</td>
                    <td className="py-3 text-muted-foreground">{vehicle.nickname || "-"}</td>
                    <td className="py-3">{vehicle.isPrimary ? "Sim" : "Não"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
