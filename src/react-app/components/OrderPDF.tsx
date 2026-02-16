interface OrderPDFProps {
  order: any;
  items: any[];
  supplierName: string;
}

/**
 * HTML/print version (browser print).
 * Ajustado para bater com o layout medido do PDF (A4 em points, sem margem).
 * Coordenadas base (pt):
 * - Página: 594.96 x 841.92
 * - Conteúdo útil: left=35.46, right=560.00
 * - Title: x=35.46 y=82.54 (font 27.44)
 * - Barcode bbox: x=254.20 y=37.20 w=105.70 h=18.60
 * - PO: x=435.30 y=66.76 (font 9.60)
 * - Comprado: x=435.30 y=81.16 (font 9.60)
 * - Linha: y=100.38
 * - Fornecedores: y=126.44 / nome: y=140.85
 * - Armazém: y=155.26 / valor: y=169.67
 * - Table: top=203.00; header height ≈ 30.16; first row baseline ≈ 243.03; rowHeight ≈ 45.27
 */
export function generateOrderPDF({ order, items, supplierName }: OrderPDFProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const d = date.toLocaleDateString("pt-BR");
    const t = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${d} ${t}`;
  };

  const formatCurrency = (value: number) => {
    const n = Number.isFinite(value) ? value : 0;
    return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const totalQuantity = items.reduce((sum, item) => sum + parseInt(item.quantity || 0, 10), 0);
  const totalValue = Number(order.total_amount || 0);

  // FIX: garantir que a janela de impressão não herde estilos externos
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Lista de Compra - ${String(order.order_number || "")}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }

    /* Página sem margem (coords em pt) */
    @page { size: A4; margin: 0; }
    html, body { width: 594.96pt; height: 841.92pt; }

    body {
      font-family: Arial, sans-serif;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      background: #fff;
    }

    .page {
      position: relative;
      width: 594.96pt;
      height: 841.92pt;
    }

    /* Header */
    .title {
      position: absolute;
      left: 35.46pt;
      top: 52.54pt; /* aproximando baseline 82.54pt (font 27.44pt) */
      font-size: 27.44pt;
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
    }

    .barcode {
      position: absolute;
      left: 254.20pt;
      top: 37.20pt;
      width: 105.70pt;
      height: 18.60pt;
    }

    .header-info {
      position: absolute;
      left: 435.30pt;
      top: 57.20pt;
      font-size: 9.60pt;
      line-height: 14.40pt;
      text-align: left;
      white-space: nowrap;
    }

    .rule {
      position: absolute;
      left: 35.00pt;
      top: 100.38pt;
      width: 525.00pt; /* 560 - 35 */
      height: 0;
      border-top: 1.5pt solid #000;
    }

    /* Sections */
    .sec-label {
      position: absolute;
      left: 35.46pt;
      font-size: 9.60pt;
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
    }
    .sec-value {
      position: absolute;
      left: 35.46pt;
      font-size: 9.60pt;
      font-weight: 400;
      line-height: 1;
      white-space: nowrap;
    }

    /* Table */
    .table-wrap {
      position: absolute;
      left: 35.00pt;
      top: 203.00pt;
      width: 525.00pt;
    }

    table {
      width: 525.00pt;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 9.60pt;
    }

    thead tr {
      background: #f0f0f0;
      height: 30.16pt;
    }

    th {
      border: 0.75pt solid #000;
      padding: 0;
      font-weight: 700;
      text-align: left;
      vertical-align: middle;
    }

    /* X dos headers aproximado via padding-left */
    th.h-num { width: 25.00pt; padding-left: 11.49pt; }
    th.h-sku { width: 221.03pt; padding-left: 36.13pt; } /* começa ~71.13 */
    th.h-qty { width: 61.91pt; padding-left: 7.36pt; }
    th.h-price { width: 130.73pt; padding-left: 7.00pt; }
    th.h-sub { width: 86.33pt; padding-left: 7.00pt; }

    tbody tr.item-row { height: 45.27pt; }
    td {
      border-left: 0.5pt solid #d0d0d0;
      border-right: 0.5pt solid #d0d0d0;
      border-bottom: 0.5pt solid #d0d0d0;
      padding: 0;
      vertical-align: middle;
    }

    /* Colunas */
    td.c-num { width: 25pt; text-align: center; font-size: 9.60pt; }
    td.c-sku { width: 221.03pt; }
    td.c-qty { width: 61.91pt; text-align: center; font-weight: 700; }
    td.c-price { width: 130.73pt; text-align: right; padding-right: 6pt; }
    td.c-sub { width: 86.33pt; text-align: right; padding-right: 6pt; }

    .product-cell {
      display: flex;
      align-items: center;
      gap: 4.25pt;
      padding-left: 36.13pt; /* alinha início da célula do SKU no x ~71.13 */
    }

    .product-image, .product-placeholder {
      width: 26.57pt;
      height: 26.57pt;
      border: 0.5pt solid #d0d0d0;
      flex: 0 0 auto;
    }

    .product-image { object-fit: cover; background:#fff; }
    .product-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12pt;
      background: #f3f4f6;
    }

    .product-info { min-width: 0; }
    .sku-code { font-weight: 700; font-size: 9.60pt; line-height: 1.1; }
    .product-name {
      font-weight: 400;
      font-size: 9.60pt;
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 165pt;
    }

    /* Resumo */
    tr.summary-row { height: 30pt; background: #fff; }
    tr.summary-row td {
      border-top: 1.5pt solid #000;
      border-bottom: 0.75pt solid #d0d0d0;
      font-weight: 700;
    }
    .summary-left { padding-left: 36.13pt; }
    .summary-total { padding-right: 6pt; }

    /* Evita quebra no meio da tabela em print */
    tr, td, th { page-break-inside: avoid; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
</head>
<body>
  <div class="page">
    <div class="title">Lista de Compra</div>

    <svg class="barcode" id="barcode"></svg>

    <div class="header-info">
      <div>PO#: ${String(order.order_number || "")}</div>
      <div>Comprado: ${formatDate(order.created_at)}</div>
    </div>

    <div class="rule"></div>

    <div class="sec-label" style="top: 116.44pt;">Fornecedores</div>
    <div class="sec-value" style="top: 130.85pt;">${String(supplierName || "—")}</div>

    <div class="sec-label" style="top: 145.26pt;">Armazém</div>
    <div class="sec-value" style="top: 159.67pt;">BRFGO1</div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="h-num">#</th>
            <th class="h-sku">SKU</th>
            <th class="h-qty">Qtd.</th>
            <th class="h-price">Preço Unitário (BRL)</th>
            <th class="h-sub">Subtotal (BRL)</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item, index) => `
            <tr class="item-row">
              <td class="c-num">${index + 1}</td>
              <td class="c-sku">
                <div class="product-cell">
                  ${
                    item.image_url
                      ? `<img src="${item.image_url}" alt="${String(item.product_name || "")}" class="product-image" />`
                      : `<div class="product-placeholder">📦</div>`
                  }
                  <div class="product-info">
                    <div class="sku-code">${String(item.sku || "")}</div>
                    <div class="product-name">${String(item.product_name || "")}</div>
                  </div>
                </div>
              </td>
              <td class="c-qty">x ${String(item.quantity || 0)}</td>
              <td class="c-price">${formatCurrency(parseFloat(item.unit_price || 0))}</td>
              <td class="c-sub">${formatCurrency(parseFloat(item.subtotal || 0))}</td>
            </tr>
          `
            )
            .join("")}
          <tr class="summary-row">
            <td class="c-num"></td>
            <td class="summary-left">Resumo</td>
            <td class="c-qty">x ${totalQuantity}</td>
            <td class="c-price" style="font-weight:700;">Total</td>
            <td class="c-sub summary-total">BRL ${formatCurrency(totalValue)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <script>
      try {
        JsBarcode("#barcode", "${String(order.order_number || "")}", {
          format: "CODE128",
          width: 1.2,
          height: 18,
          displayValue: false,
          margin: 0
        });
      } catch (e) {}
      window.onload = () => {
        // garante imagens carregadas antes de printar (melhora consistência)
        const imgs = Array.from(document.images || []);
        if (imgs.length === 0) return;
        let loaded = 0;
        const done = () => { loaded++; if (loaded >= imgs.length) window.print(); };
        imgs.forEach(img => { img.complete ? done() : (img.onload = done, img.onerror = done); });
      };
    </script>
  </div>
</body>
</html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Fallback de print caso o onload acima não rode (browser)
    printWindow.onload = () => {
      setTimeout(() => {
        try { printWindow.print(); } catch {}
      }, 400);
    };
  }
}
