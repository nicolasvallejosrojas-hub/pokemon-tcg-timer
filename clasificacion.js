/* ============================================================
   clasificacion.js — la clasificación mensual de una tienda
   ------------------------------------------------------------
   Versión actual: v=1   (subir el ?v= al tocar este archivo)

   La usan la vista de jugadores (pestaña Ranking) y el perfil de la tienda.
   Vive acá para que las dos sumen igual: dos copias de esta cuenta terminan
   dando dos tablas distintas del mismo mes.
   ============================================================ */

export const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio",
                      "agosto","septiembre","octubre","noviembre","diciembre"];
export function nombreMes(m){
  const [a, mm] = m.split("-");
  return MESES[parseInt(mm, 10) - 1] + " " + a;
}

export const PUNTOS_DEF = { puntos: [12, 10, 8, 7, 6, 5, 4, 3], resto: 1 };

/* El mes se saca de la fecha si falta: con UN solo torneo sin el campo, la
   pestaña entera se caía en nombreMes(undefined). */
export const mesDe = t => t.mes || String(t.fecha || "").slice(0, 7);

/* Los meses con torneos, del más nuevo al más viejo. */
export const mesesDe = torneos => [...new Set(torneos.map(mesDe).filter(Boolean))].sort().reverse();

export function puntosPorPuesto(place, cfg = PUNTOS_DEF){
  const p = cfg.puntos;
  return (place >= 1 && place <= p.length) ? p[place - 1] : (cfg.resto || 0);
}

/* Filas de la tabla del mes, ya ordenadas. */
export function clasificar(torneos, mes, cfg = PUNTOS_DEF){
  const tabla = {};
  torneos.filter(t => mesDe(t) === mes).forEach(t => (t.standings || []).forEach(p => {
    /* Se suma por nombre, salvo las filas reservadas: todas dicen «Jugador
       reservado», y sumadas por nombre serían un solo jugador inventado con
       los puntos de varios. Esas se separan por su uid. */
    const k = p.reservado && p.uid ? "reservado:" + p.uid : p.name;
    if (!tabla[k]) tabla[k] = { name: p.name, uid: p.uid || null, reservado: !!p.reservado,
                                pts: 0, torneos: 0, mejor: 99, w: 0, l: 0, e: 0 };
    const r = tabla[k];
    r.pts += puntosPorPuesto(p.place, cfg);
    r.torneos++;
    r.mejor = Math.min(r.mejor, p.place);
    r.w += p.w || 0; r.l += p.l || 0; r.e += p.t || 0;
  }));
  const filas = Object.values(tabla)
    .sort((a, b) => b.pts - a.pts || a.mejor - b.mejor || b.w - a.w || a.name.localeCompare(b.name));
  /* Porcentaje de victorias del mes: se suman TODAS las partidas de todos los
     torneos y se divide una sola vez. Así un torneo de 7 rondas pesa más que
     uno de 3, que es lo justo. El empate vale media victoria. */
  filas.forEach(r => {
    r.jugadas = r.w + r.l + r.e;
    r.wr = r.jugadas ? ((r.w + r.e / 2) / r.jugadas * 100) : null;
  });
  return filas;
}
