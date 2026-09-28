/* ============================================================
   torneo.js — correr un torneo suizo en la página
   ------------------------------------------------------------
   Versión actual: v=1   (subir el ?v= al tocar este archivo)

   El otro camino es TOM: arma el torneo y el panel lee su .tdf. Este es para
   los torneos de la tienda que no se suben a ninguna parte: los jugadores se
   inscriben por nombre desde la base de la tienda y la página empareja, lleva
   los resultados y arma la tabla.

   Las reglas son las del manual de torneos (5.3.3 y 5.5.1), no el código de
   TOM:
     · Ronda 1 al azar. Después, al azar entre quienes llevan los mismos
       puntos, sin repetir rival; el impar de un grupo baja al siguiente.
     · Con número impar, bye al azar en el grupo más bajo (a quien no haya
       tenido uno, si se puede). Vale como victoria, pero no para desempatar.
     · Tabla: puntos (victoria 3, empate 1), % de victorias de los rivales,
       % de los rivales de los rivales, cara a cara si son solo dos, y azar.
     · % de victorias: victorias sin contar byes / rondas jugadas, con piso de
       25 % y techo de 100 % (75 % si se retiró).
     · Quien llega tarde pierde las rondas que ya se jugaron.

   Nada lee el navegador: se prueba con node (probar_torneo.mjs).

   Top cut (5.5.3 y 5.5.7): después del suizo, eliminación directa entre los
   mejores de la tabla (corte = 2, 4, 8 o 16; 0 = sin corte), sembrados 1 vs 8,
   4 vs 5, 2 vs 7, 3 vs 6 para que el 1 y el 2 solo se crucen en la final. En el
   corte solo se gana o se pierde. El récord y los puntos son los del suizo; el
   corte decide el puesto de quienes entraron, y entre los que cayeron en la
   misma ronda manda su puesto del suizo.

   El torneo, como se guarda (salas/<sala>/torneo):
     { nombre, fecha, rondas, corte, minutos, semilla, creado,
       jugadores: { <id>: { nombre, desde, drop } },
       ronda: { <n>: { mesas: [ { a, b, r } ] } } }
   rondas: las suizas. Las del corte van después (rondas + 1, + 2…).
   desde: la primera ronda que juega (1 si se inscribió a tiempo).
   drop:  la última ronda que jugó antes de retirarse (0 = sigue).
   Mesa sin b = bye. r: 1 gana a, 2 gana b, 0 empate, 3 doble derrota;
   sin r, la mesa está en juego.
   ============================================================ */
export const GANA_A = 1, GANA_B = 2, EMPATE = 0, DOBLE = 3;

/* Rondas del manual para un torneo solo de rondas suizas (variante 2). */
export function rondasSugeridas(n){
  if (n < 4) return Math.max(1, n - 1);
  return n <= 8 ? 3 : n <= 16 ? 4 : n <= 32 ? 5 : n <= 64 ? 6 : n <= 128 ? 7 : 8;
}

/* Números al azar con semilla (mulberry32): el mismo torneo empareja y
   desempata igual en cualquier computador, y una recarga no reordena nada. */
