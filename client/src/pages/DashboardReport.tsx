import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  buildDailyTrend,
  buildDriverPerformance,
  buildPeriodLabel,
  buildStatusDistribution,
  formatDateInputValue,
  normalizeDashboardFilters,
  parseDateInputValue,
  type DashboardDelivery,
  type DashboardFilters,
} from "@/lib/dashboardAnalytics";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEffect, useMemo, useRef } from "react";
import { format } from "date-fns";

function readFiltersFromLocation(): DashboardFilters {
  const params = new URLSearchParams(window.location.search);
  const base = normalizeDashboardFilters({
    preset: (params.get("preset") as DashboardFilters["preset"] | null) ?? "today",
    startDate: params.get("startDate") ?? undefined,
    endDate: params.get("endDate") ?? undefined,
    status: (params.get("status") as DashboardFilters["status"] | null) ?? undefined,
    driverId: params.get("driverId") ?? undefined,
  });
  return base;
}

export default function DashboardReport() {
  const filters = useMemo(() => readFiltersFromLocation(), []);
  const shouldAutoPrint = useRef(new URLSearchParams(window.location.search).get("autoprint") === "1");
  const { data: deliveries = [], isLoading } = trpc.deliveries.list.useQuery(
    {
      status: filters.status === "all" ? undefined : filters.status,
      driverId: filters.driverId === "all" ? undefined : filters.driverId,
      startDate: parseDateInputValue(filters.startDate) ?? undefined,
      endDate: parseDateInputValue(filters.endDate) ?? undefined,
    },
    { refetchOnWindowFocus: false, retry: false }
  );
  const { data: drivers = [] } = trpc.drivers.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
    retry: false,
  });

  const start = parseDateInputValue(filters.startDate) ?? new Date();
  const end = parseDateInputValue(filters.endDate) ?? new Date();

  const periodLabel = buildPeriodLabel(filters);
  const statusData = useMemo(() => buildStatusDistribution(deliveries as DashboardDelivery[]), [deliveries]);
  const dailyTrend = useMemo(() => buildDailyTrend(deliveries as DashboardDelivery[], start, end), [deliveries, start, end]);
  const driverPerformance = useMemo(
    () => buildDriverPerformance(deliveries as DashboardDelivery[], drivers),
    [deliveries, drivers]
  );

  const totalDeliveries = deliveries.length;
  const completedDeliveries = deliveries.filter((delivery: any) => delivery.status === "entregue").length;
  const pendingDeliveries = deliveries.filter((delivery: any) => delivery.status === "pendente").length;
  const inRouteDeliveries = deliveries.filter((delivery: any) => delivery.status === "em_rota").length;
  const canceledDeliveries = deliveries.filter((delivery: any) => delivery.status === "cancelado").length;
  const completionRate = totalDeliveries > 0 ? ((completedDeliveries / totalDeliveries) * 100).toFixed(1) : "0.0";
  const activeDrivers = driverPerformance.filter(item => item.total > 0).length;

  useEffect(() => {
    if (!shouldAutoPrint.current || isLoading) return;

    const timer = window.setTimeout(() => {
      window.print();
    }, 800);

    shouldAutoPrint.current = false;

    return () => window.clearTimeout(timer);
  }, [isLoading]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fbff_0%,_#eef4ff_100%)] px-6 py-8 text-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 print:max-w-none">
        <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm print:shadow-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Lumi Entregas</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">Relatório operacional</h1>
              <p className="mt-2 text-sm text-slate-600">{periodLabel}</p>
            </div>
            <div className="text-right text-sm text-slate-600">
              <div>Gerado em {format(new Date(), "dd/MM/yyyy HH:mm")}</div>
              <div className="mt-1">Filtros aplicados</div>
              <div className="font-semibold text-slate-900">
                {filters.status === "all" ? "Todos os status" : filters.status} •{" "}
                {filters.driverId === "all" ? "Todos os motoristas" : "Motorista selecionado"}
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total no período</CardDescription>
              <CardTitle className="text-3xl">{totalDeliveries}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Entregues</CardDescription>
              <CardTitle className="text-3xl">{completedDeliveries}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Em rota</CardDescription>
              <CardTitle className="text-3xl">{inRouteDeliveries}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Taxa de conclusão</CardDescription>
              <CardTitle className="text-3xl">{completionRate}%</CardTitle>
            </CardHeader>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500">Pendentes</div>
              <div className="mt-1 text-2xl font-semibold text-slate-950">{pendingDeliveries}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500">Canceladas</div>
              <div className="mt-1 text-2xl font-semibold text-slate-950">{canceledDeliveries}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500">Motoristas com entregas</div>
              <div className="mt-1 text-2xl font-semibold text-slate-950">{activeDrivers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500">Filtro de período</div>
              <div className="mt-1 text-lg font-semibold text-slate-950">{periodLabel}</div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Distribuição por status</CardTitle>
              <CardDescription>Com base nos filtros selecionados</CardDescription>
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
              <CardTitle>Evolução diária</CardTitle>
              <CardDescription>Total e entregues no intervalo</CardDescription>
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
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
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
              <CardTitle>Principais motoristas</CardTitle>
              <CardDescription>Resumo do período filtrado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {driverPerformance.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  Nenhum motorista com entregas no período.
                </div>
              ) : (
                driverPerformance.slice(0, 8).map(driver => (
                  <div key={driver.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950">{driver.name}</div>
                        <div className="text-xs text-slate-500">{driver.total} entregas</div>
                      </div>
                      <div className="text-right text-xs text-slate-500">
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
        </section>

        <section className="grid gap-6 xl:grid-cols-2 print:break-inside-avoid">
          <Card>
            <CardHeader>
              <CardTitle>Entregas recentes filtradas</CardTitle>
              <CardDescription>Últimos registros dentro do recorte escolhido</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {deliveries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  Nenhuma entrega encontrada para os filtros atuais.
                </div>
              ) : (
                deliveries.slice(0, 10).map((delivery: any) => (
                  <div key={delivery.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950">{delivery.clientName}</div>
                        <div className="text-xs text-slate-500">{delivery.deliveryCode || "Sem código"}</div>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <div>{delivery.status}</div>
                        <div>{delivery.destinationAddress}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Legenda de filtros</CardTitle>
              <CardDescription>Referência do relatório exportado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div>
                <strong>Período:</strong> {periodLabel}
              </div>
              <div>
                <strong>Status:</strong> {filters.status === "all" ? "Todos" : filters.status}
              </div>
              <div>
                <strong>Motorista:</strong> {filters.driverId === "all" ? "Todos" : filters.driverId}
              </div>
              <div>
                <strong>Faixa usada:</strong> {formatDateInputValue(start)} a {formatDateInputValue(end)}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
