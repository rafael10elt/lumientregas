import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LOGIN_PATH } from "@/const";
import { supabase } from "@/lib/supabase";
import { KeyRound, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSessionReady(Boolean(data.session));
      setCheckingSession(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handleUpdatePassword = async () => {
    if (!sessionReady) {
      toast.error(
        "O link de redefinição não está ativo. Abra o e-mail novamente e clique no botão de redefinição."
      );
      return;
    }

    if (!password || password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Senha atualizada com sucesso");
    setLocation(LOGIN_PATH);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-primary/20 p-4 rounded-full">
              <KeyRound className="w-12 h-12 text-primary" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">
            Redefinir senha
          </h1>

          <p className="text-muted-foreground mb-8">
            Crie uma nova senha para acessar o Lumi Entregas.
          </p>

          <div className="space-y-4 text-left">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nova senha</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Confirmar nova senha
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button onClick={handleUpdatePassword} disabled={loading || !sessionReady}>
              {loading ? "Salvando..." : "Atualizar senha"}
            </Button>

            {!sessionReady ? (
              <p className="text-xs text-destructive">
                Não encontramos uma sessão de recuperação ativa. Abra o link do e-mail
                novamente ou peça outro link.
              </p>
            ) : null}

            <Button variant="ghost" onClick={() => setLocation(LOGIN_PATH)}>
              Voltar para o login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
