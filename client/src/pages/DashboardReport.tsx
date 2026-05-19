import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateDashboardReportPdf } from "@/lib/dashboardPdf";
import { trpc } from "@/lib/trpc";
import { normalizeDashboardFilters, parseDateInputValue, type DashboardFilters } from "@/lib/dashboardAnalytics";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

function readFiltersFromLocation(): DashboardFilters {
  const params = new URLSearchParams(window.location.search);
  return normalizeDashboardFilters({
    preset: (params.get("preset") as DashboardFilters["preset"] | null) ?? "today",
    startDate: params.get("startDate") ?? undefined,
    endDate: params.get("endDate") ?? undefined,
    status: (params.get("status") as DashboardFilters["status"] | null) ?? undefined,
    driverId: params.get("driverId") ?? undefined,
  });
}

export default function DashboardReport() {
  const filters = useMemo(() => readFiltersFromLocation(), []);
  const [generated, setGenerated] = useState(false);
  const generationAttemptedRef = useRef(false);

  const { data: deliveries = [], isLoading: deliveriesLoading } = trpc.deliveries.list.useQuery(
    {
      status: filters.status === "all" ? undefined : filters.status,
      driverId: filters.driverId === "all" ? undefined : filters.driverId,
      startDate: parseDateInputValue(filters.startDate) ?? undefined,
      endDate: parseDateInputValue(filters.endDate) ?? undefined,
    },
    { refetchOnWindowFocus: false, retry: false }
  );
  const { data: drivers = [], isLoading: driversLoading } = trpc.drivers.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (generationAttemptedRef.current) return;
    if (deliveriesLoading || driversLoading) return;

    generationAttemptedRef.current = true;
    void generateDashboardReportPdf({
      deliveries,
      drivers,
      filters,
    }).then(() => setGenerated(true));
  }, [deliveries, drivers, deliveriesLoading, driversLoading, filters]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <CardTitle>Gerando relatório PDF</CardTitle>
          <CardDescription>
            O arquivo está sendo preparado com os filtros escolhidos. Se o download não iniciar automaticamente, use
            a função de salvar do navegador.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {generated ? "Download iniciado com sucesso." : "Aguarde alguns segundos enquanto montamos o arquivo."}
        </CardContent>
      </Card>
    </div>
  );
}
