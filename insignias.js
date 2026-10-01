/* ============================================================
   insignias.js — el catálogo y la cuenta de las insignias
   ------------------------------------------------------------
   Versión actual: v=4   (subir el ?v= al tocar este archivo)

   Dos tipos:
     · PERMANENTES: son de la cuenta. Cuentan los torneos de todas las tiendas
       que se pueden leer y no se pierden. Medalla redonda.
     · DE TIENDA: las entrega cada tienda. Las automáticas salen de jugar ahí
       (la tienda las puede apagar); las de evento las crea el dueño para una
       fecha y se ganan jugando el torneo de esa fecha. Parche cuadrado con el
       color y la sigla de la tienda.

   Nada de esto se guarda por jugador: se calcula cada vez con datos que el
   jugador no puede escribir —el historial (lo archiva el organizador), las
   insignias de evento (las crea el dueño), la hora de alta (la pone el
   servidor) y beta/testers (solo se escribe al gastar un código de invitación)—. Así nadie se regala una.

   Lo usan el muro (perfil propio y ajeno) y el panel (las de evento). No lee
   nada del navegador al cargarse, así que se puede probar con node.
   ============================================================ */
import { clasificar, mesDe, nombreMes, PUNTOS_DEF } from "./clasificacion.js?v=1";

export const BETA_CUPOS = 100;
export const NIVELES = ["bronce", "plata", "oro"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
               "agosto", "septiembre", "octubre", "noviembre", "diciembre"];


/* ------------------------------------------------------------
   Íconos, medallas y parches
   ------------------------------------------------------------ */
const svg = (d, w = 1.9) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + w +
  '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
const ESCUDO = '<path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z"/>';
export const ICONOS = {
  beta:       '<span class="beta">β</span>',
  debut:      svg('<path d="M5 21V4h11l-2 4 2 4H5"/>'),
  veterano:   svg(ESCUDO + '<path d="M12 8v8M8.5 11.5h7"/>'),
  invicto:    svg(ESCUDO + '<path d="M9 12l2 2 4-4"/>'),
  ruta:       svg('<path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>'),
  calendario: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4"/>'),
  llama:      svg('<path d="M12 3c.8 3.6 5 5.2 5 10a5 5 0 0 1-10 0c0-2.4 1.3-3.9 2.4-4.9.2 1.9 1.3 2.9 2.4 2.9-.3-2.8-.8-5.3.2-8z"/>'),
  trofeo:     svg('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5.5A2.5 2.5 0 0 0 8 10.5M16 6h2.5A2.5 2.5 0 0 1 16 10.5M12 13v4M8.5 20.5h7M10 17h4v3.5h-4z"/>'),
  local:      svg('<path d="M4 10.5V20h16v-9.5M3 10.5L5 4h14l2 6.5z"/><path d="M9.5 20v-5h5v5"/>'),
  corona:     svg('<path d="M4 17.5L3 7l5 4 4-6 4 6 5-4-1 10.5z"/><path d="M5 20.5h14"/>'),
  podio:      svg('<path d="M3 20.5h18M4.5 20.5v-6h4.5v6M9 20.5V9.5h6v11M15 20.5v-8h4.5v8"/>'),
  estrella:   svg('<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9z"/>'),
  rayo:       svg('<path d="M13 3L5 13.5h6l-1 7.5 8-10.5h-6z"/>'),
  torta:      svg('<path d="M4 20.5h16v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z"/><path d="M4 16c2 1.2 4 1.2 6 0s4-1.2 6 0 3 1 4 .5M12 11.5V8M12 5.5v.01"/>'),
  espadas:    svg('<path d="M5 19l7-7M19 19l-7-7M14.5 4.5h5v5L12 17M9.5 4.5h-5v5L12 17"/>'),
  candado:    svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', 2.4),
};
/* Los que puede elegir una tienda para una insignia de evento. Las reglas de
   Firebase aceptan exactamente estos nombres. */
export const ICONOS_EVENTO = ["estrella", "torta", "corona", "rayo", "espadas", "trofeo", "llama", "local"];

/* Familias de las medallas: degradé de arriba a abajo y la tinta del ícono,
   elegida para que se lea sobre el tono del medio (oro y plata la llevan
   oscura). */
