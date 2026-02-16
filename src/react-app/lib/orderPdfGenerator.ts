import { jsPDF } from "jspdf";
import JsBarcode from "jsbarcode";

interface OrderItem {
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  image_url?: string | null;
}

interface OrderData {
  order_number: string;
  supplier_name: string;
  supplier_code?: string;
  created_at: string;
  items: OrderItem[];
  total_amount: number;
  company_name?: string;
  customer_name?: string;
}

// Placeholder image em base64 (ícone Lucide Image sobre fundo cinza)
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8IS0tIEZ1bmRvIGNpbnphIC0tPgogIDxyZWN0IHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgZmlsbD0iI0U1RTdFQiIvPgogIDwhLS0gw4ljb25lIEltYWdlIChMdWNpZGUpIC0tPgogIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDIwLCAyMCkiPgogICAgPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiB4PSIwIiB5PSIwIiByeD0iMiIgcnk9IjIiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+CiAgICA8Y2lyY2xlIGN4PSI3IiBjeT0iNyIgcj0iMiIgc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz4KICAgIDxwYXRoIGQ9Ik0yNCAxOEwxOS41IDEzLjVDMTguNzIgMTIuNzIgMTcuNDUgMTIuNzIgMTYuNjcgMTMuNUw4IDIyIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWxsPSJub25lIi8+CiAgPC9nPgo8L3N2Zz4=";

/**
 * Gerador jsPDF com coordenadas em POINTS (pt)
 * Página (pt): width=594.96, height=841.92 (A4)
 */
