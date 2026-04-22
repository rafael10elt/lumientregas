import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, Users, Zap } from "lucide-react";

export default function Analytics() {
  const { data: deliveries = [] } = trpc.deliveries.list.useQuery();
  const { data: drivers = [] } = trpc.drivers.list.useQuery();

  // Calculate metrics
  const totalDeliveries = deliveries.length;
  const completedDeliveries = deliveries.filter((d: any) => d.status === "entregue").length;
  const pendingDeliveries = deliveries.filter((d: any) => d.status === "pendente").length;
  const inRouteDeliveries = deliveries.filter((d: any) => d.status === "em_rota").length;
  const canceledDeliveries = deliveries.filter((d: any) => d.status === "cancelado").length;

  const completionRate = totalDeliveries > 0 ? ((completedDeliveries / totalDeliveries) * 100).toFixed(1) : 0;
  const avgDeliveryTime = 2.5;

  // Data for charts
  const statusData = [
    { name: "Entregue", value: completedDeliveries, fill: "#10b981" },
    { name: "Em Rota", value: inRouteDeliveries, fill: "#3b82f6" },
    { name: "Pendente", value: pendingDeliveries, fill: "#f59e0b" },
    { name: "Cancelado", value: canceledDeliveries, fill: "#ef4444" },
  ];

  const deliveriesByDriver = drivers.map((driver: any) => ({
    name: driver.name,
    entregas: deliveries.filter((d: any) => d.driverId === driver.id).length,
    entregues: deliveries.filter((d: any) => d.driverId === driver.id && d.status === "entregue").length,
  }));

  const weeklyData = [
    { day: "Seg", entregas: 12, entregues: 10 },
    { day: "Ter", entregas: 15, entregues: 14 },
    { day: "Qua", entregas: 18, entregues: 16 },
    { day: "Qui", entregas: 14, entregues: 12 },
    { day: "Sex", entregas: 20, entregues: 18 },
    { day: "Sab", entregas: 8, entregues: 8 },
    { day: "Dom", entregas: 5, entregues: 5 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">Dashboard de desempenho e métricas</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Conclusão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-foreground">{completionRate}%</div>
              <TrendingUp className="w-8 h-8 text-green-500/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{completedDeliveries} de {totalDeliveries} entregas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tempo Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-foreground">{avgDeliveryTime}h</div>
              <Zap className="w-8 h-8 text-accent/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Tempo médio por entrega</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Motoristas Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-foreground">{drivers.length}</div>
              <Users className="w-8 h-8 text-primary/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Motoristas cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-foreground">{pendingDeliveries}</div>
              <TrendingDown className="w-8 h-8 text-yellow-500/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Entregas aguardando</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Proporção de entregas por status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Entregas por Semana</CardTitle>
            <CardDescription>Tendência de entregas realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="entregas"
                  stroke="var(--primary)"
                  name="Total"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="entregues"
                  stroke="var(--accent)"
                  name="Entregues"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Deliveries by Driver */}
      <Card>
        <CardHeader>
          <CardTitle>Entregas por Motorista</CardTitle>
          <CardDescription>Desempenho individual de cada motorista</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deliveriesByDriver}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip />
              <Legend />
              <Bar dataKey="entregas" fill="var(--primary)" name="Total" />
              <Bar dataKey="entregues" fill="var(--accent)" name="Entregues" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
