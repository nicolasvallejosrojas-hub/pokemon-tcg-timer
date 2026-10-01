/* ============================================================
   listamazo.js — la lista de mazo de las inscripciones
   ------------------------------------------------------------
   Versión actual: v=1   (subir el ?v= al tocar este archivo)

   La usan la página de inscripción (el jugador la escribe y ve si está bien)
   y el panel (la tienda imprime las de todos). Vive acá para que las dos
   lean la lista igual: si el panel la entendiera distinto que el jugador, la
   hoja impresa no sería la que el jugador revisó.

   El formato es el que exporta el juego en línea (y cualquier sitio de mazos):

       Pokémon: 12
       4 Dreepy TWM 128
       ...
       Trainer: 36          (o «Entrenador:»)
       4 Arven SVI 166
       ...
       Energy: 12           (o «Energía:»)
       8 Basic {P} Energy SVE 5

   Se guarda el TEXTO tal cual y se lee al mostrarlo: así lo que el jugador
   pegó no se pierde aunque la lectura cambie.
   ============================================================ */

/* La temporada de la hoja oficial. Las divisiones se definen por AÑO de
   nacimiento y se corren un año con cada temporada: al salir la hoja nueva,
   cambiar este número y listo. */
export const TEMPORADA = 2026;

export function division(nacimiento){
  const a = +String(nacimiento || "").slice(0, 4);
  if (!a) return "";
  return a >= TEMPORADA - 12 ? "Junior" : a >= TEMPORADA - 16 ? "Senior" : "Masters";
}

const SECCION = [
  ["pokemon",    /^pok[eé]mon/i],
  ["entrenador", /^(trainers?|entrenador(es)?)/i],
  ["energia",    /^(energy|energ[ií]as?)/i],
];
const TITULO = { pokemon: "Pokémon", entrenador: "Entrenador", energia: "Energía" };

/* «4 Iono PAL 185» → { cant: 4, nombre: "Iono", set: "PAL", num: "185" }.
   La expansión son 2 a 5 mayúsculas o números (PR-SV también) y el número
   puede traer letras (TG05, GG12, SV001). Sin eso, todo es nombre. */
const LINEA = /^\*?\s*(\d{1,2})x?\s+(.+?)\s*$/;
const COLA  = /^(.*\S)\s+([A-Z][A-Z0-9]{1,4}(?:-[A-Z0-9]{1,4})?)\s+([A-Z]{0,4}\d{1,4}[a-z]?)$/;

export function leerLista(texto){
  const r = { pokemon: [], entrenador: [], energia: [], total: 0, errores: [], avisos: [] };
  let sec = null;
  String(texto || "").split(/\r?\n/).forEach((crudo, i) => {
    const l = crudo.trim();
    if (!l || /^(total|cartas)/i.test(l)) return;
    const s = SECCION.find(([, re]) => re.test(l) && !/^\d/.test(l));
    if (s && /^[^\d]*[:\-–]?\s*\d*\s*$/.test(l)){ sec = s[0]; return; }
    const m = LINEA.exec(l);
    if (!m){ r.errores.push("No entendí la línea " + (i + 1) + ": «" + l + "»."); return; }
    if (!sec){ r.errores.push("Falta el título de la sección (Pokémon:, Entrenador: o Energía:) antes de «" + l + "»."); return; }
    const c = COLA.exec(m[2]);
    const carta = { cant: +m[1], nombre: c ? c[1] : m[2], set: c ? c[2] : "", num: c ? c[3] : "" };
    if (!carta.cant){ r.errores.push("La línea " + (i + 1) + " dice 0 copias."); return; }
    r[sec].push(carta);
    r.total += carta.cant;
  });
  if (r.total !== 60 && r.total) r.errores.push("El mazo tiene " + r.total + " cartas y tienen que ser 60.");
  if (!r.total) r.errores.push("La lista está vacía.");
  const sinSet = r.pokemon.filter(c => !c.set).map(c => c.nombre);
  if (sinSet.length) r.avisos.push("A los Pokémon les falta la expansión y el número: " + sinSet.join(", ") + ". La hoja oficial los pide.");
  /* Tope de 4 por nombre, salvo Energía básica. Es aviso y no error: las
     excepciones (ACE SPEC, cartas con regla propia) no las sabe esta página. */
  const n = {};
  [...r.pokemon, ...r.entrenador, ...r.energia.filter(c => !/b[aá]sic/i.test(c.nombre))]
    .forEach(c => n[c.nombre.toLowerCase()] = (n[c.nombre.toLowerCase()] || 0) + c.cant);
  const pasadas = Object.keys(n).filter(k => n[k] > 4);
  if (pasadas.length) r.avisos.push("Más de 4 copias de: " + pasadas.join(", ") + ".");
  return r;
}

export const cuenta = (r, sec) => r[sec].reduce((s, c) => s + c.cant, 0);

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const ddmmaaaa = iso => /^\d{4}-\d{2}-\d{2}$/.test(iso || "") ? iso.split("-").reverse().join("/") : "";

/* Una hoja A4 con los datos del jugador y las tres tablas, con las mismas
   columnas que la hoja oficial. La columna Reg. queda en blanco: el juego en
   línea no la exporta y la marca la revisa la tienda. */
