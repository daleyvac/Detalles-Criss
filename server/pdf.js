// Generador de comprobante PDF (sin dependencias externas):
// construye un PDF 1.4 válido con la fuente base Helvetica, listo para
// descarga pública por enlace desde WhatsApp.
//   generarComprobantePdf(pedido) -> Buffer

function esc(s) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
    // latin-1 seguro: reemplaza caracteres fuera del rango imprimible
    .replace(/[^\x20-\x7E\xA1-\xFF]/g, ' ');
}

function textLine(x, y, size, texto, negrita = false) {
  const f = negrita ? 'F2' : 'F1';
  return `BT /${f} ${size} Tf ${x} ${y} Td (${esc(texto)}) Tj ET\n`;
}

function generarComprobantePdf(pedido) {
  const W = 595.28, H = 841.89; // A4 en puntos
  let y = H - 60;
  let ops = '';

  ops += textLine(50, y, 20, 'TIENDA ONLINE - COMPROBANTE DE PAGO', true); y -= 28;
  ops += textLine(50, y, 11, `Codigo: ${pedido.codigo || ('PDD-' + pedido.id)}`); y -= 16;
  ops += textLine(50, y, 11, `Pedido Nro: ${pedido.id}`); y -= 16;
  ops += textLine(50, y, 11, `Fecha: ${String(pedido.creado_en || pedido.fecha_creacion || pedido.fecha || '').slice(0, 19).replace('T', ' ')}`); y -= 16;
  ops += textLine(50, y, 11, `Cliente: ${pedido.cliente}`); y -= 16;
  if (pedido.telefono) { ops += textLine(50, y, 11, `Telefono: ${pedido.telefono}`); y -= 16; }
  if (pedido.entrega)  { ops += textLine(50, y, 11, `Entrega: ${pedido.entrega}`); y -= 16; }
  if (pedido.dedicatoria) { ops += textLine(50, y, 11, `Dedicatoria: ${pedido.dedicatoria}`); y -= 16; }

  y -= 14;
  ops += textLine(50, y, 12, 'Detalle del pedido', true); y -= 20;
  ops += textLine(50, y, 10, 'Producto                          Cant   Precio   Subtotal', true); y -= 16;

  for (const it of (pedido.detalle || [])) {
    const nombre = String(it.nombre).padEnd(32, ' ').slice(0, 32);
    ops += textLine(50, y, 10,
      `${nombre}  ${String(it.cantidad).padStart(3)}   S/ ${String(Number(it.precio).toFixed(2)).padStart(7)}   S/ ${String(Number(it.subtotal).toFixed(2)).padStart(8)}`);
    y -= 15;
  }

  y -= 10;
  ops += textLine(50, y, 13, `TOTAL: S/ ${Number(pedido.total).toFixed(2)}`, true); y -= 26;
  ops += textLine(50, y, 9, 'Este comprobante es generado automaticamente al confirmar la compra.'); y -= 14;
  ops += textLine(50, y, 9, 'El pago se coordina con el vendedor via WhatsApp.');

  // ----- ensamblaje del PDF -----
  const objs = [];
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objs[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
  objs[3] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`;
  const stream = ops;
  objs[4] = `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`;
  objs[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objs[6] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  for (let i = 1; i <= 6; i++) {
    offsets[i] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, 'latin1');
  pdf += 'xref\n0 7\n0000000000 65535 f \n';
  for (let i = 1; i <= 6; i++) pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  pdf += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, 'latin1');
}

module.exports = { generarComprobantePdf };
