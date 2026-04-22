import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Package2, ShieldAlert } from "lucide-react";

export default function Login() {
  const hasExternalLogin = Boolean(
    import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID
  );

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

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Faça login para acessar o painel de controle
            </p>

            <Button
              onClick={() => {
                window.location.href = getLoginUrl();
              }}
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={!hasExternalLogin}
            >
              {hasExternalLogin ? "Fazer Login" : "Login indisponível"}
            </Button>

            {!hasExternalLogin ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs text-amber-900">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Configure `VITE_OAUTH_PORTAL_URL` e `VITE_APP_ID` no Netlify
                  para habilitar o login externo.
                </p>
              </div>
            ) : null}
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