export function azar(semilla){
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
function barajar(lista, rnd){
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* Firebase devuelve las listas como arreglo o como objeto: acá, siempre en orden. */
const enOrden = o => Object.keys(o || {}).sort((x, y) => x - y).map(k => o[k]).filter(Boolean);
export const rondasDe = t => Object.keys((t && t.ronda) || {}).map(Number).sort((x, y) => x - y)
  .map(n => ({ n, mesas: enOrden(t.ronda[n].mesas) }));
/* Hasta dónde llega el suizo. Sin rondas fijas todavía, todo es suizo. */
const finSuizo = t => (t && t.rondas > 0) ? t.rondas : Infinity;
export const suizas = t => rondasDe(t).filter(r => r.n <= finSuizo(t));
export const delCorte = t => rondasDe(t).filter(r => r.n > finSuizo(t));

/* Cómo va cada jugador, contando hasta la ronda `hasta` (todas si no se da). */
export function resumen(t, hasta = Infinity){
  const J = (t && t.jugadores) || {}, rs = rondasDe(t).filter(r => r.n <= Math.min(hasta, finSuizo(t))), s = {};
  for (const id in J) s[id] = { id, nombre: J[id].nombre, drop: J[id].drop || 0, desde: J[id].desde || 1,
                                w: 0, l: 0, e: 0, byes: 0, jugadas: 0, rivales: [], vs: new Set() };
  rs.forEach(({ n, mesas }) => {
    /* Quien no estaba inscrito en esta ronda la pierde (llegó tarde). */
    Object.values(s).forEach(p => { if (n < p.desde){ p.l++; p.jugadas++; } });
    mesas.forEach(m => {
      const A = s[m.a], B = m.b ? s[m.b] : null;
      if (!A) return;
      if (!m.b){ A.w++; A.byes++; A.jugadas++; return; }
      if (!B) return;
      A.vs.add(m.b); B.vs.add(m.a);
      if (m.r == null) return;
      A.jugadas++; B.jugadas++; A.rivales.push(m.b); B.rivales.push(m.a);
      if (m.r === GANA_A){ A.w++; B.l++; }
      else if (m.r === GANA_B){ B.w++; A.l++; }
      else if (m.r === EMPATE){ A.e++; B.e++; }
      else if (m.r === DOBLE){ A.l++; B.l++; }
    });
  });
  Object.values(s).forEach(p => p.pts = p.w * 3 + p.e);
  return s;
}

/* % de victorias de un jugador cuando es rival de otro (5.3.3.1). */
const pctVict = p => !p.jugadas ? .25 : Math.min(p.drop ? .75 : 1, Math.max(.25, (p.w - p.byes) / p.jugadas));

/* La tabla, ordenada, contando hasta la ronda `hasta`. */
export function tabla(t, hasta = Infinity){
  const s = resumen(t, hasta), lista = Object.values(s);
  lista.forEach(p => p.pv = pctVict(p));
  const prom = (ids, f) => ids.length ? ids.reduce((a, id) => a + f(s[id]), 0) / ids.length : 0;
  lista.forEach(p => p.owp = prom(p.rivales.filter(id => s[id]), q => q.pv));
  lista.forEach(p => p.oowp = prom(p.rivales.filter(id => s[id]), q => q.owp));
  /* El azar del último desempate, fijo para este torneo. */
  const rnd = azar(((t && t.semilla) || 1) ^ 0x5bd1e995);
  const suerte = {};
  Object.keys(s).sort().forEach(id => suerte[id] = rnd());
  const igual = (a, b) => a.pts === b.pts && Math.abs(a.owp - b.owp) < 1e-9 && Math.abs(a.oowp - b.oowp) < 1e-9;
  lista.sort((a, b) => b.pts - a.pts || b.owp - a.owp || b.oowp - a.oowp || suerte[a.id] - suerte[b.id]);
  /* Cara a cara: solo si quedaron exactamente dos empatados y se enfrentaron. */
  for (let i = 0; i < lista.length - 1; i++){
    const a = lista[i], b = lista[i + 1];
    if (!igual(a, b) || (lista[i + 2] && igual(b, lista[i + 2])) || (lista[i - 1] && igual(lista[i - 1], a))) continue;
    const g = caraACara(t, a.id, b.id, hasta);
    if (g < 0){ lista[i] = b; lista[i + 1] = a; }
  }
  return lista.map((p, i) => ({ ...p, puesto: i + 1 }));
}
/* +1 si a le ganó más veces a b que al revés, −1 al contrario, 0 si no. */
function caraACara(t, a, b, hasta){
  let d = 0;
  suizas(t).filter(r => r.n <= hasta).forEach(({ mesas }) => mesas.forEach(m => {
    if (m.a === a && m.b === b) d += m.r === GANA_A ? 1 : m.r === GANA_B ? -1 : 0;
    if (m.a === b && m.b === a) d += m.r === GANA_B ? 1 : m.r === GANA_A ? -1 : 0;
  }));
  return Math.sign(d);
}

/* ------------------------------------------------------------
   Emparejar la ronda siguiente
   ------------------------------------------------------------ */
/* Pares de arriba hacia abajo: cada uno con el primero libre que venga detrás
   en la lista (mismos puntos primero, en orden al azar) y con quien no haya
   jugado. Si un camino se tranca, se vuelve atrás. */
function parear(lista, revancha){
  const libre = new Set(lista.map(p => p.id)), pares = [];
  let pasos = 0;
  function sigue(){
    const i = lista.findIndex(p => libre.has(p.id));
    if (i < 0) return true;
    if (++pasos > 200000) return false;
    const a = lista[i]; libre.delete(a.id);
    for (let j = i + 1; j < lista.length; j++){
      const b = lista[j];
      if (!libre.has(b.id) || (!revancha && a.vs.has(b.id))) continue;
      libre.delete(b.id); pares.push([a, b]);
      if (sigue()) return true;
      pares.pop(); libre.add(b.id);
    }
    libre.add(a.id);
    return false;
  }
  return sigue() ? pares : null;
}

/* Las mesas de la ronda que viene. `revanchas` dice si hubo que repetir un
   rival porque no quedaba otra (pocos jugadores y muchas rondas). */
export function emparejar(t){
  const n = rondasDe(t).length + 1, s = resumen(t);
  const rnd = azar((((t && t.semilla) || 1) + n * 7919) >>> 0);
  /* Barajados y después ordenados por puntos: el orden dentro de cada grupo
     queda al azar (sort es estable). */
  const lista = barajar(Object.values(s).filter(p => !p.drop && p.desde <= n), rnd).sort((a, b) => b.pts - a.pts);
  let bye = null;
  if (lista.length % 2){
    const sinBye = lista.filter(p => !p.byes), grupo = sinBye.length ? sinBye : lista;
    const min = Math.min(...grupo.map(p => p.pts));
    const cands = grupo.filter(p => p.pts === min);
    bye = cands[Math.floor(rnd() * cands.length)];
    lista.splice(lista.indexOf(bye), 1);
  }
  let pares = parear(lista, false), revanchas = false;
  if (!pares){ pares = parear(lista, true); revanchas = true; }
  const mesas = pares.map(([a, b]) => ({ a: a.id, b: b.id }));
  if (bye) mesas.push({ a: bye.id });
  return { n, mesas, revanchas };
}

/* ------------------------------------------------------------
   Top cut
   ------------------------------------------------------------ */
export const CORTES = [0, 2, 4, 8, 16];
/* El nombre de una ronda del corte por cuántos quedan en ella. */
export const nombreCorte = quedan => ({ 2: "Final", 4: "Semifinal", 8: "Cuartos", 16: "Octavos" })[quedan] || "Top " + quedan;
/* El corte que de verdad se puede jugar: si se retiraron tantos que no
   alcanza, baja a la potencia de 2 que sí alcance. */
export function tamanoCorte(t){
  const siguen = tabla(t).filter(p => !p.drop).length;
  let k = (t && t.corte) || 0;
  while (k > siguen) k /= 2;
  return k >= 2 ? k : 0;
}
/* El orden de la llave: 1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6 (y así para 16). */
function sembrado(k){
  let o = [1];
  while (o.length < k){ const m = o.length * 2 + 1; o = o.flatMap(s => [s, m - s]); }
  return o;
}
export const ganador = m => m.r === GANA_A ? m.a : m.r === GANA_B ? m.b : null;
export function corteTerminado(t){
  const cr = delCorte(t), u = cr.length ? cr[cr.length - 1].mesas : [];
  return u.length === 1 && !!ganador(u[0]);
}
/* Las mesas de la ronda del corte que viene; null si todavía no se puede. */
export function emparejarCorte(t){
  const cr = delCorte(t), n = rondasDe(t).length + 1;
  if (!cr.length){
    const k = tamanoCorte(t);
    if (!k) return null;
    const top = tabla(t).filter(p => !p.drop).slice(0, k), o = sembrado(k), mesas = [];
    for (let i = 0; i < k; i += 2) mesas.push({ a: top[o[i] - 1].id, b: top[o[i + 1] - 1].id });
    return { n, mesas };
  }
  const ult = cr[cr.length - 1].mesas;
  if (ult.length < 2 || ult.some(m => !ganador(m))) return null;
  const g = ult.map(ganador), mesas = [];
  for (let i = 0; i < g.length; i += 2) mesas.push({ a: g[i], b: g[i + 1] });
  return { n, mesas };
}

/* La tabla final: los del corte arriba, ordenados por hasta dónde llegaron
   (y su puesto del suizo entre los que cayeron juntos); el resto, como quedó
   el suizo. `etapa` dice hasta dónde llegó cada uno en el corte. */
export function clasificacion(t){
  const tab = tabla(t), cr = delCorte(t);
  if (!cr.length) return tab;
  const dentro = new Set(cr[0].mesas.flatMap(m => [m.a, m.b])), cayo = {};
  cr.forEach((r, i) => r.mesas.forEach(m => { const g = ganador(m); if (g) cayo[g === m.a ? m.b : m.a] = i; }));
  const hasta = id => cayo[id] === undefined ? 99 : cayo[id];
  const fin = corteTerminado(t);
  const etapa = id => cayo[id] === undefined ? (fin ? "Campeón" : "Sigue en el corte")
                    : cayo[id] === cr.length - 1 && fin ? "Finalista" : "Cayó en " + nombreCorte(cr[cayo[id]].mesas.length * 2).toLowerCase();
  const arriba = tab.filter(p => dentro.has(p.id)).sort((a, b) => hasta(b.id) - hasta(a.id) || a.puesto - b.puesto);
  return arriba.concat(tab.filter(p => !dentro.has(p.id)))
    .map((p, i) => ({ ...p, suizo: p.puesto, puesto: i + 1, etapa: dentro.has(p.id) ? etapa(p.id) : "" }));
}

/* ------------------------------------------------------------
   Hacia afuera: lo que ven los jugadores y lo que se archiva
   ------------------------------------------------------------ */
const nom = (t, id) => ((t.jugadores || {})[id] || {}).nombre || "?";
const rec = p => p ? { w: p.w, l: p.l, t: p.e, pts: p.pts } : null;

/* El mismo formato que arma el panel con el .tdf de TOM (salas/<sala>/pairings):
   la pantalla y los celulares no notan la diferencia. */
export function aPairings(t){
  const rs = rondasDe(t);
  const rounds = rs.map(({ n, mesas }) => {
    const s = resumen(t, n);
    const ronda = { number: n };
    if (n > finSuizo(t)) ronda.etiqueta = nombreCorte(mesas.length * 2);
    return { ...ronda, matches: mesas.map((m, i) => {
      const p1 = nom(t, m.a), p2 = m.b ? nom(t, m.b) : null;
      const result = !m.b ? "Bye" : m.r === GANA_A ? "Gana " + p1 : m.r === GANA_B ? "Gana " + p2
                   : m.r === EMPATE ? "Empate" : m.r === DOBLE ? "Doble derrota" : "";
      return { table: m.b ? i + 1 : 0, p1, p1rec: rec(s[m.a]), p2, p2rec: m.b ? rec(s[m.b]) : null, result };
    }).sort((x, y) => x.table - y.table) };
  });
  const ult = rs[rs.length - 1];
  const pendientes = ult ? ult.mesas.filter(m => m.b && m.r == null).length : 0;
  return {
    name: t.nombre || "Torneo", roundtime: t.minutos ? String(t.minutos) : "", startdate: t.fecha || "", fecha: t.fecha || "",
    rounds, lastRound: ult ? ult.n : 0, pendientes, phase: pendientes ? "paired" : "results",
    rondasTotales: t.rondas || null, updatedAt: Date.now(),
    standings: clasificacion(t).map(p => ({ place: p.puesto, name: p.nombre, w: p.w, l: p.l, t: p.e, pts: p.pts })),
  };
}

/* Para el historial: la tabla final y las partidas como [ronda, a, b, g], con a
   y b el puesto (índice) en esa tabla — el mismo formato de las rachas. */
export function aHistorial(t){
  const tab = clasificacion(t), puesto = Object.fromEntries(tab.map((p, i) => [p.id, i]));
  const partidas = [];
  rondasDe(t).forEach(({ n, mesas }) => mesas.forEach(m => {
    if (m.b && m.r != null && puesto[m.a] != null && puesto[m.b] != null) partidas.push([n, puesto[m.a], puesto[m.b], m.r]);
  }));
  return {
    standings: tab.map(p => ({ place: p.puesto, name: p.nombre, w: p.w, l: p.l, t: p.e, pts: p.pts })),
    partidas, rondas: rondasDe(t).length,
  };
}
