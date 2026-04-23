import { useMemo, useState } from "react";
import AddressFields, { defaultAddressValue } from "@/components/AddressFields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import OpenGpsButton from "@/components/OpenGpsButton";

export default function Clients() {
  const [clientOpen, setClientOpen] = useState(false);
  const [baseOpen, setBaseOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("all");
  const [clientForm, setClientForm] = useState({
    name: "",
    document: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [baseForm, setBaseForm] = useState({
    clientId: "",
    name: "",
    isDefault: true,
    address: defaultAddressValue(),
  });

  const { data: clients = [], refetch: refetchClients } = trpc.clients.list.useQuery();
  const { data: bases = [], refetch: refetchBases } = trpc.clientBases.list.useQuery(
    { clientId: selectedClientId === "all" ? undefined : selectedClientId }
  );
  const createClient = trpc.clients.create.useMutation();
  const createBase = trpc.clientBases.create.useMutation();

  const selectedClient = useMemo(
    () => clients.find((client: any) => client.id === selectedClientId),
    [clients, selectedClientId]
  );

  const submitClient = async () => {
    if (!clientForm.name.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    await createClient.mutateAsync({
      name: clientForm.name,
      document: clientForm.document || undefined,
      email: clientForm.email || undefined,
      phone: clientForm.phone || undefined,
      notes: clientForm.notes || undefined,
    });
    toast.success("Cliente salvo");
    setClientOpen(false);
    setClientForm({ name: "", document: "", email: "", phone: "", notes: "" });
    await refetchClients();
  };

  const submitBase = async () => {
    if (!baseForm.clientId || !baseForm.name.trim()) {
      toast.error("Selecione o cliente e dê um nome à base");
      return;
    }
    await createBase.mutateAsync({
      clientId: baseForm.clientId,
      name: baseForm.name,
      isDefault: baseForm.isDefault,
      postalCode: baseForm.address.postalCode || undefined,
      street: baseForm.address.street || undefined,
      number: baseForm.address.number || undefined,
      neighborhood: baseForm.address.neighborhood || undefined,
      city: baseForm.address.city || undefined,
      state: baseForm.address.state || undefined,
      complement: baseForm.address.complement || undefined,
      reference: baseForm.address.reference || undefined,
      latitude: baseForm.address.latitude ? Number(baseForm.address.latitude) : undefined,
      longitude: baseForm.address.longitude ? Number(baseForm.address.longitude) : undefined,
    });
    toast.success("Base salva");
    setBaseOpen(false);
    setBaseForm({ clientId: "", name: "", isDefault: true, address: defaultAddressValue() });
    await refetchBases();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Cadastre clientes e as bases/filiais usadas nas rotas.</p>
        </div>
        <Dialog open={clientOpen} onOpenChange={setClientOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar cliente</DialogTitle>
              <DialogDescription>Dados básicos do cliente e da operação.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Nome</Label>
                <Input value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Documento</Label>
                <Input value={clientForm.document} onChange={e => setClientForm({ ...clientForm, document: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Observações</Label>
                <Textarea value={clientForm.notes} onChange={e => setClientForm({ ...clientForm, notes: e.target.value })} />
              </div>
            </div>
            <Button onClick={submitClient}>Salvar cliente</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Clientes</p><p className="text-3xl font-bold">{clients.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Bases</p><p className="text-3xl font-bold">{bases.length}</p></CardContent></Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Cliente selecionado</p>
            <p className="text-3xl font-bold">{selectedClient?.name || "-"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de clientes</CardTitle>
          <CardDescription>Gerencie filiais e bases por cliente.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-3 text-left">Nome</th>
                <th className="py-3 text-left">Documento</th>
                <th className="py-3 text-left">Contato</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">Nenhum cliente encontrado</td></tr>
              ) : clients.map((client: any) => (
                <tr key={client.id} className="border-b">
                  <td className="py-3 font-medium">{client.name}</td>
                  <td className="py-3">{client.document || "-"}</td>
                  <td className="py-3 text-muted-foreground">{client.phone || client.email || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Bases do cliente</CardTitle>
            <CardDescription>Uma empresa pode ter várias bases/filiais com endereço padrão.</CardDescription>
          </div>
          <Dialog open={baseOpen} onOpenChange={setBaseOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Base
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Criar base</DialogTitle>
                <DialogDescription>Escolha o cliente e cadastre o endereço padrão da filial.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={baseForm.clientId} onValueChange={value => setBaseForm({ ...baseForm, clientId: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nome da base</Label>
                  <Input value={baseForm.name} onChange={e => setBaseForm({ ...baseForm, name: e.target.value })} placeholder="Matriz, filial 1..." />
                </div>
              </div>
              <AddressFields
                title="Endereço padrão da base"
                value={baseForm.address}
                onChange={address => setBaseForm({ ...baseForm, address })}
              />
              <Button onClick={submitBase}>Salvar base</Button>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="flex items-center gap-3 mb-4">
            <Label className="min-w-28">Filtrar cliente</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="max-w-sm">
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clients.map((client: any) => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-3 text-left">Base</th>
                <th className="py-3 text-left">Cliente</th>
                <th className="py-3 text-left">Endereço</th>
                <th className="py-3 text-left">Padrão</th>
              </tr>
            </thead>
            <tbody>
              {bases.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Nenhuma base encontrada</td></tr>
              ) : bases.map((base: any) => (
                <tr key={base.id} className="border-b">
                  <td className="py-3 font-medium">{base.name}</td>
                  <td className="py-3">{clients.find((client: any) => client.id === base.clientId)?.name || base.clientId}</td>
                <td className="py-3 text-muted-foreground">
                    <div>{[base.street, base.number, base.neighborhood, base.city, base.state].filter(Boolean).join(" - ")}</div>
                    <div className="mt-2">
                      <OpenGpsButton
                        address={[base.street, base.number, base.neighborhood, base.city, base.state].filter(Boolean).join(" - ")}
                        latitude={base.latitude}
                        longitude={base.longitude}
                        label="Abrir GPS"
                      />
                    </div>
                  </td>
                  <td className="py-3">{base.isDefault ? "Sim" : "Não"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
