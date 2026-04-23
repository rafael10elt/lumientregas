import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const PAYMENT_LABELS: Record<string, string> = {
  ok: "OK",
  pending: "Pendente",
  overdue: "Vencido",
};

export default function SaaSAdmin() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    status: "active",
    paymentStatus: "pending",
    notes: "",
  });

  const { data: tenants = [], refetch } = trpc.saas.tenants.list.useQuery();
  const createTenant = trpc.saas.tenants.create.useMutation();
  const updateTenant = trpc.saas.tenants.update.useMutation();

  const stats = useMemo(() => ({
    total: tenants.length,
    active: tenants.filter((tenant: any) => tenant.status === "active").length,
    paid: tenants.filter((tenant: any) => tenant.paymentStatus === "ok").length,
  }), [tenants]);

  const submitTenant = async () => {
    if (!form.name.trim()) {
      toast.error("Informe o nome do tenant");
      return;
    }

    await createTenant.mutateAsync({
      name: form.name,
      slug: form.slug || undefined,
      contactName: form.contactName || undefined,
      contactEmail: form.contactEmail || undefined,
      contactPhone: form.contactPhone || undefined,
      status: form.status as any,
      paymentStatus: form.paymentStatus as any,
      notes: form.notes || undefined,
    });
    toast.success("Tenant criado");
    setOpen(false);
    setForm({
      name: "",
      slug: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      status: "active",
      paymentStatus: "pending",
      notes: "",
    });
    await refetch();
  };

  const changePaymentStatus = async (tenant: any, paymentStatus: string) => {
    await updateTenant.mutateAsync({
      id: tenant.id,
      paymentStatus: paymentStatus as any,
    });
    toast.success("Status de pagamento atualizado");
    await refetch();
  };

  const changeTenantStatus = async (tenant: any, status: string) => {
    await updateTenant.mutateAsync({
      id: tenant.id,
      status: status as any,
    });
    toast.success("Status do tenant atualizado");
    await refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">SaaS</h1>
          <p className="text-muted-foreground">Gestão de tenants, contratos e acesso da plataforma.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar tenant</DialogTitle>
              <DialogDescription>Cadastre a empresa cliente e o estado inicial de pagamento.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="empresa-x" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={value => setForm({ ...form, status: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status de pagamento</Label>
                <Select value={form.paymentStatus} onValueChange={value => setForm({ ...form, paymentStatus: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ok">OK</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="overdue">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Contato</Label>
                <Input value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <Button onClick={submitTenant}>Salvar tenant</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Tenants</p><p className="text-3xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Ativos</p><p className="text-3xl font-bold">{stats.active}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Pagos</p><p className="text-3xl font-bold">{stats.paid}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenants cadastrados</CardTitle>
          <CardDescription>Controle acesso da plataforma por empresa.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-3 text-left">Tenant</th>
                <th className="py-3 text-left">Slug</th>
                <th className="py-3 text-left">Contato</th>
                <th className="py-3 text-left">Pagamento</th>
                <th className="py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum tenant cadastrado</td></tr>
              ) : tenants.map((tenant: any) => (
                <tr key={tenant.id} className="border-b align-top">
                  <td className="py-3 font-medium">{tenant.name}</td>
                  <td className="py-3">{tenant.slug}</td>
                  <td className="py-3 text-muted-foreground">
                    <div>{tenant.contactName || "-"}</div>
                    <div>{tenant.contactEmail || "-"}</div>
                    <div>{tenant.contactPhone || "-"}</div>
                  </td>
                  <td className="py-3">
                    <Select value={tenant.paymentStatus} onValueChange={value => changePaymentStatus(tenant, value)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ok">OK</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="overdue">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">{PAYMENT_LABELS[tenant.paymentStatus] || tenant.paymentStatus}</p>
                  </td>
                  <td className="py-3">
                    <Select value={tenant.status} onValueChange={value => changeTenantStatus(tenant, value)}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="suspended">Suspenso</SelectItem>
                      </SelectContent>
                    </Select>
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
