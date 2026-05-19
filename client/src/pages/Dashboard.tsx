import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { generateDashboardReportPdf } from "@/lib/dashboardPdf";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock, Download, Package2, RefreshCw, Truck, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  buildDailyTrend,
  buildDriverPerformance,
  buildPeriodLabel,
  buildStatusDistribution,
  DELIVERY_STATUS_OPTIONS,
  formatDateInputValue,
  getPresetRange,
  normalizeDashboardFilters,
  parseDateInputValue,
  type DashboardFilters,
} from "@/lib/dashboardAnalytics";

const presetButtons: Array<{ key: DashboardFilters["preset"]; label: string }> = [
  { key: "today", label: "Hoje" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
  { key: "year", label: "Ano" },
];

export default function Dashboard() {
  const [filters, setFilters] = useState<DashboardFilters>(() => normalizeDashboardFilters());
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { tenant } = useAuth();
  const { data: drivers = [] } = trpc.drivers.list.useQuery();

  const queryInput = useMemo(() => {
    return {
      status: filters.status === "all" ? undefined : filters.status,
      driverId: filters.driverId === "all" ? undefined : filters.driverId,
      startDate: parseDateInputValue(filters.startDate) ?? undefined,
      endDate: parseDateInputValue(filters.endDate) ?? undefined,
    };
  }, [filters]);

  const { data: deliveries = [], refetch, isFetching } = trpc.deliveries.list.useQuery(queryInput);

  const startDate = parseDateInputValue(filters.startDate) ?? new Date();
  const endDate = parseDateInputValue(filters.endDate) ?? new Date();

  const totalDeliveries = deliveries.length;
  const completedDeliveries = deliveries.filter((delivery: any) => delivery.status === "entregue").length;
  const pendingDeliveries = deliveries.filter((delivery: any) => delivery.status === "pendente").length;
  const inRouteDeliveries = deliveries.filter((delivery: any) => delivery.status === "em_rota").length;
  const canceledDeliveries = deliveries.filter((delivery: any) => delivery.status === "cancelado").length;
  const completionRate = totalDeliveries > 0 ? ((completedDeliveries / totalDeliveries) * 100).toFixed(1) : "0.0";

  const periodLabel = buildPeriodLabel(filters);
  const statusData = useMemo(() => buildStatusDistribution(deliveries), [deliveries]);
  const dailyTrend = useMemo(() => buildDailyTrend(deliveries, startDate, endDate), [deliveries, startDate, endDate]);
  const driverPerformance = useMemo(() => buildDriverPerformance(deliveries, drivers), [deliveries, drivers]);
  const activeDrivers = driverPerformance.filter(driver => driver.total > 0).length;

  const setPreset = (preset: DashboardFilters["preset"]) => {
    const range = getPresetRange(preset);
    setFilters(prev => ({
      ...prev,
      preset,
      startDate: formatDateInputValue(range.startDate),
      endDate: formatDateInputValue(range.endDate),
    }));
  };

  const exportPdfReport = async () => {
    if (isGeneratingPdf) return;

    setIsGeneratingPdf(true);
    try {
      await generateDashboardReportPdf({
        deliveries,
        drivers,
        filters,
        tenantName: tenant?.name ?? null,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,_rgba(37,99,235,0.08),_rgba(14,165,233,0.05),_rgba(255,255,255,0.94))] p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Dashboard unificado
            </div>
            <h1 className="mt-3 text-3xl font-bold text-foreground">Dashboard e Analytics em um só lugar</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Acompanhe entregas, motoristas, status e tendências em tempo real, com filtros por período e exportação
              profissional em PDF.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar dados
            </Button>
            <Button onClick={exportPdfReport} className="gap-2" disabled={isGeneratingPdf}>
              <Download className={`h-4 w-4 ${isGeneratingPdf ? "animate-pulse" : ""}`} />
              {isGeneratingPdf ? "Gerando PDF..." : "Baixar relatório PDF"}
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle>Filtros do painel</CardTitle>
          <CardDescription>Selecione um período e refine os resultados por status e motorista.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {presetButtons.map(button => (
              <Button
                key={button.key}
                variant={filters.preset === button.key ? "default" : "outline"}
                onClick={() => setPreset(button.key)}
              >
                {button.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="dashboard-start-date">Data inicial</Label>
              <Input
                id="dashboard-start-date"
                type="date"
                value={filters.startDate}
                onChange={event =>
                  setFilters(prev => ({
                    ...prev,
                    preset: "custom",
                    startDate: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dashboard-end-date">Data final</Label>
              <Input
                id="dashboard-end-date"
                type="date"
                value={filters.endDate}
                onChange={event =>
                  setFilters(prev => ({
                    ...prev,
                    preset: "custom",
                    endDate: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Status das entregas</Label>
              <Select
                value={filters.status}
                onValueChange={value =>
                  setFilters(prev => ({
                    ...prev,
                    status: value as DashboardFilters["status"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motorista</Label>
              <Select
                value={filters.driverId}
                onValueChange={value =>
                  setFilters(prev => ({
                    ...prev,
                    driverId: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os motoristas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os motoristas</SelectItem>
                  {drivers.map((driver: any) => (
                    <SelectItem key={driver.id} value={String(driver.id)}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Período atual: <span className="font-medium text-foreground">{periodLabel}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de entregas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-foreground">{totalDeliveries}</div>
              <Package2 className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-foreground">{pendingDeliveries}</div>
              <Clock className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em rota</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-foreground">{inRouteDeliveries}</div>
              <Truck className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de conclusão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-foreground">{completionRate}%</div>
              <TrendingUp className="h-8 w-8 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Entregues</div>
            <div className="mt-1 text-2xl font-semibold">{completedDeliveries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Canceladas</div>
            <div className="mt-1 text-2xl font-semibold">{canceledDeliveries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Motoristas com entregas</div>
            <div className="mt-1 text-2xl font-semibold">{activeDrivers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Período selecionado</div>
            <div className="mt-1 text-sm font-semibold">{periodLabel}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Distribuição por status</CardTitle>
            <CardDescription>Visão consolidada com os filtros escolhidos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={statusData} dataKey="value" cx="50%" cy="50%" outerRadius={110} label>
                  {statusData.map((entry, index) => (
                    <Cell key={`status-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Evolução por dia</CardTitle>
            <CardDescription>Total e entregues no período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} name="Total" />
                <Line type="monotone" dataKey="completed" stroke="#16a34a" strokeWidth={3} name="Entregues" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Desempenho por motorista</CardTitle>
            <CardDescription>Total, entregues, pendentes e em rota</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={driverPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#2563eb" name="Total" />
                <Bar dataKey="completed" fill="#16a34a" name="Entregues" />
                <Bar dataKey="pending" fill="#f59e0b" name="Pendentes" />
                <Bar dataKey="inRoute" fill="#3b82f6" name="Em rota" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top motoristas</CardTitle>
            <CardDescription>Resumo do período selecionado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {driverPerformance.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhum motorista com entregas no período.
              </div>
            ) : (
              driverPerformance.slice(0, 8).map(driver => (
                <div key={driver.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-foreground">{driver.name}</div>
                      <div className="text-xs text-muted-foreground">{driver.total} entregas</div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>Entregues: {driver.completed}</div>
                      <div>Pendentes: {driver.pending}</div>
                      <div>Em rota: {driver.inRoute}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