const TONOS = {
  beta:   ["#FF8A3D", "#D93A2B"], menta: ["#1FA487", "#0B6F5E"], plata: ["#C9D2DF", "#8C99AE", "#243044"],
  bronce: ["#D98B4A", "#9A5422"], oro:   ["#FFD54A", "#E0A800", "#4A3300"], verde: ["#2CB67D", "#0A7462"],
  coral:  ["#FF7A63", "#D8402C"], noche: ["#4B5D8A", "#26324F"], uva:   ["#A77BE0", "#6B3FB0"],
};
const candado = ok => ok ? "" : '<i class="cand">' + ICONOS.candado + "</i>";

/* Permanente: medalla redonda. `anillo` es el nivel (1 bronce … 3 oro) en las
   que tienen niveles; 0 en las que no. */
export function medalla(ico, tono, { s = 64, ok = true, anillo = 0 } = {}){
  const [c1, c2, tinta = "#fff"] = TONOS[tono] || TONOS.menta;
  return '<span class="med' + (ok ? "" : " no") + (anillo ? " nivel n-" + NIVELES[anillo - 1] : "") +
    '" style="--s:' + s + "px;--c1:" + c1 + ";--c2:" + c2 + ";--tinta:" + tinta + '">' +
    (ICONOS[ico] || "") + candado(ok) + "</span>";
}

/* El color de la tienda en degradé: el guardado abajo, uno más claro arriba. */
export function colorTienda(hex){
  const c = /^#[0-9a-f]{6}$/i.test(hex || "") ? hex : "#0B7F6C";
  const n = parseInt(c.slice(1), 16), rgb = [n >> 16, (n >> 8) & 255, n & 255];
  const hacia = (k, t) => "#" + rgb.map(v => Math.round(v + (t - v) * k).toString(16).padStart(2, "0")).join("");
  return [hacia(.24, 255), hacia(.12, 0)];
}

/* De tienda: parche cuadrado con el color y la sigla de la tienda. Las de
   evento llevan el borde punteado. */
export function parche(ico, color, sigla, { s = 64, ok = true, anillo = 0, evento = false } = {}){
  const [c1, c2] = colorTienda(color);
  return '<span class="par' + (ok ? "" : " no") + (anillo ? " nivel n-" + NIVELES[anillo - 1] : "") + (evento ? " evento" : "") +
    '" style="--s:' + s + "px;--c1:" + c1 + ";--c2:" + c2 + '">' + (ICONOS[ico] || "") +
    "<em>" + esc(sigla) + "</em>" + candado(ok) + "</span>";
}

/* ------------------------------------------------------------
   Quién es quién en el historial
   ------------------------------------------------------------ */
/* esc() es la global de config.js: todas las páginas que importan este módulo la cargan antes. */
export const norm = s => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
/* La misma clave que usan las rachas: los reservados, por uid; el resto, por nombre. */
export const claveFila = p => p.reservado ? "u:" + p.uid : norm(p.name);
const filasDe = t => Object.values(t.standings || {});
const orden = (a, b) => (a.fecha || "").localeCompare(b.fecha || "") || (a.creado || 0) - (b.creado || 0);

/* Las filas de un jugador en el historial de una tienda, de la más vieja a la
   más nueva: el orden dice CUÁNDO se ganó cada insignia. */
export function filasEn(hist, esDe){
  const out = [];
  Object.values(hist || {}).sort(orden).forEach(t => {
    const fila = filasDe(t).find(esDe);
    if (fila) out.push({ torneo: t, fila });
  });
  return out;
}

export const fechaLarga = f => {
  const [a, m, d] = String(f || "").split("-");
  return a && m && d ? +d + " de " + MESES[+m - 1] + " de " + a : "";
};
const isoLocal = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const hoy = () => isoLocal(new Date());

/* Una cuenta con niveles: la serie trae la fecha en que se sumó cada unidad,
   así que el nivel n se ganó en la fecha número niveles[n-1]. */
