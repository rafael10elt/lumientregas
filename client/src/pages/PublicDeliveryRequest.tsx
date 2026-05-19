import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { lookupCep } from "@/lib/cep";
import { formatPhone, formatCep } from "@/lib/format";
import { openWhatsApp } from "@/lib/navigation";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircleMore,
  Search,
  ShieldAlert,
  Send,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/datetime";

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

type PublicTrackingResult = {
  deliveryCode: string;
  status: "pendente" | "em_rota" | "entregue" | "cancelado";
  destinationAddress: string;
  destinationPostalCode: string | null;
  scheduledAt: string | null;
};

const emptyForm: PublicRequestForm = {
  clientName: "",
  clientPhone: "",
  destinationPostalCode: "",
  destinationAddress: "",
  scheduledAt: "",
  notes: "",
};

const STATUS_LABELS: Record<PublicTrackingResult["status"], string> = {
  pendente: "Pendente",
  em_rota: "Em rota",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const STATUS_STYLES: Record<PublicTrackingResult["status"], string> = {
  pendente: "border-yellow-200 bg-yellow-50 text-yellow-800",
  em_rota: "border-blue-200 bg-blue-50 text-blue-800",
  entregue: "border-emerald-200 bg-emerald-50 text-emerald-800",
  cancelado: "border-rose-200 bg-rose-50 text-rose-800",
};

export default function PublicDeliveryRequest({ tenantSlug }: PublicDeliveryRequestProps) {
  const [formData, setFormData] = useState<PublicRequestForm>(emptyForm);
  const [loadingCep, setLoadingCep] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    deliveryCode: string;
  } | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingOpen, setTrackingOpen] = useState(false);

  const tenantQuery = trpc.publicPortal.tenantBySlug.useQuery(
    { slug: tenantSlug },
    { retry: false, refetchOnWindowFocus: false }
  );
  const submitMutation = trpc.publicPortal.createDeliveryRequest.useMutation();
  const trackingQuery = trpc.publicPortal.trackDeliveryByCode.useQuery(
    { slug: tenantSlug, code: trackingCode },
    {
      enabled: trackingOpen && Boolean(trackingCode),
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

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
      setSubmissionResult({ deliveryCode: response.delivery?.deliveryCode ?? "" });
      toast.success("Solicitação enviada com sucesso");
      if (!response.webhookForwarded && response.webhookError) {
        toast.warning("A solicitação foi registrada, mas houve falha ao disparar o fluxo automático");
      }
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível enviar a solicitação");
    }
  };

  const copyDeliveryCode = async (code: string) => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código copiado");
    } catch {
      toast.error("Não foi possível copiar o código");
    }
  };

  const openTracking = () => {
    const code = trackingInput.trim().toUpperCase();
    if (!code) {
      toast.error("Informe o código de entrega");
      return;
    }
    setTrackingCode(code);
    setTrackingOpen(true);
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
        <Card className="overflow-hidden border-white/10 bg-white/10 shadow-2xl backdrop-blur">
          <CardHeader className="relative">
            <div className={`mb-5 inline-flex w-fit rounded-full bg-gradient-to-r ${titleAccent} px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white`}>
              {tenant.slug}
            </div>
            <CardTitle className="text-3xl text-white">Solicitar entrega para {tenant.name}</CardTitle>
            <CardDescription className="max-w-3xl text-slate-300">
              Faça uma solicitação rápida e acompanhe depois com o código gerado.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Contato</div>
              <div className="mt-2 text-lg font-semibold text-white">
                {tenant.contactName || "Contato comercial"}
              </div>
              <div className="mt-2 flex flex-col gap-2 text-sm text-slate-300">
                {tenant.contactPhone ? <span>{tenant.contactPhone}</span> : <span>Telefone não informado</span>}
                {tenant.contactEmail ? <span>{tenant.contactEmail}</span> : <span>E-mail não informado</span>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {tenant.contactPhone ? (
                  <Button asChild variant="secondary" size="sm" className="gap-2">
                    <a href={`tel:${tenant.contactPhone.replace(/\D/g, "")}`}>
                      <Truck className="h-4 w-4" />
                      Ligar
                    </a>
                  </Button>
                ) : null}
                {tenant.contactPhone ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-white/20 text-white hover:bg-white/10"
                    onClick={() =>
                      openWhatsApp(
                        tenant.contactPhone ?? "",
                        `Olá ${tenant.contactName || tenant.name}, gostaria de solicitar uma entrega.`
                      )
                    }
                  >
                    <MessageCircleMore className="h-4 w-4" />
                    WhatsApp
                  </Button>
                ) : null}
                {tenant.contactEmail ? (
                  <Button asChild variant="outline" size="sm" className="gap-2 border-white/20 text-white hover:bg-white/10">
                    <a href={`mailto:${tenant.contactEmail}`}>
                      <ExternalLink className="h-4 w-4" />
                      E-mail
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Solicitação</div>
              <div className="mt-2 text-sm text-slate-300">
                Preencha os dados abaixo. O sistema gera um código de entrega ao final.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Rastrear entrega</div>
              <div className="mt-2 text-sm text-slate-300">
                Use o código de entrega para acompanhar o status.
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

        <div className="grid gap-6 lg:grid-cols-[1.4fr,0.9fr]">
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
                  A solicitação será criada com status pendente, aguardando a aprovação.
                </div>
                <Button onClick={submitRequest} disabled={statusIsBlocked || submitMutation.isPending} className="gap-2">
                  {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Enviar solicitação
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-white/10 bg-white/10 text-white shadow-2xl backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Código da entrega</CardTitle>
                <CardDescription className="text-slate-300">
                  Após enviar, o código aparece aqui para copiar e acompanhar depois.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submissionResult?.deliveryCode ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Novo código</div>
                    <div className="mt-2 text-2xl font-bold text-white">{submissionResult.deliveryCode}</div>
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="secondary"
                        className="gap-2"
                        onClick={() => copyDeliveryCode(submissionResult.deliveryCode)}
                      >
                        <Copy className="h-4 w-4" />
                        Copiar código
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/20 p-4 text-sm text-slate-300">
                    Nenhuma solicitação enviada ainda.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/10 text-white shadow-2xl backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Rastrear por código</CardTitle>
                <CardDescription className="text-slate-300">
                  Informe o código para ver apenas as informações da entrega.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-slate-200">Código de rastreio</Label>
                  <Input
                    placeholder="DEL-ABC123"
                    value={trackingInput}
                    onChange={e => setTrackingInput(e.target.value.toUpperCase())}
                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                  />
                </div>
                <Button onClick={openTracking} className="w-full gap-2">
                  <Search className="h-4 w-4" />
                  Consultar Entrega
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={trackingOpen} onOpenChange={setTrackingOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Rastreio da entrega</DialogTitle>
            <DialogDescription>
              
            </DialogDescription>
          </DialogHeader>

          {trackingQuery.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : trackingQuery.data ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={STATUS_STYLES[trackingQuery.data.status] ?? ""}>
                  {STATUS_LABELS[trackingQuery.data.status] ?? trackingQuery.data.status}
                </Badge>
                <Badge variant="secondary">{trackingQuery.data.deliveryCode}</Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Destino</div>
                  <div className="mt-1 text-sm font-medium">{trackingQuery.data.destinationAddress}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {trackingQuery.data.destinationPostalCode || "Sem CEP"}
                  </div>
                </div>
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Agendamento</div>
                  <div className="mt-1 text-sm font-medium">
                    {trackingQuery.data.scheduledAt ? formatDateTime(trackingQuery.data.scheduledAt) : "Sem agendamento"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              Nenhuma entrega encontrada para este código.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
