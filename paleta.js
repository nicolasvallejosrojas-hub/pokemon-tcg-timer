/* ============================================================
   paleta.js — la paleta del sistema, derivada de dos colores
   ------------------------------------------------------------
   Vive acá y no dentro de admin.html porque la usan las dos pantallas: el
   organizador la edita y la proyectada la recibe por Firebase. La misma razón
   por la que existen estilo.css y agenda.js.

   Versión actual: v=1   (subir el ?v= al tocar este archivo)

   Por qué se piden DOS colores y no diecisiete: una paleta completa a mano
   garantiza que tarde o temprano alguien deje texto ilegible sobre su fondo.
   Acá se elige acento y base, y la rampa se calcula con el contraste como
   restricción, no como esperanza. Quien igual quiera control fino tiene los
   reemplazos manuales, que se validan uno por uno.
   ============================================================ */

/* Los tokens que esta paleta gobierna, con lo que hace cada uno. El orden es
   el que se muestra en el mapa del panel: de lo más al fondo a lo más encima. */
export const MAPA = [
  ["--pagina",       "Fondo de la página"],
  ["--campo",        "Campos de texto y fondos hundidos"],
  ["--lienzo",       "Fondo del lienzo del timer"],
  ["--sup",          "Tarjetas y paneles"],
  ["--sup-alta",     "Botones secundarios"],
  ["--accion",       "Acento: botón principal, pestaña activa"],
  ["--accion-clara", "Acento al pasar el mouse"],
  ["--texto",        "Texto principal"],
  ["--apagado",      "Texto secundario"],
  ["--rotulo",       "Rótulos en mayúscula"],
];
export const TOKENS = MAPA.map(([t]) => t);

export const DEF = { accion: "#F9D746", base: "#2A242F" };

export const PRESETS = [
  ["Original", "#F9D746", "#2A242F"],
  ["Brasa",    "#FF9A52", "#2B211C"],
  ["Bosque",   "#7FD69B", "#1E2A24"],
  ["Hielo",    "#7FD1E8", "#1D2630"],
  ["Ciruela",  "#E59BD8", "#291E2B"],
  ["Arena",    "#E8D2A0", "#2A2620"],
];

/* ------------------------------------------------------------
   Conversión entre los tres formatos
   ------------------------------------------------------------ */
export function aHsl(hex){
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = 60 * (mx === r ? ((g - b) / d + (g < b ? 6 : 0))
                 : mx === g ? (b - r) / d + 2
                 : (r - g) / d + 4);
  const l = (mx + mn) / 2;
  return { h, s: (d ? d / (1 - Math.abs(2 * l - 1)) : 0) * 100, l: l * 100 };
}

