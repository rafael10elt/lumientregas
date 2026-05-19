import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import {
  buildDailyTrend,
  buildDriverPerformance,
  buildPeriodLabel,
  buildReportFilename,
  buildStatusDistribution,
  type DashboardDelivery,
  type DashboardDriver,
  type DashboardFilters,
} from "./dashboardAnalytics";

type GenerateDashboardPdfParams = {
  deliveries: DashboardDelivery[];
  drivers: DashboardDriver[];
  filters: DashboardFilters;
};

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3 ? normalized.split("").map(char => char + char).join("") : normalized;
  const parsed = Number.parseInt(value, 16);
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

function applyHexFill(doc: jsPDF, hex: string) {
  const { r, g, b } = hexToRgb(hex);
  doc.setFillColor(r, g, b);
}

function applyHexStroke(doc: jsPDF, hex: string) {
  const { r, g, b } = hexToRgb(hex);
  doc.setDrawColor(r, g, b);
}

function drawLogo(doc: jsPDF, x: number, y: number) {
  applyHexFill(doc, "#1d4ed8");
  doc.circle(x + 8, y + 8, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("LE", x + 5.3, y + 11);
  doc.setTextColor(15, 23, 42);
}

function drawHeader(doc: jsPDF, filters: DashboardFilters) {
  const pageWidth = doc.internal.pageSize.getWidth();
  applyHexFill(doc, "#0f172a");
  doc.roundedRect(10, 10, pageWidth - 20, 24, 4, 4, "F");

  drawLogo(doc, 14, 14);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Lumi Entregas", 30, 19);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório executivo de desempenho", 30, 25);

  doc.setFontSize(9);
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth - 80, 18, { align: "left" });
  doc.text(buildPeriodLabel(filters), pageWidth - 80, 24, { align: "left" });
  doc.setTextColor(15, 23, 42);
}

function drawMetricCard(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string, accent: string) {
  applyHexFill(doc, "#ffffff");
  applyHexStroke(doc, "#dbe3f0");
  doc.roundedRect(x, y, w, h, 3, 3, "FD");

  applyHexFill(doc, accent);
  doc.roundedRect(x, y, 2.6, h, 2, 2, "F");

  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(label, x + 6, y + 7);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(value, x + 6, y + 16);
}

function drawHorizontalBars(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  series: Array<{ label: string; value: number; color: string }>
) {
  applyHexFill(doc, "#ffffff");
  applyHexStroke(doc, "#dbe3f0");
  doc.roundedRect(x, y, w, h, 3, 3, "FD");

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(title, x + 5, y + 7);

  if (series.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("Sem dados no período.", x + 5, y + h / 2);
    return;
  }

  const maxValue = Math.max(1, ...series.map(item => item.value));
  const barAreaWidth = w - 34;
  const rowHeight = Math.min(7, (h - 14) / series.length);
  const startY = y + 12;

  series.forEach((item, index) => {
    const rowY = startY + index * rowHeight;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(item.label, x + 5, rowY + 4);

    applyHexFill(doc, "#e2e8f0");
    doc.roundedRect(x + 24, rowY + 1, barAreaWidth, 3.2, 1.2, 1.2, "F");

    const filled = (item.value / maxValue) * barAreaWidth;
    if (filled > 0) {
      applyHexFill(doc, item.color);
      doc.roundedRect(x + 24, rowY + 1, filled, 3.2, 1.2, 1.2, "F");
    }

    doc.setTextColor(15, 23, 42);
    doc.text(String(item.value), x + w - 8, rowY + 4, { align: "right" });
  });
}