function evaluar(niveles, serie){
  const v = serie.length, nivel = niveles.filter(n => v >= n).length, sig = niveles[nivel];
  return { v, nivel, ok: nivel > 0, sig, fecha: nivel ? serie[niveles[nivel - 1] - 1] : null };
}
/* Lo que se dibuja bajo la insignia cuando todavía se puede subir. */
function progreso(niveles, r){
  if (r.sig === undefined) return null;
  const txt = r.ok ? r.v + " de " + r.sig + " para " + NIVELES[r.nivel] : r.v + " de " + r.sig;
  return (niveles.length > 1 || r.sig > 1) ? { v: r.v, meta: r.sig, txt } : null;
}

/* ------------------------------------------------------------
   Permanentes
   ------------------------------------------------------------ */
export const PERMANENTES = [
  { id: "beta", nombre: "Beta tester", tono: "beta", ico: "beta",
    como: "Ser de los primeros " + BETA_CUPOS + " en registrarse o entrar con invitación" },
  { id: "debut", nombre: "Debut", tono: "menta", ico: "debut", niveles: [1], serie: "torneos",
    como: "Juega tu primer torneo", logro: () => "Primer torneo jugado" },
  { id: "veterano", nombre: "Veterano", tono: "plata", ico: "veterano", niveles: [10, 25, 50], serie: "torneos",
    como: "Juega 10 torneos", logro: v => v + " torneos jugados" },
  { id: "constante", nombre: "Constante", tono: "coral", ico: "llama", niveles: [3, 6, 12], serie: "meses",
    como: "Juega en 3 meses distintos", logro: v => v + " meses con torneos" },
  { id: "trotamundos", nombre: "Trotamundos", tono: "noche", ico: "ruta", niveles: [3], serie: "tiendas",
    como: "Juega en 3 tiendas distintas", logro: () => "Jugó en 3 tiendas" },
  { id: "campeon", nombre: "Campeón", tono: "oro", ico: "trofeo", niveles: [1], serie: "campeon",
    como: "Gana un torneo", logro: v => v === 1 ? "Ganó un torneo" : "Ganó " + v + " torneos" },
  { id: "invicto", nombre: "Invicto", tono: "verde", ico: "invicto", niveles: [1], serie: "invictos",
    como: "Termina un torneo de 3 rondas o más sin perder", logro: () => "Un torneo sin derrotas" },
  { id: "imparable", nombre: "Imparable", tono: "bronce", ico: "rayo", niveles: [5], serie: "racha",
    como: "Gana 5 partidas seguidas", logro: () => "5 partidas seguidas ganadas" },
  { id: "aniversario", nombre: "Aniversario", tono: "uva", ico: "calendario", niveles: [12], serie: "mesesCuenta",
    como: "Cumple un año con cuenta", logro: () => "Un año con cuenta", conAlta: true },
];

/* La fecha en que se sumó cada unidad de cada cuenta, con todas las tiendas
   juntas. `tiendas` es { sala: historial }. */
export function series(tiendas, esDe, alta){
  const todas = [];
  Object.entries(tiendas).forEach(([sala, hist]) => filasEn(hist, esDe).forEach(m => todas.push({ ...m, sala })));
  todas.sort((a, b) => orden(a.torneo, b.torneo));
  const s = { torneos: [], meses: [], tiendas: [], campeon: [], invictos: [], racha: [], mesesCuenta: [] };
  const meses = new Set(), salas = new Set();
  let racha = 0, mejor = 0;
  todas.forEach(({ torneo: t, fila: f, sala }) => {
    const fecha = t.fecha || "";
    s.torneos.push(fecha);
    const mes = mesDe(t);
    if (mes && !meses.has(mes)){ meses.add(mes); s.meses.push(fecha); }
    if (!salas.has(sala)){ salas.add(sala); s.tiendas.push(fecha); }
    if (f.place === 1) s.campeon.push(fecha);
    /* Un bye cuenta como victoria, igual que en la tabla. */
    if (!(+f.l) && (+f.w || 0) + (+f.t || 0) >= 3) s.invictos.push(fecha);
    /* La racha, partida por partida: solo en los torneos que traen sus
       partidas, que se archivan desde el 25-09. Empate y doble derrota la cortan. */
    const yo = filasDe(t).indexOf(f);
    Object.values(t.partidas || {}).sort((x, y) => x[0] - y[0]).forEach(([, a, b, g]) => {
      if (a !== yo && b !== yo) return;
      racha = (g === 1 && a === yo) || (g === 2 && b === yo) ? racha + 1 : 0;
      if (racha > mejor){ mejor = racha; s.racha.push(fecha); }
    });
  });
  if (alta){
    const d = new Date(alta);
    for (let m = 1; m <= 120; m++){
      const x = new Date(d); x.setMonth(x.getMonth() + m);
      if (x.getTime() > Date.now()) break;
      s.mesesCuenta.push(isoLocal(x));
    }
  }
  return s;
}

