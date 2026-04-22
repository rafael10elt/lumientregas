import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { Package2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submitSignIn = async () => {
    if (!email || !password) {
      toast.error("Informe e-mail e senha");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Login realizado com sucesso");
    window.location.href = "/";
  };

  const submitSignUp = async () => {
    if (!email || !password) {
      toast.error("Informe e-mail e senha");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Conta criada. Se o projeto exigir confirmação por e-mail, conclua a validação antes de entrar.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-primary/20 p-4 rounded-full">
              <Package2 className="w-12 h-12 text-primary" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">
            Lumi Entregas
          </h1>

          <p className="text-muted-foreground mb-8">
            Sistema de Gestão de Entregas e Roteirização Inteligente
          </p>

          <div className="space-y-4 text-left">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">E-mail</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Senha</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Button onClick={submitSignIn} disabled={loading}>
                Entrar
              </Button>
              <Button onClick={submitSignUp} variant="outline" disabled={loading}>
                Criar usuário de teste
              </Button>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-left text-xs text-blue-900">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Use o `anon key` no frontend e `service_role` apenas no backend.
                Depois de criar o usuário, o acesso ao sistema passa a usar RLS.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-xs text-muted-foreground">
              © 2024 Lumi Entregas. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