export function hoja(ins, ev){
  const r = leerLista(ins.lista), div = division(ins.nacimiento);
  const filas = (sec, n, conSet) => {
    const cs = r[sec].map(c => "<tr><td>" + c.cant + "</td><td>" + esc(c.nombre) + "</td>" +
      (conSet ? "<td>" + esc(c.set) + "</td><td>" + esc(c.num) + "</td><td></td>" : "") + "</tr>");
    while (cs.length < n) cs.push("<tr><td>&nbsp;</td><td></td>" + (conSet ? "<td></td><td></td><td></td>" : "") + "</tr>");
    return cs.join("");
  };
  const tabla = (sec, n, conSet) => '<table><thead><tr class="t"><th colspan="' + (conSet ? 5 : 2) + '">' + TITULO[sec] +
    " · " + cuenta(r, sec) + '</th></tr><tr><th class="c">Cant.</th><th>Nombre</th>' +
    (conSet ? '<th class="s">Expansión</th><th class="s">N.º</th><th class="s">Reg.</th>' : "") + "</tr></thead><tbody>" +
    filas(sec, n, conSet) + "</tbody></table>";
  const caja = (x, si) => '<span class="caja">' + (si ? "✕" : "") + "</span>" + x;
  /* Caben 32 filas entre Pokémon y Entrenador; un mazo con más líneas
     distintas pasa a letra más chica para no partirse en dos hojas.
     ponytail: sobre ~45 líneas igual se parte; ahí habría que ir a 2 columnas. */
  const denso = Math.max(r.pokemon.length, 12) + Math.max(r.entrenador.length, 20) > 32;
  return '<section class="hojaLista' + (denso ? " denso" : "") + '">' +
    '<header><div><b>Lista de mazo · Temporada ' + TEMPORADA + "</b><br>" + esc(ev.titulo) + " · " + esc(ddmmaaaa(ev.fecha)) +
      (ev.tienda ? " · " + esc(ev.tienda) : "") + "</div><div>Formato: " + caja("Estándar", ev.formato !== "expandido") +
      " " + caja("Expandido", ev.formato === "expandido") + "</div></header>" +
    '<div class="datos"><div><small>Nombre del jugador</small>' + esc(ins.nombre + " " + ins.apellido) + "</div>" +
      "<div><small>ID de jugador</small>" + esc(ins.playerId) + "</div>" +
      "<div><small>Fecha de nacimiento (DD/MM/AAAA)</small>" + esc(ddmmaaaa(ins.nacimiento)) + "</div>" +
      "<div><small>Nick</small>" + esc(ins.nick) + "</div></div>" +
    '<div class="div">División: ' + caja("Junior (" + (TEMPORADA - 12) + " o después)", div === "Junior") + " " +
      caja("Senior (" + (TEMPORADA - 16) + "–" + (TEMPORADA - 13) + ")", div === "Senior") + " " +
      caja("Masters (" + (TEMPORADA - 17) + " o antes)", div === "Masters") + "</div>" +
    tabla("pokemon", 12, true) + '<div class="dos">' + tabla("entrenador", 20, false) + "<div>" + tabla("energia", 6, false) +
      '<table class="adm"><thead><tr class="t"><th>Uso administrativo</th></tr></thead><tbody><tr><td>&nbsp;</td></tr><tr><td>&nbsp;</td></tr></tbody></table></div></div>' +
    "<footer>Total: " + r.total + " cartas · Inscripción " + new Date(ins.actualizado || Date.now()).toLocaleString("es-CL") + "</footer></section>";
}

/* Imprime una o varias hojas (una por página) sin abrir otra ventana: se
   montan en la misma página y el CSS de impresión esconde todo lo demás. */
const CSS = "@media screen{#hojasLista{display:none}}" +
  "@media print{@page{size:A4;margin:10mm}body>*:not(#hojasLista){display:none!important}" +
  "html,body{background:#fff!important;color:#000!important}#hojasLista{display:block}}" +
  "#hojasLista{font:9pt/1.25 Arial,Helvetica,sans-serif;color:#000}" +
  ".hojaLista{break-after:page;page-break-after:always}.hojaLista:last-child{break-after:auto;page-break-after:auto}" +
  ".hojaLista header{display:flex;justify-content:space-between;gap:8mm;border-bottom:2px solid #000;padding-bottom:2mm;margin-bottom:3mm;font-size:10pt}" +
  ".hojaLista .datos{display:grid;grid-template-columns:2fr 1.2fr 1.5fr 1.3fr;gap:3mm;margin-bottom:2mm}" +
  ".hojaLista .datos div{border-bottom:1px solid #000;padding:1mm 0;font-size:10.5pt;min-height:5mm}" +
  ".hojaLista small{display:block;font-size:7pt;text-transform:uppercase;letter-spacing:.04em}" +
  ".hojaLista .div{margin:2mm 0 3mm}.hojaLista .caja{display:inline-block;width:3.2mm;height:3.2mm;border:1px solid #000;margin:0 1mm 0 3mm;vertical-align:-.5mm;text-align:center;line-height:3.2mm;font-size:8pt}" +
  ".hojaLista table{width:100%;border-collapse:collapse;margin-bottom:3mm}" +
  ".hojaLista th,.hojaLista td{border:1px solid #777;padding:.7mm 1.5mm;text-align:left;height:4.2mm}" +
  ".hojaLista tr.t th{background:#000;color:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
  ".hojaLista th.c,.hojaLista td:first-child{width:10mm;text-align:center}.hojaLista th.s{width:17mm}" +
  ".hojaLista .dos{display:grid;grid-template-columns:1fr 1fr;gap:4mm;align-items:start}.hojaLista .dos table{margin:0 0 4mm}" +
  ".hojaLista .adm td{height:7mm}" +
  ".hojaLista footer{margin-top:3mm;font-size:8pt}" +
  ".hojaLista.denso table{font-size:7.5pt}.hojaLista.denso th,.hojaLista.denso td{padding:.2mm 1.5mm;height:3.4mm}";

export function imprimir(hojas){
  let caja = document.getElementById("hojasLista");
  if (!caja){
    const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    caja = document.createElement("div"); caja.id = "hojasLista"; document.body.appendChild(caja);
  }
  caja.innerHTML = hojas.join("");
  window.print();
}