/* Las permanentes de un jugador, como fichas listas para dibujar. `alta` y
   `numero` (su orden de registro) solo se conocen si se sabe su uid. */
export function permanentes({ tiendas, esDe, alta = null, numero = null, tester = false }){
  const s = series(tiendas, esDe, alta);
  return PERMANENTES.map(def => {
    const base = { key: "p:" + def.id, tipo: "perm", ico: def.ico, tono: def.tono, como: def.como };
    if (def.id === "beta"){
      /* Los primeros BETA_CUPOS registros, o quien entró con un código de la beta. */
      const primero = numero != null && numero <= BETA_CUPOS, ok = primero || tester;
      /* Quien no la tiene no la ve: no se puede ganar después. */
      return ok ? { ...base, ok, marca: base.key, anillo: 0, titulo: def.nombre, texto: primero ? "Registro Nº " + numero : "Entró por invitación",
                    rareza: "Solo en la beta", fecha: alta ? isoLocal(new Date(alta)) : null } : null;
    }
    if (def.conAlta && !alta) return null;
    const r = evaluar(def.niveles, s[def.serie]), conNiveles = def.niveles.length > 1;
    return { ...base, ok: r.ok, anillo: conNiveles ? r.nivel : 0, marca: base.key + (conNiveles ? ":" + r.nivel : ""),
             titulo: def.nombre + (conNiveles && r.ok ? " · " + NIVELES[r.nivel - 1] : ""),
             texto: r.ok ? def.logro(r.v) : def.como, prog: progreso(def.niveles, r), fecha: r.fecha, v: r.v };
  }).filter(Boolean);
}

/* ------------------------------------------------------------
   De tienda
   ------------------------------------------------------------ */
export const AUTO = [
  { id: "debut", nombre: "Debut", ico: "debut", niveles: [1], como: "Juega tu primera fecha en la tienda",
    logro: () => "Primera fecha acá" },
  { id: "local", nombre: "Local", ico: "local", niveles: [5, 10, 25], como: "Juega 5 fechas en la tienda",
    logro: v => v + " fechas en la tienda" },
  { id: "podio", nombre: "Podio", ico: "podio", niveles: [1], como: "Termina entre los 3 primeros de un torneo",
    logro: v => v === 1 ? "Top 3 en un torneo" : "Top 3 en " + v + " torneos" },
  { id: "mes", nombre: "Campeón del mes", ico: "corona", niveles: [1], como: "Termina 1º en la clasificación de un mes",
    logro: (v, meses) => nombreMes(meses[meses.length - 1]) + (v > 1 ? " · ×" + v : "") },
];

/* Los meses ya cerrados y quién quedó 1º en cada uno: la misma cuenta de la
   clasificación que ven los jugadores, con los puntos de la tienda. */
export function campeonesDelMes(hist, cfg, dia = hoy()){
  const torneos = Object.values(hist || {}), actual = dia.slice(0, 7);
  return [...new Set(torneos.map(mesDe).filter(Boolean))].filter(m => m < actual).sort()
    .map(mes => ({ mes, fila: clasificar(torneos, mes, cfg || PUNTOS_DEF)[0] })).filter(c => c.fila);
}

/* Cuánto lleva cada jugador de la tienda en cada automática: para «La tienen N». */
function poblacion(hist, campeones){
  const p = {};
  Object.values(hist || {}).forEach(t => filasDe(t).forEach(f => {
    const k = claveFila(f), x = p[k] ??= { debut: 0, local: 0, podio: 0, mes: 0 };
    x.debut++; x.local++; if (f.place >= 1 && f.place <= 3) x.podio++;
  }));
  campeones.forEach(c => { const k = claveFila(c.fila); if (p[k]) p[k].mes++; });
  return Object.values(p);
}

