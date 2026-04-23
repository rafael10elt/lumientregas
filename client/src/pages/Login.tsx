import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RESET_PASSWORD_PATH } from "@/const";
import { BrandMark } from "@/components/BrandMark";
import { supabase } from "@/lib/supabase";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submitSignIn = async () => {
    if (!email || !password) {
      toast.error("Informe e-mail e senha");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Login realizado com sucesso");
    setLocation("/");
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

    toast.success(
      "Conta criada. Se o projeto exigir confirmação por e-mail, conclua a validação antes de entrar."
    );
  };

  const submitPasswordReset = async () => {
    if (!email) {
      toast.error("Informe seu e-mail para receber o link de redefinição");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${RESET_PASSWORD_PATH}`,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Enviamos um link de redefinição para o seu e-mail.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <BrandMark size="lg" showText={false} />
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">
            Lumi Entregas
          </h1>

          <p className="text-muted-foreground mb-8">
            Sistema de Gestão de Entregas e Roteirização Inteligente
          </p>

          <div className="space-y-4 text-left">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                E-mail
              </label>
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
              <Button
                onClick={submitPasswordReset}
                variant="ghost"
                disabled={loading}
              >
                Esqueci minha senha
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
