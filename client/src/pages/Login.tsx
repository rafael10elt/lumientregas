import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Package2 } from "lucide-react";

export default function Login() {
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
              onClick={() => window.location.href = getLoginUrl()}
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Fazer Login
            </Button>
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