function drawTrendChart(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  points: Array<{ label: string; total: number; completed: number }>
) {
  applyHexFill(doc, "#ffffff");
  applyHexStroke(doc, "#dbe3f0");
  doc.roundedRect(x, y, w, h, 3, 3, "FD");

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(title, x + 5, y + 7);

  if (points.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("Sem dados no período.", x + 5, y + h / 2);
    return;
  }

  const chartX = x + 10;
  const chartY = y + 12;
  const chartW = w - 16;
  const chartH = h - 18;
  const maxValue = Math.max(1, ...points.flatMap(point => [point.total, point.completed]));

  applyHexStroke(doc, "#cbd5e1");
  doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH);
  doc.line(chartX, chartY, chartX, chartY + chartH);

  const scaleX = points.length > 1 ? chartW / (points.length - 1) : chartW;
  const scaleY = chartH / maxValue;

  const totalLine: Array<[number, number]> = [];
  const completedLine: Array<[number, number]> = [];

  points.forEach((point, index) => {
    const px = chartX + index * scaleX;
    totalLine.push([px, chartY + chartH - point.total * scaleY]);
    completedLine.push([px, chartY + chartH - point.completed * scaleY]);

    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    if (index === 0 || index === points.length - 1 || index % 3 === 0) {
      doc.text(point.label, px, chartY + chartH + 4, { align: "center" });
    }
  });

  const drawPolyline = (linePoints: Array<[number, number]>, color: string) => {
    applyHexStroke(doc, color);
    doc.setLineWidth(0.6);
    for (let index = 0; index < linePoints.length - 1; index += 1) {
      const [x1, y1] = linePoints[index];
      const [x2, y2] = linePoints[index + 1];
      doc.line(x1, y1, x2, y2);
    }
    linePoints.forEach(([lx, ly]) => {
      applyHexFill(doc, color);
      doc.circle(lx, ly, 0.8, "F");
    });
  };

  drawPolyline(totalLine, "#2563eb");
  drawPolyline(completedLine, "#16a34a");

  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text("Total", x + 6, y + h - 4);
  applyHexFill(doc, "#2563eb");
  doc.rect(x + 20, y + h - 6.6, 4, 2, "F");
  doc.text("Entregues", x + 28, y + h - 4);
  applyHexFill(doc, "#16a34a");
  doc.rect(x + 48, y + h - 6.6, 4, 2, "F");
}

