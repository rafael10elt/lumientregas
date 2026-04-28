import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCep } from "@/lib/format";
import { lookupCep } from "@/lib/cep";
import { trpc } from "@/lib/trpc";
import { MapPinned, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type BaseForm = {
  name: string;
  postalCode: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  complement: string;
  reference: string;
  latitude: string;
  longitude: string;
  isPrimary: boolean;
};

const emptyForm: BaseForm = {
  name: "",
  postalCode: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  complement: "",
  reference: "",
  latitude: "",
  longitude: "",
  isPrimary: false,
};

function fullAddress(base: any) {
  return [base.street, base.number, base.neighborhood, base.city, base.state].filter(Boolean).join(", ");
}

export default function Bases() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [formData, setFormData] = useState<BaseForm>(emptyForm);

  const { data: bases = [], refetch } = trpc.operationalBases.list.useQuery();
  const createMutation = trpc.operationalBases.create.useMutation();
  const updateMutation = trpc.operationalBases.update.useMutation();
  const deleteMutation = trpc.operationalBases.delete.useMutation();

  const primaryBase = useMemo(() => bases.find((base: any) => base.isPrimary) ?? bases[0] ?? null, [bases]);

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setOpen(true);
  };

  const openEdit = (base: any) => {
    setEditingId(base.id);
    setFormData({
      name: base.name ?? "",
      postalCode: base.postalCode ?? "",
      street: base.street ?? "",
      number: base.number ?? "",
      neighborhood: base.neighborhood ?? "",
      city: base.city ?? "",
      state: base.state ?? "",
      complement: base.complement ?? "",
      reference: base.reference ?? "",
      latitude: base.latitude ? String(base.latitude) : "",
      longitude: base.longitude ? String(base.longitude) : "",
      isPrimary: Boolean(base.isPrimary),
    });
    setOpen(true);
  };

  const fillFromCep = async () => {
    if (!formData.postalCode) {
      toast.error("Informe o CEP da base");
      return;
    }

    setLoadingCep(true);
    try {
      const result = await lookupCep(formData.postalCode);
      setFormData(prev => ({
        ...prev,
        postalCode: result.cep,
        street: result.street,
        neighborhood: result.neighborhood,
        city: result.city,
        state: result.state,
      }));
      toast.success("CEP consultado com sucesso");
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível consultar o CEP");
    } finally {
      setLoadingCep(false);
    }
  };

  const submit = async () => {
    if (!formData.name || !formData.street || !formData.city || !formData.state) {
      toast.error("Preencha nome e endereço da base");
      return;
    }

    try {
      const payload = {
        name: formData.name,
        postalCode: formData.postalCode || undefined,
        street: formData.street,
        number: formData.number || undefined,
        neighborhood: formData.neighborhood || undefined,
        city: formData.city,
        state: formData.state,
        complement: formData.complement || undefined,
        reference: formData.reference || undefined,
        latitude: formData.latitude ? Number(formData.latitude) : undefined,
        longitude: formData.longitude ? Number(formData.longitude) : undefined,
        isPrimary: formData.isPrimary,
      };

      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
        toast.success("Base atualizada");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Base criada");
      }

      setOpen(false);
      setEditingId(null);
      setFormData(emptyForm);
      refetch();
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível salvar a base");
    }
  };

  const removeBase = async (id: string) => {
    if (!confirm("Deseja excluir esta base?")) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Base excluída");
      refetch();
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível excluir a base");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bases Operacionais</h1>
          <p className="mt-1 text-muted-foreground">
            Cadastre as saídas da operação do tenant e marque a base principal do dia.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nova Base
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Base" : "Nova Base Operacional"}</DialogTitle>
              <DialogDescription>
                Configure o endereço de saída da operação. Pelo menos uma base precisa ser principal.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Nome da base *</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Base Recife"
                />
              </div>

              <div className="space-y-2">
                <Label>CEP</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.postalCode}
                    onChange={e => setFormData(prev => ({ ...prev, postalCode: formatCep(e.target.value) }))}
                    placeholder="00000-000"
                    inputMode="numeric"
                  />
                  <Button type="button" variant="outline" onClick={fillFromCep} disabled={loadingCep}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Número</Label>
                <Input
                  value={formData.number}
                  onChange={e => setFormData(prev => ({ ...prev, number: e.target.value }))}
                  placeholder="S/N ou 123"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Rua *</Label>
                <Input
                  value={formData.street}
                  onChange={e => setFormData(prev => ({ ...prev, street: e.target.value }))}
                  placeholder="Rua, avenida..."
                />
              </div>

              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input
                  value={formData.neighborhood}
                  onChange={e => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                  placeholder="Centro"
                />
              </div>

              <div className="space-y-2">
                <Label>Cidade *</Label>
                <Input
                  value={formData.city}
                  onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Recife"
                />
              </div>

              <div className="space-y-2">
                <Label>UF *</Label>
                <Input
                  value={formData.state}
                  onChange={e => setFormData(prev => ({ ...prev, state: e.target.value.toUpperCase().slice(0, 2) }))}
                  placeholder="PE"
                />
              </div>

              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  value={formData.latitude}
                  onChange={e => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                  placeholder="-8.0476"
                />
              </div>

              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  value={formData.longitude}
                  onChange={e => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                  placeholder="-34.8770"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Complemento</Label>
                <Input
                  value={formData.complement}
                  onChange={e => setFormData(prev => ({ ...prev, complement: e.target.value }))}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Referência</Label>
                <Textarea
                  value={formData.reference}
                  onChange={e => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                />
              </div>

              <div className="md:col-span-2">
                <Button
                  type="button"
                  variant={formData.isPrimary ? "default" : "outline"}
                  onClick={() => setFormData(prev => ({ ...prev, isPrimary: !prev.isPrimary }))}
                >
                  {formData.isPrimary ? "Base principal" : "Marcar como principal"}
                </Button>
              </div>

              <Button onClick={submit} className="md:col-span-2">
                {editingId ? "Salvar alterações" : "Criar Base"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Base principal atual</CardTitle>
          <CardDescription>
            Essa é a base usada como ponto de partida quando a rota é gerada automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {primaryBase ? (
            <div className="flex items-start gap-3">
              <MapPinned className="mt-1 h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">{primaryBase.name}</div>
                <div className="text-sm text-muted-foreground">{fullAddress(primaryBase)}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Nenhuma base cadastrada ainda.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Bases</CardTitle>
          <CardDescription>
            {bases.length} bases cadastradas. Pelo menos uma deve estar marcada como principal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Nome</th>
                  <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Endereço</th>
                  <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Principal</th>
                  <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {bases.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-muted-foreground">
                      Nenhuma base cadastrada
                    </td>
                  </tr>
                ) : (
                  bases.map((base: any) => (
                    <tr key={base.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{base.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{fullAddress(base)}</td>
                      <td className="px-4 py-3">{base.isPrimary ? "Sim" : "Não"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(base)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeBase(base.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
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
