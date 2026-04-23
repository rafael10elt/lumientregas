import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Building2, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type TenantForm = {
  name: string;
  slug: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: "active" | "suspended";
  paymentStatus: "ok" | "pending" | "overdue";
  notes: string;
};

const emptyForm: TenantForm = {
  name: "",
  slug: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  status: "active",
  paymentStatus: "pending",
  notes: "",
};

export default function Tenants() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TenantForm>(emptyForm);

  const { data: tenants = [], refetch } = trpc.tenants.list.useQuery();
  const createMutation = trpc.tenants.create.useMutation();
  const updateMutation = trpc.tenants.update.useMutation();
  const deleteMutation = trpc.tenants.delete.useMutation();

  const sortedTenants = useMemo(
    () =>
      [...tenants].sort(
        (a: any, b: any) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      ),
    [tenants]
  );

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setOpen(true);
  };

  const openEdit = (tenant: any) => {
    setEditingId(tenant.id);
    setFormData({
      name: tenant.name ?? "",
      slug: tenant.slug ?? "",
      contactName: tenant.contactName ?? "",
      contactEmail: tenant.contactEmail ?? "",
      contactPhone: tenant.contactPhone ?? "",
      status: tenant.status ?? "active",
      paymentStatus: tenant.paymentStatus ?? "pending",
      notes: tenant.notes ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!formData.name || !formData.slug) {
      toast.error("Informe nome e slug");
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          ...formData,
          contactName: formData.contactName || null,
          contactEmail: formData.contactEmail || null,
          contactPhone: formData.contactPhone || null,
          notes: formData.notes || null,
        });
        toast.success("Tenant atualizado");
      } else {
        await createMutation.mutateAsync({
          ...formData,
          contactName: formData.contactName || undefined,
          contactEmail: formData.contactEmail || undefined,
          contactPhone: formData.contactPhone || undefined,
          notes: formData.notes || undefined,
        });
        toast.success("Tenant criado");
      }

      setOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível salvar o tenant");
    }
  };

  const removeTenant = async (id: string) => {
    if (!confirm("Deseja excluir este tenant?")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Tenant excluído");
      refetch();
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível excluir o tenant");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tenants</h1>
          <p className="mt-1 text-muted-foreground">
            Cadastre empresas, acompanhe o status do plano e libere ou bloqueie o acesso.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Novo Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Tenant" : "Novo Tenant"}</DialogTitle>
              <DialogDescription>
                Tenants com pagamento pendente ou suspenso ficam bloqueados no sistema.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={formData.slug}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                    }))
                  }
                  placeholder="empresa-exemplo"
                />
              </div>
              <div className="space-y-2">
                <Label>Contato</Label>
                <Input
                  value={formData.contactName}
                  onChange={e => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  value={formData.contactEmail}
                  onChange={e => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.contactPhone}
                  onChange={e => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={value =>
                    setFormData(prev => ({ ...prev, status: value as TenantForm["status"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pagamento</Label>
                <Select
                  value={formData.paymentStatus}
                  onValueChange={value =>
                    setFormData(prev => ({
                      ...prev,
                      paymentStatus: value as TenantForm["paymentStatus"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ok">OK</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="overdue">Em atraso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                />
              </div>
            </div>

            <Button onClick={submit} className="w-full">
              Salvar
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Tenants</p>
                <p className="text-2xl font-semibold">{sortedTenants.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pagamentos OK</p>
            <p className="text-2xl font-semibold">
              {sortedTenants.filter((tenant: any) => tenant.paymentStatus === "ok").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pendentes/atrasados</p>
            <p className="text-2xl font-semibold">
              {sortedTenants.filter((tenant: any) => tenant.paymentStatus !== "ok").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-semibold">
                  {sortedTenants.filter((tenant: any) => tenant.status === "active").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Tenants</CardTitle>
          <CardDescription>Controle o ciclo de vida e a liberação de acesso.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-muted-foreground">Nome</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Slug</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Pagamento</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Contato</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedTenants.map((tenant: any) => (
                  <tr key={tenant.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{tenant.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{tenant.slug}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                        {tenant.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{tenant.status}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {tenant.contactEmail || tenant.contactPhone || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(tenant)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeTenant(tenant.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
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
    </div>
  );
}
