import * as XLSX from "xlsx";

interface ProductData {
  sku: string;
  name: string;
  units: number;
  revenue: number;
  avgPrice: number;
}

export function exportToExcel(data: ProductData[], period: string) {
  // Prepare data for export
  const exportData = data.map(product => ({
    SKU: product.sku,
    "Produto": product.name,
    "Unidades Vendidas": product.units,
    "Receita Total": product.revenue,
    "Preço Médio": product.avgPrice,
  }));

  // Add summary row
  const totalUnits = data.reduce((sum, p) => sum + p.units, 0);
  const totalRevenue = data.reduce((sum, p) => sum + p.revenue, 0);
  const avgTicket = totalUnits > 0 ? totalRevenue / totalUnits : 0;

  exportData.push({
    SKU: "",
    "Produto": "",
    "Unidades Vendidas": 0,
    "Receita Total": 0,
    "Preço Médio": 0,
  });

  exportData.push({
    SKU: "TOTAL",
    "Produto": `Análise de ${period}`,
    "Unidades Vendidas": totalUnits,
    "Receita Total": totalRevenue,
    "Preço Médio": avgTicket,
  });

  // Create workbook
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Produtos");

  // Style the header
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    worksheet[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: "FFD432" } },
    };
  }

  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // SKU
    { wch: 40 }, // Produto
    { wch: 18 }, // Unidades Vendidas
    { wch: 18 }, // Receita Total
    { wch: 15 }, // Preço Médio
  ];

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `Analytics_${period}_${timestamp}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, filename);
}

export function exportToCSV(data: ProductData[], period: string) {
  // Prepare CSV content
  const headers = ["SKU", "Produto", "Unidades Vendidas", "Receita Total", "Preço Médio"];
  const rows = data.map(p => [
    p.sku,
    p.name,
    p.units,
    p.revenue.toFixed(2),
    p.avgPrice.toFixed(2),
  ]);

  // Add summary
  const totalUnits = data.reduce((sum, p) => sum + p.units, 0);
  const totalRevenue = data.reduce((sum, p) => sum + p.revenue, 0);
  const avgTicket = totalUnits > 0 ? totalRevenue / totalUnits : 0;

  rows.push(["", "", "", "", ""]);
  rows.push([
    "TOTAL",
    `Análise de ${period}`,
    totalUnits.toString(),
    totalRevenue.toFixed(2),
    avgTicket.toFixed(2),
  ]);

  // Create CSV string
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
  ].join("\n");

  // Download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  const timestamp = new Date().toISOString().split('T')[0];
  link.setAttribute("href", url);
  link.setAttribute("download", `Analytics_${period}_${timestamp}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
