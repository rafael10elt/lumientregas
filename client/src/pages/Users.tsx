import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Pencil, Plus, Trash2, Users as UsersIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type UserForm = {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
};

const emptyForm: UserForm = {
  name: "",
  email: "",
  password: "",
  role: "user",
};

export default function Users() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<UserForm>(emptyForm);

  const { data: users = [], refetch } = trpc.users.list.useQuery();
  const createMutation = trpc.users.create.useMutation();
  const updateMutation = trpc.users.update.useMutation();
  const deleteMutation = trpc.users.delete.useMutation();

  const sortedUsers = useMemo(
    () =>
      [...users].sort(
        (a: any, b: any) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      ),
    [users]
  );

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setOpen(true);
  };

  const openEdit = (user: any) => {
    setEditingId(user.id);
    setFormData({
      name: user.name ?? "",
      email: user.email ?? "",
      password: "",
      role: user.role ?? "user",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!formData.email) {
      toast.error("Informe o e-mail");
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          name: formData.name || undefined,
          email: formData.email,
          role: formData.role,
        });
        toast.success("Usuário atualizado");
      } else {
        await createMutation.mutateAsync({
          name: formData.name || undefined,
          email: formData.email,
          password: formData.password || undefined,
          role: formData.role,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie acessos administrativos e perfis do sistema
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
              <DialogDescription>
                A criação já abre a conta no Supabase Auth e cria o perfil interno.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} />
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
                <Select value={formData.role} onValueChange={value => setFormData(prev => ({ ...prev, role: value as UserForm["role"] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
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
              <UsersIcon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-semibold">{sortedUsers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Admins</p>
            <p className="text-2xl font-semibold">
              {sortedUsers.filter((user: any) => user.role === "admin").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Usuários</p>
            <p className="text-2xl font-semibold">
              {sortedUsers.filter((user: any) => user.role === "user").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>Controle perfis, permissões e contas de acesso</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-muted-foreground">Nome</th>
                  <th className="text-left py-3 px-4 text-muted-foreground">E-mail</th>
                  <th className="text-left py-3 px-4 text-muted-foreground">Perfil</th>
                  <th className="text-left py-3 px-4 text-muted-foreground">Login</th>
                  <th className="text-left py-3 px-4 text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user: any) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{user.name || "-"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{user.email || "-"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{user.role}</td>
                    <td className="py-3 px-4 text-muted-foreground">{user.loginMethod || "-"}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeUser(user.id)}>
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
