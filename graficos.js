/* ============================================================
   graficos.js — barras verticales en SVG, sin librerías
   ------------------------------------------------------------
   Versión actual: v=2   (subir el ?v= al tocar este archivo)

   Lo usan estadisticas.html (quien administra) y la pestaña Estadísticas del
   panel de cada tienda. Cada página pone los colores con sus clases:
   .b0 (la barra clara, `a`), .b1 (la oscura, `b`, encima y desde abajo),
   .ejes text / .ejes line, y .vacio para cuando no hay datos.
   ============================================================ */
/* esc() es la global de config.js: todas las páginas que importan este módulo la cargan antes. */
const fmtN = n => Math.round(n).toLocaleString("es-CL");

/* serie: [{ x, a, b }]. etq(x) es el rótulo del eje; desc(d) va al pasar el
   cursor. Se dibuja al ancho real del contenedor: llamarla de nuevo al cambiar
   el tamaño de la ventana. */
export function barras(cont, serie, { etq = x => x, desc = d => etq(d.x) + ": " + fmtN(d.a || d.b || 0), alto = 180 } = {}){
  if (!serie.length || serie.every(d => !d.a && !d.b)){ cont.innerHTML = '<div class="vacio">Sin datos en el período.</div>'; return; }
  const W = Math.max(260, cont.clientWidth || 600), H = alto, izq = 36, abajo = 24, arriba = 10;
  const max = Math.max(1, ...serie.map(d => Math.max(d.a || 0, d.b || 0)));
  const paso = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000].find(x => max / x <= 4) || Math.ceil(max / 4);
  const tope = Math.ceil(max / paso) * paso;
  const y = val => arriba + (H - arriba - abajo) * (1 - val / tope);
  const n = serie.length, ancho = (W - izq) / n, gap = Math.min(4, ancho * .28);
  let s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(desc(serie[n - 1])) + '"><g class="ejes">';
  for (let val = 0; val <= tope; val += paso) s += '<line x1="' + izq + '" x2="' + W + '" y1="' + y(val) + '" y2="' + y(val) + '"/><text x="' + (izq - 6) +
    '" y="' + (y(val) + 4) + '" text-anchor="end">' + fmtN(val) + "</text>";
  const marcas = n === 1 ? [0] : [...new Set([0, Math.floor((n - 1) / 2), n - 1])];
  s += marcas.map(i => '<text x="' + (izq + ancho * i + ancho / 2) + '" y="' + (H - 6) + '" text-anchor="' +
    (i === 0 && n > 1 ? "start" : i === n - 1 && n > 1 ? "end" : "middle") + '">' + esc(etq(serie[i].x)) + "</text>").join("") + "</g>";
  serie.forEach((d, i) => {
    const x = izq + ancho * i + gap / 2, w = Math.max(1, ancho - gap);
    s += "<g><title>" + esc(desc(d)) + "</title>" + '<rect x="' + x + '" y="' + arriba + '" width="' + w + '" height="' + (H - arriba - abajo) + '" fill="transparent"/>';
    if (d.a) s += '<rect class="b0" x="' + x + '" y="' + y(d.a) + '" width="' + w + '" height="' + (y(0) - y(d.a)) + '" rx="2"/>';
    if (d.b) s += '<rect class="b1" x="' + x + '" y="' + y(d.b) + '" width="' + w + '" height="' + (y(0) - y(d.b)) + '" rx="2"/>';
    s += "</g>";
  });
  cont.innerHTML = s + "</svg>";
}
