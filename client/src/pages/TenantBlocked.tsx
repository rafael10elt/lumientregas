import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TriangleAlert, Mail } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function TenantBlocked() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-xl shadow-xl border-0 bg-white/90 backdrop-blur-sm">
        <CardContent className="py-10 text-center space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-amber-100 p-4">
              <TriangleAlert className="h-12 w-12 text-amber-600" />
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-slate-900">Acesso bloqueado</h1>
            <p className="text-slate-600 leading-relaxed">
              O seu tenant está com pagamento pendente ou suspenso. Entre em contato com o administrador do sistema para regularizar o acesso.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => window.location.href = getLoginUrl()} className="gap-2">
              <Mail className="h-4 w-4" />
              Voltar ao login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