export function aHex(c){
  const s = Math.max(0, Math.min(100, c.s)) / 100;
  const l = Math.max(0, Math.min(100, c.l)) / 100;
  const h = ((c.h % 360) + 360) % 360;
  const k = (1 - Math.abs(2 * l - 1)) * s;
  const x = k * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - k / 2;
  const t = [[k,x,0],[x,k,0],[0,k,x],[0,x,k],[x,0,k],[k,0,x]][Math.floor(h / 60)];
  return "#" + t.map(v => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
}

export function aRgb(hex){
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}

/* Acepta los tres códigos que uno encuentra dado vuelta en internet:
   #abc, #aabbcc, rgb(r,g,b) y hsl(h,s%,l%). Devuelve hex, o null si no
   se entiende: null es la señal de "no toques nada". */
export function leerColor(txt){
  if (!txt) return null;
  const t = String(txt).trim().toLowerCase();

  let m = t.match(/^#?([0-9a-f]{3})$/);
  if (m) return "#" + m[1].split("").map(c => c + c).join("");

  m = t.match(/^#?([0-9a-f]{6})$/);
  if (m) return "#" + m[1];

  m = t.match(/^rgba?\(\s*([0-9.]+)[\s,]+([0-9.]+)[\s,]+([0-9.]+)/);
  if (m){
    const v = m.slice(1, 4).map(x => Math.max(0, Math.min(255, Math.round(+x))));
    return "#" + v.map(x => x.toString(16).padStart(2, "0")).join("");
  }

  m = t.match(/^hsla?\(\s*([0-9.]+)\s*(?:deg)?[\s,]+([0-9.]+)%?[\s,]+([0-9.]+)%?/);
  if (m) return aHex({ h: +m[1], s: +m[2], l: +m[3] });

  return null;
}

export function formatear(hex, modo){
  if (modo === "rgb"){
    const [r, g, b] = aRgb(hex);
    return `rgb(${r}, ${g}, ${b})`;
  }
  if (modo === "hsl"){
    const c = aHsl(hex);
    return `hsl(${Math.round(c.h)}, ${Math.round(c.s)}%, ${Math.round(c.l)}%)`;
  }
  return hex.toUpperCase();
}

/* Saca todos los colores de un texto pegado, en cualquiera de los tres
   formatos y en cualquier orden. Sirve para traer una paleta de afuera. */
export function extraerColores(txt){
  const out = [];
  const re = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g;
  let m;
  while ((m = re.exec(String(txt)))){
    const c = leerColor(m[0]);
    if (c && !out.includes(c)) out.push(c);
  }
  return out;
}

/* ------------------------------------------------------------
   Contraste (WCAG 2.1)
   ------------------------------------------------------------ */
export function luz(hex){
  return aRgb(hex)
    .map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); })
    .reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
}
export function contraste(a, b){
  const x = luz(a), y = luz(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

/* Sube la claridad de un color hasta que se lea sobre `contra`. */
function legible(c, contra, minimo){
  let n = 0;
  while (contraste(aHex(c), contra) < minimo && c.l < 97 && n++ < 97) c.l += 1;
  return aHex(c);
}

/* ------------------------------------------------------------
   La derivación
   ------------------------------------------------------------ */
export function derivar(accionHex, baseHex){
  const b = aHsl(baseHex);

  /* El producto es oscuro a propósito: se proyecta en una tienda y el panel se
     mira al lado. Se respeta el tono y la saturación elegidos, no la claridad;
     sin esto un celeste claro deja texto blanco sobre fondo blanco. */
  const corrigioBase = b.l > 20 || b.l < 8 || b.s > 30;
  b.l = Math.max(8, Math.min(20, b.l));
  b.s = Math.min(b.s, 30);

  const campo   = aHex({ h: b.h, s: b.s, l: Math.max(4, b.l - 4) });
  const sup     = aHex({ h: b.h, s: b.s, l: b.l + 10 });
  const supAlta = aHex({ h: b.h, s: b.s, l: b.l + 14 });

  /* El acento cumple DOS papeles y hay que satisfacer los dos:
       - de FONDO con texto oscuro encima (botón principal, pestaña activa),
         o sea tiene que contrastar con --campo;
       - de TEXTO sobre una tarjeta (el segmentado activo), o sea tiene que
         contrastar con --sup.
     Con solo el primero, un acento gris sobre una base clara quedaba en
     2,68:1 como texto. Los dos empujan hacia arriba, asi que basta con
     seguir aclarando hasta que ninguno falle. */
  const a = aHsl(accionHex);
  const lIni = a.l;
  let paso = 0;
  while ((contraste(aHex(a), campo) < 4.5 || contraste(aHex(a), sup) < 4.5)
         && a.l < 94 && paso++ < 95) a.l += 1;

  /* Los tres grises de texto llevan un dejo del tono de la base para que no se
     vean azulados sobre un fondo cálido. La claridad NO es fija: sube hasta
     pasar 4,5:1 contra --sup-alta, que es la superficie más clara donde pueden
     caer. Con claridad fija (78 y 70) una base tibia dejaba el rótulo en
     3,19:1, que es justamente el error que esto evita. */
  const t = {
    "--pagina":       aHex({ h: b.h, s: b.s, l: b.l }),
    "--campo":        campo,
    "--lienzo":       aHex({ h: b.h, s: b.s, l: b.l + 5 }),
    "--sup":          sup,
    "--sup-alta":     supAlta,
    "--accion":       aHex(a),
    "--accion-clara": aHex({ h: a.h, s: a.s, l: Math.min(94, a.l + 8) }),
    "--texto":        legible({ h: b.h, s: Math.min(b.s, 12), l: 95 }, supAlta, 4.5),
    "--apagado":      legible({ h: b.h, s: Math.min(b.s, 14), l: 78 }, supAlta, 4.5),
    "--rotulo":       legible({ h: b.h, s: Math.min(b.s, 14), l: 70 }, supAlta, 4.5),
  };
  t.corrigioBase = corrigioBase;
  t.corrigioAccion = Math.round(a.l - lIni);
  return t;
}

/* La rampa derivada se acerca a la disenada pero no la clava (--sup da
   #493f52 y el token es #453D4E). Cuando la paleta ES la original conviene no
   calcular nada y devolver el control a estilo.css: "volver a la original"
   tiene que devolver la original, no una aproximacion. */
export function esOriginal(pal){
  if (!pal) return true;
  return (pal.accion || DEF.accion).toLowerCase() === DEF.accion.toLowerCase()
      && (pal.base   || DEF.base).toLowerCase()   === DEF.base.toLowerCase()
      && !Object.keys(pal.manual || {}).length;
}

/* Tokens finales: la rampa derivada con los reemplazos manuales encima. */
export function resolver(pal){
  const t = derivar(pal.accion || DEF.accion, pal.base || DEF.base);
  const man = pal.manual || {};
  TOKENS.forEach(k => { if (man[k]) t[k] = man[k]; });
  return t;
}

/* Revisa los pares que de verdad ocurren en pantalla. La lista NO es teorica:
   salio de recorrer el DOM del panel y anotar que color de texto cae sobre que
   fondo. Antes incluia --rotulo sobre --sup-alta, que da 3,86 hasta en la
   paleta disenada y nunca ocurre: eso marcaba como rota una paleta sana.
   Devuelve solo lo que falla, para mostrarlo al lado del token. */
export function revisar(t){
  const pares = [
    ["--texto",   "--pagina",   "Texto principal sobre el fondo"],
    ["--texto",   "--campo",    "Texto dentro de los campos"],
    ["--texto",   "--sup",      "Texto principal sobre las tarjetas"],
    ["--texto",   "--sup-alta", "Texto sobre los botones secundarios"],
    ["--apagado", "--sup",      "Texto secundario sobre las tarjetas"],
    ["--rotulo",  "--sup",      "Rotulos sobre las tarjetas"],
    ["--accion",  "--sup",      "Acento como texto sobre las tarjetas"],
    ["--campo",   "--accion",   "Texto oscuro sobre el acento"],
  ];
  const malos = [];
  pares.forEach(([a, b, texto]) => {
    const r = contraste(t[a], t[b]);
    if (r < 4.5) malos.push({ a, b, r: Math.round(r * 100) / 100, min: 4.5, texto });
  });
  return malos;
}

/* Escribe los tokens en un elemento. `null` los borra y devuelve el control a
   estilo.css, que es lo que hace "volver a la original". */
export function aplicar(el, t){
  TOKENS.forEach(k => {
    if (t && t[k]) el.style.setProperty(k, t[k]);
    else el.style.removeProperty(k);
  });
}