function drawSummaryChips(doc: jsPDF, x: number, y: number, filters: DashboardFilters) {
  const chips = [
    `Status: ${filters.status === "all" ? "Todos" : filters.status}`,
    `Motorista: ${filters.driverId === "all" ? "Todos" : filters.driverId}`,
    `Período: ${buildPeriodLabel(filters)}`,
  ];

  let cursorX = x;
  chips.forEach(chip => {
    const chipWidth = Math.min(86, 16 + chip.length * 1.8);
    applyHexFill(doc, "#eef4ff");
    applyHexStroke(doc, "#bfdbfe");
    doc.roundedRect(cursorX, y, chipWidth, 8, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(30, 64, 175);
    doc.text(chip, cursorX + 4, y + 5.4);
    cursorX += chipWidth + 3;
  });
}

export async function generateDashboardReportPdf({
  deliveries,
  drivers,
  filters,
}: GenerateDashboardPdfParams) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const statusData = buildStatusDistribution(deliveries);
  const dailyTrend = buildDailyTrend(deliveries, new Date(filters.startDate), new Date(filters.endDate));
  const driverPerformance = buildDriverPerformance(
    deliveries,
    drivers.map(driver => ({ id: String(driver.id), name: driver.name }))
  );

  const totalDeliveries = deliveries.length;
  const completedDeliveries = deliveries.filter(delivery => delivery.status === "entregue").length;
  const pendingDeliveries = deliveries.filter(delivery => delivery.status === "pendente").length;
  const inRouteDeliveries = deliveries.filter(delivery => delivery.status === "em_rota").length;
  const canceledDeliveries = deliveries.filter(delivery => delivery.status === "cancelado").length;
  const completionRate = totalDeliveries > 0 ? `${((completedDeliveries / totalDeliveries) * 100).toFixed(1)}%` : "0.0%";
  const activeDrivers = driverPerformance.filter(item => item.total > 0).length;
  const topDriver = driverPerformance[0] ?? null;

  drawHeader(doc, filters);
  drawSummaryChips(doc, 12, 37, filters);

  const metricsTop = 48;
  drawMetricCard(doc, 12, metricsTop, 89, 20, "Total de entregas", String(totalDeliveries), "#2563eb");
  drawMetricCard(doc, 104, metricsTop, 89, 20, "Entregues", String(completedDeliveries), "#16a34a");
  drawMetricCard(doc, 196, metricsTop, 89, 20, "Pendentes", String(pendingDeliveries), "#f59e0b");
  drawMetricCard(doc, 12, metricsTop + 23, 89, 20, "Em rota", String(inRouteDeliveries), "#3b82f6");
  drawMetricCard(doc, 104, metricsTop + 23, 89, 20, "Canceladas", String(canceledDeliveries), "#ef4444");
  drawMetricCard(doc, 196, metricsTop + 23, 89, 20, "Taxa de conclusão", completionRate, "#0f172a");

  applyHexFill(doc, "#ffffff");
  applyHexStroke(doc, "#dbe3f0");
  doc.roundedRect(12, 96, 273, 18, 3, 3, "FD");
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Resumo executivo", 17, 103);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const summaryLine = [
    `Motoristas com entregas: ${activeDrivers}`,
    topDriver ? `Maior volume: ${topDriver.name} (${topDriver.total})` : "Maior volume: sem registros",
    `Total de registros exibidos: ${deliveries.length}`,
  ].join("    •    ");
  doc.text(summaryLine, 17, 109);

  drawTrendChart(
    doc,
    12,
    118,
    170,
    74,
    "Evolução diária",
    dailyTrend.map(point => ({
      label: point.day,
      total: point.total,
      completed: point.completed,
    }))
  );

  drawHorizontalBars(
    doc,
    185,
    118,
    100,
    35,
    "Status das entregas",
    statusData.map(item => ({
      label: item.name,
      value: item.value,
      color: item.fill,
    }))
  );

  drawHorizontalBars(
    doc,
    185,
    157,
    100,
    35,
    "Top motoristas",
    driverPerformance.slice(0, 4).map(driver => ({
      label: driver.name,
      value: driver.total,
      color: "#2563eb",
    }))
  );

  doc.addPage();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text("Detalhamento operacional", 12, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Tabelas condensadas para leitura rápida e apoio executivo.", 12, 19);

  autoTable(doc, {
    startY: 24,
    margin: { left: 12, right: 12 },
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2,
    },
    styles: {
      overflow: "linebreak",
      halign: "left",
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 48 },
      1: { cellWidth: 70 },
      2: { cellWidth: 24 },
      3: { cellWidth: 34 },
      4: { cellWidth: 34 },
      5: { cellWidth: 30 },
    },
    head: [["Motorista", "Total", "Entregues", "Pendentes", "Em rota", "Taxa"]],
    body: driverPerformance.slice(0, 8).map(driver => [
      driver.name,
      String(driver.total),
      String(driver.completed),
      String(driver.pending),
      String(driver.inRoute),
      driver.total > 0 ? `${((driver.completed / driver.total) * 100).toFixed(1)}%` : "0.0%",
    ]),
    didDrawPage: data => {
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`Página ${doc.getNumberOfPages()}`, doc.internal.pageSize.getWidth() - 18, doc.internal.pageSize.getHeight() - 6, {
        align: "right",
      });
    },
  });

  const lastTableY = (doc as any).lastAutoTable?.finalY ?? 54;

  autoTable(doc, {
    startY: lastTableY + 8,
    margin: { left: 12, right: 12 },
    theme: "grid",
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2,
    },
    styles: {
      overflow: "linebreak",
      halign: "left",
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 68 },
      2: { cellWidth: 26 },
      3: { cellWidth: 46 },
      4: { cellWidth: 64 },
    },
    head: [["Código", "Cliente", "Status", "Motorista", "Destino"]],
    body: deliveries.slice(0, 12).map(delivery => [
      delivery.deliveryCode || "-",
      delivery.clientName || "-",
      delivery.status,
      drivers.find(driver => String(driver.id) === String((delivery as any).driverId))?.name || "-",
      delivery.destinationAddress || "-",
    ]),
    didDrawPage: data => {
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`Página ${doc.getNumberOfPages()}`, doc.internal.pageSize.getWidth() - 18, doc.internal.pageSize.getHeight() - 6, {
        align: "right",
      });
    },
  });

  const filename = buildReportFilename(filters);
  doc.save(filename);
}