/* Lo que pasó con una insignia de evento: los torneos de su fecha y quiénes la
   ganaron. Lo usa también el panel para decir «Entregada a N». */
export function repartoEvento(e, hist, dia = hoy()){
  const torneos = Object.values(hist || {}).filter(t => t.fecha === e.fecha);
  const gana = f => e.modo === "top" ? f.place >= 1 && f.place <= (e.top || 0)
                  : e.modo === "elegidos" ? Object.values(e.elegidos || {}).includes(claveFila(f)) : true;
  const ganadores = [];
  torneos.forEach(t => filasDe(t).forEach(f => { if (gana(f)) ganadores.push(f); }));
  return { torneos, ganadores, estado: torneos.length ? "entregada" : e.fecha >= dia ? "programada" : "sin torneo" };
}

/* Las de una tienda para un jugador. `color` y `sigla` salen del perfil de la
   tienda y los pone quien llama. Las de evento aparecen si se ganaron o si la
   fecha todavía no llega (para que den ganas de ir); si pasó sin ganarla, no. */
export function deTienda({ sala, hist, cfg, tienda, esDe, color, sigla, dia = hoy() }){
  const ins = (tienda && tienda.insignias) || {}, auto = ins.auto || {};
  const filas = filasEn(hist, esDe), campeones = campeonesDelMes(hist, cfg, dia);
  const meses = campeones.filter(c => esDe(c.fila)).map(c => c.mes);
  const serie = { debut: filas.map(m => m.torneo.fecha), local: filas.map(m => m.torneo.fecha),
                  podio: filas.filter(m => m.fila.place >= 1 && m.fila.place <= 3).map(m => m.torneo.fecha), mes: meses };
  const gente = poblacion(hist, campeones);
  const base = { tipo: "tienda", sala, color, sigla };
  const items = AUTO.filter(d => auto[d.id] !== false).map(d => {
    const r = evaluar(d.niveles, serie[d.id]), conNiveles = d.niveles.length > 1;
    const umbral = d.niveles[Math.max(0, r.nivel - 1)], tienen = gente.filter(x => x[d.id] >= umbral).length;
    return { ...base, key: "t:" + sala + ":" + d.id, marca: "t:" + sala + ":" + d.id + (conNiveles ? ":" + r.nivel : ""),
             ico: d.ico, ok: r.ok, anillo: conNiveles ? r.nivel : 0, como: d.como,
             titulo: d.nombre + (conNiveles && r.ok ? " · " + NIVELES[r.nivel - 1] : ""),
             texto: r.ok ? d.logro(r.v, meses) : d.como, prog: progreso(d.niveles, r),
             fecha: d.id === "mes" ? null : r.fecha, mes: d.id === "mes" && r.ok ? meses : null,
             rareza: tienen ? "La tienen " + tienen : null, v: r.v };
  });
  Object.entries(ins.eventos || {}).sort((a, b) => (a[1].fecha || "").localeCompare(b[1].fecha || "")).forEach(([id, e]) => {
    const rep = repartoEvento(e, hist, dia), mia = rep.ganadores.find(esDe);
    if (!mia && rep.estado !== "programada") return;
    const como = e.modo === "top" ? "Termina en el Top " + e.top + " del torneo del " + fechaLarga(e.fecha)
               : e.modo === "elegidos" ? "La entrega la tienda en el torneo del " + fechaLarga(e.fecha)
               : "Juega el torneo del " + fechaLarga(e.fecha);
    items.push({ ...base, key: "e:" + sala + ":" + id, marca: "e:" + sala + ":" + id, ico: e.icono, ok: !!mia, anillo: 0,
                 evento: true, titulo: e.nombre, como, fecha: mia ? e.fecha : null,
                 texto: mia ? (e.modo === "top" ? "Top " + e.top + " · " + e.fecha.slice(0, 4) : fechaLarga(e.fecha))
                            : "Juega el " + fechaLarga(e.fecha).replace(/ de \d{4}$/, ""),
                 rareza: mia ? "La tienen " + rep.ganadores.length : "Evento de la tienda" });
  });
  return items;
}