export function generateOrderPDF(orderData: OrderData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: [594.96, 841.92],
  });

  // ===== Layout base =====
  const LAYOUT = {
    left: 35.0,
    right: 560.0,
    width: 525.0,

    titleX: 35.46,
    titleY: 82.54,
    titleSize: 27.44,

    poX: 435.3,
    poY: 66.76,
    boughtY: 81.16,
    smallSize: 9.6,

    ruleY: 100.38,

    supplierLabelY: 126.44,
    supplierValueY: 140.85,

    warehouseLabelY: 155.26,
    warehouseValueY: 169.67,

    tableTop: 203.0,
    tableHeaderH: 30.16,
    tableHeaderTextY: 222.78,

    firstRowBaselineY: 243.03,
    rowHeight: 45.27,

    footerY: 688.99,

    // ✅ controla o “conteúdo do item” descer dentro da linha (você já ajustou e ficou bom)
    rowBaselineOffset: 8,

    // ✅ NOVO: controla quanto “respiro” existe entre a separadora e a próxima linha
    // Isso resolve o problema do item 2+ ficar colado no topo.
    rowSeparatorGap: 18, // teste 16 / 18 / 20 se quiser mais no meio
  };

  // Colunas
  const COL = {
    num: 46.49,
    img: 71.27,
    sku: 102.09,
    qty: 292.16,
    unitRight: 450.0,
    subRight: 556.0,
  };

  const FONT = {
    helv: "helvetica" as const,
  };

  const formatDateBR = (dateStr: string) => {
    const date = new Date(dateStr);
    const d = date.toLocaleDateString("pt-BR");
    const t = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${d} ${t}`;
  };

  const formatMoneyBR = (value: number) => {
    const n = Number.isFinite(value) ? value : 0;
    return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const generateBarcode = (text: string): string => {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, text, {
      format: "CODE128",
      width: 1.2,
      height: 18,
      displayValue: false,
      margin: 0,
    });
    return canvas.toDataURL("image/png");
  };

  const loadImage = async (url?: string | null): Promise<string> => {
    if (!url) return PLACEHOLDER_IMAGE;

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(PLACEHOLDER_IMAGE);
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch {
          resolve(PLACEHOLDER_IMAGE);
        }
      };
      img.onerror = () => resolve(PLACEHOLDER_IMAGE);
      img.src = url;
    });
  };

  const drawHeader = (includeTitle: boolean) => {
    if (includeTitle) {
      doc.setFont(FONT.helv, "bold");
      doc.setFontSize(LAYOUT.titleSize);
      doc.text("Lista de Compra", LAYOUT.titleX, LAYOUT.titleY);
    }

    doc.setFont(FONT.helv, "normal");
    doc.setFontSize(LAYOUT.smallSize);

    doc.text(`PO#: ${String(orderData.order_number || "")}`, LAYOUT.poX, LAYOUT.poY);
    doc.text(`Comprado: ${formatDateBR(orderData.created_at)}`, LAYOUT.poX, LAYOUT.boughtY);

    try {
      const barcode = generateBarcode(String(orderData.order_number || ""));
      const barcodeW = 105.7;
      const barcodeH = 18.6;
      const barcodeX = LAYOUT.poX - barcodeW - 8;
      const barcodeY = LAYOUT.boughtY - barcodeH / 2 - 10;
      doc.addImage(barcode, "PNG", barcodeX, barcodeY, barcodeW, barcodeH);
    } catch {}

    doc.setDrawColor(0);
    doc.setLineWidth(1.5);
    doc.line(LAYOUT.left, LAYOUT.ruleY, LAYOUT.right, LAYOUT.ruleY);

    if (includeTitle) {
      doc.setFont(FONT.helv, "bold");
      doc.setFontSize(LAYOUT.smallSize);
      doc.text("Fornecedor", LAYOUT.titleX, LAYOUT.supplierLabelY);

      doc.setFont(FONT.helv, "normal");
      doc.text(String(orderData.supplier_name || "—"), LAYOUT.titleX, LAYOUT.supplierValueY);

      doc.setFont(FONT.helv, "bold");
      doc.text("Armazém", LAYOUT.titleX, LAYOUT.warehouseLabelY);

      doc.setFont(FONT.helv, "normal");
      doc.text("BRFGO1", LAYOUT.titleX, LAYOUT.warehouseValueY);
    }
  };

  const drawTableHeader = (topY: number) => {
    doc.setFillColor(240, 240, 240);
    doc.rect(LAYOUT.left, topY, LAYOUT.width, LAYOUT.tableHeaderH, "F");

    doc.setFont(FONT.helv, "bold");
    doc.setFontSize(LAYOUT.smallSize);

    const y = topY + (LAYOUT.tableHeaderTextY - LAYOUT.tableTop);
    doc.text("#", COL.num, y);
    doc.text("SKU", 71.13, y);
    doc.text("Qtd.", 292.16, y);
    doc.text("Preço Unitário (BRL)", 354.07, y);
    doc.text("Subtotal (BRL)", 484.8, y);

    // baseline do 1º item + offset
    return topY + (LAYOUT.firstRowBaselineY - LAYOUT.tableTop) + LAYOUT.rowBaselineOffset;
  };

  const drawRow = async (item: OrderItem, index1: number, baselineY: number) => {
    // Nº
    doc.setFont(FONT.helv, "normal");
    doc.setFontSize(LAYOUT.smallSize);
    doc.setTextColor(0);
    doc.text(String(index1), COL.num, baselineY);

    // Imagem
    const imgSize = 26.57;
    const imgX = COL.img;
    const imgY = baselineY - 7.47;

    if (!item.image_url) {
      doc.setFillColor(229, 231, 235);
      doc.roundedRect(imgX, imgY, imgSize, imgSize, 2, 2, "F");

      doc.setDrawColor(210);
      doc.setLineWidth(0.5);
      doc.roundedRect(imgX, imgY, imgSize, imgSize, 2, 2);

      const iconPadding = 6;
      const iconX = imgX + iconPadding;
      const iconY = imgY + iconPadding;
      const iconSize = imgSize - iconPadding * 2;

      doc.setDrawColor(156, 163, 175);
      doc.setLineWidth(1.2);

      doc.rect(iconX, iconY, iconSize, iconSize);

      const circleX = iconX + iconSize * 0.3;
      const circleY = iconY + iconSize * 0.3;
      const circleR = iconSize * 0.15;
      doc.circle(circleX, circleY, circleR);

      doc.setLineWidth(1.5);
      const mountainStartX = iconX + iconSize * 0.1;
      const mountainStartY = iconY + iconSize * 0.9;
      const mountainPeak1X = iconX + iconSize * 0.4;
      const mountainPeak1Y = iconY + iconSize * 0.6;
      const mountainPeak2X = iconX + iconSize * 0.7;
      const mountainPeak2Y = iconY + iconSize * 0.5;
      const mountainEndX = iconX + iconSize * 0.9;
      const mountainEndY = iconY + iconSize * 0.75;

      doc.line(mountainStartX, mountainStartY, mountainPeak1X, mountainPeak1Y);
      doc.line(mountainPeak1X, mountainPeak1Y, mountainPeak2X, mountainPeak2Y);
      doc.line(mountainPeak2X, mountainPeak2Y, mountainEndX, mountainEndY);
    } else {
      const imgData = await loadImage(item.image_url);

      doc.setDrawColor(210);
      doc.setLineWidth(0.5);
      doc.rect(imgX, imgY, imgSize, imgSize);

      try {
        doc.addImage(imgData, "PNG", imgX + 0.75, imgY + 0.75, imgSize - 1.5, imgSize - 1.5);
      } catch {}
    }

    // SKU bold
    doc.setFont(FONT.helv, "bold");
    doc.setFontSize(LAYOUT.smallSize);
    doc.text(String(item.sku || ""), COL.sku, baselineY);

    // Nome (linha abaixo)
    doc.setFont(FONT.helv, "normal");
    const nameY = baselineY + 12.0;
    const name = String(item.product_name || "");
    const maxW = COL.qty - 10 - COL.sku;

    let display = name;
    if (doc.getTextWidth(display) > maxW) {
      while (display.length > 0 && doc.getTextWidth(display + "...") > maxW) display = display.slice(0, -1);
      display += "...";
    }
    doc.text(display, COL.sku, nameY);

    // Qtd (bold)
    doc.setFont(FONT.helv, "bold");
    doc.text(`x ${String(item.quantity ?? 0)}`, COL.qty, baselineY);

    // Unit price (right)
    doc.setFont(FONT.helv, "normal");
    const unitText = formatMoneyBR(Number(item.unit_price || 0));
    doc.text(unitText, COL.unitRight, baselineY, { align: "right" });

    // Subtotal (right)
    const subText = formatMoneyBR(Number(item.subtotal || 0));
    doc.text(subText, COL.subRight, baselineY, { align: "right" });

    // ✅ Linha separadora (CORRIGIDA)
    // Em vez de “- 8”, usamos um gap maior, pra próxima linha não começar colada na separadora
    const lineY = baselineY + (LAYOUT.rowHeight - LAYOUT.rowSeparatorGap);
    doc.setDrawColor(0);
    doc.setLineWidth(0.35);
    doc.line(LAYOUT.left, lineY, LAYOUT.right, lineY);

    return baselineY + LAYOUT.rowHeight;
  };

  const drawFooter = (totalQty: number, totalAmount: number) => {
    doc.setDrawColor(0);
    doc.setLineWidth(1.5);
    doc.line(LAYOUT.left, LAYOUT.footerY - 12, LAYOUT.right, LAYOUT.footerY - 12);

    doc.setFont(FONT.helv, "bold");
    doc.setFontSize(LAYOUT.smallSize);

    doc.text("Resumo", 45.0, LAYOUT.footerY);
    doc.setFont(FONT.helv, "normal");
    doc.text(`x ${totalQty}`, COL.qty, LAYOUT.footerY);

    doc.setFont(FONT.helv, "bold");
    doc.text("Total", 430.52, LAYOUT.footerY);

    const totalText = `BRL ${formatMoneyBR(totalAmount)}`;
    doc.text(totalText, COL.subRight, LAYOUT.footerY, { align: "right" });
  };

  const process = async () => {
    drawHeader(true);
    let y = drawTableHeader(LAYOUT.tableTop);

    const totalQty = orderData.items.reduce((s, it) => s + Number(it.quantity || 0), 0);
    const lastItemBaselineAllowed = LAYOUT.footerY - 45.0;

    for (let i = 0; i < orderData.items.length; i++) {
      const item = orderData.items[i];

      if (y > lastItemBaselineAllowed) {
        doc.addPage();
        drawHeader(false);
        const nextTop = 118.0;
        y = drawTableHeader(nextTop);
      }

      y = await drawRow(item, i + 1, y);
    }

    drawFooter(totalQty, Number(orderData.total_amount || 0));

    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, "_blank");
  };

  process().catch((err) => {
    console.error("Error generating PDF:", err);
    alert("Erro ao gerar PDF do pedido");
  });
}
