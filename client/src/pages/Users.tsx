import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Users() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    openId: "",
    name: "",
    email: "",
    loginMethod: "email",
    role: "motorista",
    tenantId: "none",
  });

  const isSuperadmin = user?.role === "superadmin";
  const { data: users = [], refetch } = trpc.users.list.useQuery();
  const { data: tenants = [] } = trpc.saas.tenants.list.useQuery(undefined, { enabled: isSuperadmin });
  const createMutation = trpc.users.create.useMutation();

  useEffect(() => {
    if (!isSuperadmin && user?.tenantId) {
      setForm(current => ({ ...current, tenantId: user.tenantId ?? "none" }));
    }
  }, [isSuperadmin, user?.tenantId]);

  const scopedUsers = useMemo(() => users, [users]);

  const submit = async () => {
    if (!form.openId.trim()) {
      toast.error("Informe o openId do usuário");
      return;
    }

    await createMutation.mutateAsync({
      openId: form.openId,
      name: form.name || undefined,
      email: form.email || undefined,
      loginMethod: form.loginMethod || undefined,
      role: form.role as any,
      tenantId: isSuperadmin ? (form.tenantId === "none" ? undefined : form.tenantId) : user?.tenantId || undefined,
    });
    toast.success("Usuário salvo");
    setOpen(false);
    setForm({ openId: "", name: "", email: "", loginMethod: "email", role: "motorista", tenantId: isSuperadmin ? "none" : user?.tenantId ?? "none" });
    await refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Usuários</h1>
          <p className="text-muted-foreground">Perfis administrativos, motoristas e controle de acesso.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar usuário</DialogTitle>
              <DialogDescription>Cadastre o usuário e vincule ao tenant correto.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>openId</Label>
                <Input value={form.openId} onChange={e => setForm({ ...form, openId: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Método de login</Label>
                <Select value={form.loginMethod} onValueChange={value => setForm({ ...form, loginMethod: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select value={form.role} onValueChange={value => setForm({ ...form, role: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {isSuperadmin ? <SelectItem value="superadmin">Superadmin</SelectItem> : null}
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="motorista">Motorista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isSuperadmin ? (
                <div className="space-y-2 md:col-span-2">
                  <Label>Tenant</Label>
                  <Select value={form.tenantId} onValueChange={value => setForm({ ...form, tenantId: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um tenant" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem tenant</SelectItem>
                      {tenants.map((tenant: any) => (
                        <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
            <Button onClick={submit}>Salvar usuário</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de usuários</CardTitle>
          <CardDescription>Gerencie perfis por tenant.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-3 text-left">Nome</th>
                <th className="py-3 text-left">E-mail</th>
                <th className="py-3 text-left">Perfil</th>
                <th className="py-3 text-left">Tenant</th>
              </tr>
            </thead>
            <tbody>
              {scopedUsers.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Nenhum usuário encontrado</td></tr>
              ) : scopedUsers.map((item: any) => (
                <tr key={item.id} className="border-b">
                  <td className="py-3">{item.name || "-"}</td>
                  <td className="py-3">{item.email || "-"}</td>
                  <td className="py-3">{item.role}</td>
                  <td className="py-3 text-muted-foreground">{item.tenantName || item.tenantId || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
