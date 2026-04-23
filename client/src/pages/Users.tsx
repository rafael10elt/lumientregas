import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Pencil, Plus, Trash2, Users as UsersIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Role = "superadmin" | "admin" | "motorista";

type UserForm = {
  name: string;
  email: string;
  password: string;
  role: Role;
  tenantId: string;
};

const emptyForm: UserForm = {
  name: "",
  email: "",
  password: "",
  role: "motorista",
  tenantId: "",
};

const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  motorista: "Motorista",
};

export default function Users() {
  const { user, tenant } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<UserForm>(emptyForm);

  const { data: users = [], refetch } = trpc.users.list.useQuery();
  const { data: tenants = [] } = trpc.tenants.list.useQuery(undefined, {
    enabled: user?.role === "superadmin",
  });
  const createMutation = trpc.users.create.useMutation();
  const updateMutation = trpc.users.update.useMutation();
  const deleteMutation = trpc.users.delete.useMutation();

  const tenantNameById = useMemo(() => {
    return new Map(tenants.map((entry: any) => [entry.id, entry.name]));
  }, [tenants]);

  const sortedUsers = useMemo(
    () =>
      [...users].sort(
        (a: any, b: any) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      ),
    [users]
  );

  const visibleUsers = useMemo(() => {
    if (user?.role === "superadmin") {
      return sortedUsers;
    }
    return sortedUsers.filter((entry: any) => entry.role !== "superadmin");
  }, [sortedUsers, user?.role]);

  const openCreate = () => {
    setEditingId(null);
    setFormData({
      ...emptyForm,
      tenantId: user?.role === "admin" ? tenant?.id ?? "" : "",
    });
    setOpen(true);
  };

  const openEdit = (entry: any) => {
    setEditingId(entry.id);
    setFormData({
      name: entry.name ?? "",
      email: entry.email ?? "",
      password: "",
      role: entry.role ?? "motorista",
      tenantId: entry.tenantId ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!formData.email) {
      toast.error("Informe o e-mail");
      return;
    }

    if (user?.role === "superadmin" && !formData.tenantId) {
      toast.error("Selecione um tenant");
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          name: formData.name || undefined,
          email: formData.email,
          role: formData.role,
          tenantId: formData.tenantId || undefined,
        });
        toast.success("Usuário atualizado");
      } else {
        await createMutation.mutateAsync({
          name: formData.name || undefined,
          email: formData.email,
          password: formData.password || undefined,
          role: formData.role,
          tenantId: formData.tenantId || undefined,
        });
        toast.success("Usuário criado");
      }

      setOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível salvar o usuário");
    }
  };

  const removeUser = async (id: number) => {
    if (!confirm("Deseja remover este usuário?")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Usuário removido");
      refetch();
    } catch {
      toast.error("Não foi possível remover o usuário");
    }
  };

  const roleOptions: Array<{ value: Role; label: string }> = [
    { value: "superadmin", label: "Superadmin" },
    { value: "motorista", label: "Motorista" },
    { value: "admin", label: "Admin" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Usuários</h1>
          <p className="mt-1 text-muted-foreground">
            {user?.role === "superadmin"
              ? "Gerencie usuários do SaaS e associe cada conta ao tenant correto."
              : "Gerencie os acessos do seu tenant, incluindo admins e motoristas."}
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
              <DialogDescription>
                A conta é criada no Supabase Auth e vinculada ao tenant selecionado.
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
                <Label>E-mail</Label>
                <Input
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              {!editingId ? (
                <div className="space-y-2">
                  <Label>Senha inicial</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Opcional, mínimo 6 caracteres"
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>Permissão</Label>
                <Select
                  value={formData.role}
                  onValueChange={value =>
                    setFormData(prev => ({ ...prev, role: value as Role }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {user?.role === "superadmin" ? (
                <div className="space-y-2">
                  <Label>Tenant</Label>
                  <Select
                    value={formData.tenantId}
                    onValueChange={value => setFormData(prev => ({ ...prev, tenantId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((entry: any) => (
                        <SelectItem key={entry.id} value={entry.id}>
                          {entry.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <Button onClick={submit} className="w-full">
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UsersIcon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-semibold">{visibleUsers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Superadmins</p>
            <p className="text-2xl font-semibold">
              {visibleUsers.filter((entry: any) => entry.role === "superadmin").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Admins</p>
            <p className="text-2xl font-semibold">
              {visibleUsers.filter((entry: any) => entry.role === "admin").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Motoristas</p>
            <p className="text-2xl font-semibold">
              {visibleUsers.filter((entry: any) => entry.role === "motorista").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>
            Controle perfis, permissões e vínculo com tenant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-muted-foreground">Nome</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">E-mail</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Perfil</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Tenant</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Login</th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((entry: any) => {
                  const canEdit = entry.role !== "superadmin" || user?.role === "superadmin";
                  const tenantLabel = entry.tenantId
                    ? tenantNameById.get(entry.tenantId) ?? entry.tenantId
                    : "-";

                  return (
                    <tr key={entry.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{entry.name || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{entry.email || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {ROLE_LABELS[entry.role as Role] ?? entry.role}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{tenantLabel}</td>
                      <td className="px-4 py-3 text-muted-foreground">{entry.loginMethod || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {canEdit ? (
                            <Button variant="ghost" size="sm" onClick={() => openEdit(entry)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </Button>
                          ) : null}
                          {entry.role !== "superadmin" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeUser(entry.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </Button>
                          ) : null}
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
    </div>
  );
}
