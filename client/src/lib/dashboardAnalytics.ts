import { addDays, endOfDay, endOfMonth, endOfWeek, endOfYear, format, isAfter, isBefore, startOfDay, startOfMonth, startOfWeek, startOfYear } from "date-fns";

export const DELIVERY_STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "pendente", label: "Pendente" },
  { value: "em_rota", label: "Em rota" },
  { value: "entregue", label: "Entregue" },
  { value: "cancelado", label: "Cancelado" },
] as const;

export type DashboardPreset = "today" | "week" | "month" | "year" | "custom";
export type DeliveryStatusFilter = "all" | "pendente" | "em_rota" | "entregue" | "cancelado";

export type DashboardFilters = {
  preset: DashboardPreset;
  startDate: string;
  endDate: string;
  status: DeliveryStatusFilter;
  driverId: string;
};

export type DashboardDelivery = {
  id: string;
  clientName?: string | null;
  deliveryCode?: string | null;
  status: string;
  driverId?: string | null;
  createdAt?: string | Date | null;
  scheduledAt?: string | Date | null;
  destinationAddress?: string | null;
};

export type DashboardDriver = {
  id: string;
  name: string;
};

export type DashboardDailyPoint = {
  day: string;
  total: number;
  completed: number;
  pending: number;
};

export type DashboardStatusPoint = {
  name: string;
  value: number;
  fill: string;
};

export type DashboardDriverPoint = {
  id: string;
  name: string;
  total: number;
  completed: number;
  pending: number;
  inRoute: number;
};

export function getPresetRange(preset: DashboardPreset, baseDate = new Date()) {
  switch (preset) {
    case "today": {
      return {
        startDate: startOfDay(baseDate),
        endDate: endOfDay(baseDate),
      };
    }
    case "week": {
      return {
        startDate: startOfWeek(baseDate, { weekStartsOn: 1 }),
        endDate: endOfWeek(baseDate, { weekStartsOn: 1 }),
      };
    }
    case "month": {
      return {
        startDate: startOfMonth(baseDate),
        endDate: endOfMonth(baseDate),
      };
    }
    case "year": {
      return {
        startDate: startOfYear(baseDate),
        endDate: endOfYear(baseDate),
      };
    }
    default: {
      return {
        startDate: startOfDay(baseDate),
        endDate: endOfDay(baseDate),
      };
    }
  }
}

export function formatDateInputValue(value: Date) {
  return format(value, "yyyy-MM-dd");
}

export function parseDateInputValue(value: string) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function asDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinRange(value: string | Date | null | undefined, startDate: Date, endDate: Date) {
  const date = asDate(value);
  if (!date) return false;
  return !isBefore(date, startDate) && !isAfter(date, endDate);
}

export function filterDeliveries(deliveries: DashboardDelivery[], filters: DashboardFilters) {
  const start = parseDateInputValue(filters.startDate) ?? startOfDay(new Date());
  const end = parseDateInputValue(filters.endDate) ?? endOfDay(new Date());

  return deliveries.filter(delivery => {
    if (filters.status !== "all" && delivery.status !== filters.status) return false;
    if (filters.driverId !== "all" && String(delivery.driverId ?? "") !== String(filters.driverId)) return false;
    return isWithinRange(delivery.scheduledAt ?? delivery.createdAt ?? null, start, end);
  });
}

export function buildDailyTrend(deliveries: DashboardDelivery[], startDate: Date, endDate: Date): DashboardDailyPoint[] {
  const points: DashboardDailyPoint[] = [];
  const cursor = startOfDay(startDate);
  const finalDay = endOfDay(endDate);

  while (!isAfter(cursor, finalDay)) {
    points.push({
      day: format(cursor, "dd/MM"),
      total: 0,
      completed: 0,
      pending: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const delivery of deliveries) {
    const date = asDate(delivery.scheduledAt ?? delivery.createdAt ?? null);
    if (!date || isBefore(date, startDate) || isAfter(date, endDate)) continue;

    const index = points.findIndex(point => point.day === format(date, "dd/MM"));
    if (index < 0) continue;

    points[index].total += 1;
    if (delivery.status === "entregue") points[index].completed += 1;
    if (delivery.status === "pendente") points[index].pending += 1;
  }

  return points;
}

export function buildStatusDistribution(deliveries: DashboardDelivery[]): DashboardStatusPoint[] {
  const counts = deliveries.reduce(
    (acc, delivery) => {
      acc[delivery.status] = (acc[delivery.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return [
    { name: "Entregue", value: counts.entregue ?? 0, fill: "#10b981" },
    { name: "Em rota", value: counts.em_rota ?? 0, fill: "#3b82f6" },
    { name: "Pendente", value: counts.pendente ?? 0, fill: "#f59e0b" },
    { name: "Cancelado", value: counts.cancelado ?? 0, fill: "#ef4444" },
  ];
}

export function buildDriverPerformance(deliveries: DashboardDelivery[], drivers: DashboardDriver[]) {
  return drivers
    .map(driver => {
      const driverDeliveries = deliveries.filter(delivery => String(delivery.driverId ?? "") === String(driver.id));
      return {
        id: driver.id,
        name: driver.name,
        total: driverDeliveries.length,
        completed: driverDeliveries.filter(delivery => delivery.status === "entregue").length,
        pending: driverDeliveries.filter(delivery => delivery.status === "pendente").length,
        inRoute: driverDeliveries.filter(delivery => delivery.status === "em_rota").length,
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

export function buildPeriodLabel(filters: DashboardFilters) {
  const start = parseDateInputValue(filters.startDate);
  const end = parseDateInputValue(filters.endDate);
  if (!start || !end) return "Período atual";

  const startLabel = format(start, "dd/MM/yyyy");
  const endLabel = format(end, "dd/MM/yyyy");
  return `${startLabel} até ${endLabel}`;
}

export function buildReportFilename(filters: DashboardFilters) {
  const start = filters.startDate.replaceAll("-", "");
  const end = filters.endDate.replaceAll("-", "");
  return `lumi-relatorio-${start}-${end}.pdf`;
}

export function normalizeDashboardFilters(filters: Partial<DashboardFilters> = {}): DashboardFilters {
  const { startDate, endDate } = getPresetRange(filters.preset ?? "today");
  return {
    preset: filters.preset ?? "today",
    startDate: filters.startDate || formatDateInputValue(startDate),
    endDate: filters.endDate || formatDateInputValue(endDate),
    status: filters.status ?? "all",
    driverId: filters.driverId ?? "all",
  };
}
