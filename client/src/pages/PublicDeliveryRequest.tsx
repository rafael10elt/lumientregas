import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { lookupCep } from "@/lib/cep";
import { formatPhone, formatCep } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Loader2, Search, ShieldAlert, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type PublicDeliveryRequestProps = {
  tenantSlug: string;
};

type PublicRequestForm = {
  clientName: string;
  clientPhone: string;
  destinationPostalCode: string;
  destinationAddress: string;
  scheduledAt: string;
  notes: string;
};

const emptyForm: PublicRequestForm = {
  clientName: "",
  clientPhone: "",
  destinationPostalCode: "",
  destinationAddress: "",
  scheduledAt: "",
  notes: "",
};

export default function PublicDeliveryRequest({ tenantSlug }: PublicDeliveryRequestProps) {
  const [formData, setFormData] = useState<PublicRequestForm>(emptyForm);
  const [loadingCep, setLoadingCep] = useState(false);

  const tenantQuery = trpc.publicPortal.tenantBySlug.useQuery(
    { slug: tenantSlug },
    { retry: false, refetchOnWindowFocus: false }
  );
  const submitMutation = trpc.publicPortal.createDeliveryRequest.useMutation();

  const tenant = tenantQuery.data ?? null;
  const statusIsBlocked = Boolean(
    tenant && (tenant.status !== "active" || tenant.paymentStatus !== "ok")
  );

  const titleAccent = useMemo(() => {
    const palette = [
      "from-sky-500 to-cyan-500",
      "from-amber-500 to-orange-500",
      "from-emerald-500 to-teal-500",
      "from-rose-500 to-pink-500",
      "from-violet-500 to-fuchsia-500",
    ];
    const index = [...tenantSlug].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return palette[index % palette.length];
  }, [tenantSlug]);

  const fillDestinationCep = async () => {
    if (!formData.destinationPostalCode) {
      toast.error("Informe o CEP de destino");
      return;
    }

    setLoadingCep(true);
    try {
      const result = await lookupCep(formData.destinationPostalCode);
      setFormData(prev => ({
        ...prev,
        destinationPostalCode: result.cep,
        destinationAddress: result.fullAddress,
      }));
      toast.success("CEP localizado com sucesso");
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível consultar o CEP");
    } finally {
      setLoadingCep(false);
    }
  };

  const submitRequest = async () => {
    if (!tenant) return;
    if (statusIsBlocked) {
      toast.error("Este tenant está temporariamente bloqueado");
      return;
    }

    if (!formData.clientName || !formData.clientPhone || !formData.destinationAddress) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    try {
      const response = await submitMutation.mutateAsync({
        tenantSlug,
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        destinationPostalCode: formData.destinationPostalCode || undefined,
        destinationAddress: formData.destinationAddress,
        scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : undefined,
        notes: formData.notes || undefined,
      });

      setFormData(emptyForm);
      toast.success("Solicitação enviada com sucesso");
      if (!response.webhookForwarded && response.webhookError) {
        toast.warning("A solicitação foi registrada, mas houve falha ao disparar o fluxo automático");
      }
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível enviar a solicitação");
    }
  };

  if (tenantQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
        <Card className="w-full max-w-xl border-white/10 bg-white/5 text-white shadow-2xl backdrop-blur">
          <CardHeader>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <ShieldAlert className="h-6 w-6 text-amber-300" />
            </div>
            <CardTitle>Tenant não encontrado</CardTitle>
            <CardDescription className="text-slate-300">
              Verifique se o link da solicitação está correto.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_36%),linear-gradient(180deg,_#08111f_0%,_#0f172a_48%,_#0b1220_100%)] px-4 py-8 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Card className={`overflow-hidden border-white/10 bg-white/10 shadow-2xl backdrop-blur ${statusIsBlocked ? "opacity-90" : ""}`}>
          <CardHeader className="relative">
            <div className={`mb-5 inline-flex w-fit rounded-full bg-gradient-to-r ${titleAccent} px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white`}>
              {tenant.slug}
            </div>
            <CardTitle className="text-3xl text-white">Solicitar entrega para {tenant.name}</CardTitle>
            <CardDescription className="max-w-3xl text-slate-300">
              {tenant.contactName
                ? `Fale com ${tenant.contactName} e envie a solicitação de entrega sem entrar no sistema.`
                : "Envie uma solicitação de entrega sem entrar no sistema."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Contato</div>
              <div className="mt-2 text-lg font-semibold text-white">{tenant.contactName || "Sem contato cadastrado"}</div>
              <div className="text-sm text-slate-300">{tenant.contactEmail || "E-mail não informado"}</div>
              <div className="text-sm text-slate-300">{tenant.contactPhone || "Telefone não informado"}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Status do tenant</div>
              <div className="mt-2 text-lg font-semibold text-white">
                {tenant.status === "active" ? "Ativo" : "Bloqueado"}
              </div>
              <div className="text-sm text-slate-300">
                Pagamento: {tenant.paymentStatus === "ok" ? "Em dia" : tenant.paymentStatus}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Base operacional</div>
              <div className="mt-2 text-sm text-slate-300">
                A origem será puxada automaticamente da base principal do tenant.
              </div>
            </div>
          </CardContent>
        </Card>

        {statusIsBlocked ? (
          <Card className="border-rose-200/20 bg-rose-500/10 text-white shadow-2xl backdrop-blur">
            <CardHeader>
              <CardTitle>Solicitações indisponíveis no momento</CardTitle>
              <CardDescription className="text-rose-100">
                {tenant.status !== "active"
                  ? "Este tenant está suspenso."
                  : "Este tenant está com pendência financeira e não pode receber novas solicitações."}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <Card className="border-white/10 bg-white shadow-2xl">
          <CardHeader>
            <CardTitle className="text-slate-900">Nova solicitação de entrega</CardTitle>
            <CardDescription>
              Preencha os dados abaixo e o sistema irá registrar a solicitação e disparar o fluxo automático.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Cliente *</Label>
                <Input
                  placeholder="Nome de quem está solicitando"
                  value={formData.clientName}
                  onChange={e => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input
                  placeholder="(81) 99999-9999"
                  value={formData.clientPhone}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, clientPhone: formatPhone(e.target.value) }))
                  }
                  inputMode="tel"
                />
              </div>

              <div className="space-y-2">
                <Label>Data/Hora desejada</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={e => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>CEP de destino</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="00000-000"
                    value={formData.destinationPostalCode}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        destinationPostalCode: formatCep(e.target.value),
                      }))
                    }
                    inputMode="numeric"
                  />
                  <Button type="button" variant="outline" onClick={fillDestinationCep} disabled={loadingCep}>
                    <Search className="mr-2 h-4 w-4" />
                    Consultar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Endereço de destino *</Label>
                <Input
                  placeholder="Rua, número, bairro"
                  value={formData.destinationAddress}
                  onChange={e => setFormData(prev => ({ ...prev, destinationAddress: e.target.value }))}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Detalhes adicionais da coleta ou entrega..."
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                A solicitação será criada com status pendente e enviada ao fluxo do n8n.
              </div>
              <Button onClick={submitRequest} disabled={statusIsBlocked || submitMutation.isPending} className="gap-2">
                {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar solicitação
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
