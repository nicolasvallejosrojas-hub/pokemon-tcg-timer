/* ============================================================
   sala.js — de qué sala habla esta pestaña
   ------------------------------------------------------------
   Versión actual: v=3   (subir el ?v= al tocar este archivo)

   Existe porque estas tres líneas estaban copiadas en admin.html,
   timer-view.html y muro.html, y las copias YA HABÍAN DIVERGIDO: la de
   muro.html no normalizaba tildes y cortaba a 40 en vez de 24, así que
   ?sala=Café resolvía a "cafe" en el panel y a "caf--" en el muro — dos salas
   distintas, con datos distintos, sin que nada avisara.

   Ese es el costo real de duplicar cuatro líneas: no las cuatro líneas, sino
   que un día dejan de ser iguales.
   ============================================================ */

/* Nombre de sala apto para una ruta de Firebase: sin tildes, sin mayúsculas y
   sin los caracteres que la base prohíbe en una clave. */
export const slug = (v, largo = 24) => (v || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, largo);

/* Desde el 27-09-2026 una tienda tiene hasta MAX_TIMERS timers. El 1 es la
   sala con el mismo id de la tienda (la de siempre); el 2 en adelante son
   <tienda>-t2, <tienda>-t3… Cada timer tiene su reloj, sus mesas y su sorteo;
   lo que es de la TIENDA —historial, puntos, agenda, IDs compartidos— vive
   siempre en la sala de la tienda, se archive desde el timer que se archive.
   El tope lo ponen las reglas de Firebase, no esta página. */
export const MAX_TIMERS = 5;
export const tiendaDe = s => (s || "").replace(/-t([2-9]|[1-9][0-9])$/, "");
export const numTimer = s => +((/-t([2-9]|[1-9][0-9])$/.exec(s || "") || [0, 1])[1]);
export const salaDeTimer = (tienda, n) => n > 1 ? tienda + "-t" + n : tienda;

/* El id de una tienda llega a 24 letras; el de su timer, a 24 + «-t5». */
export const SALA   = slug(new URLSearchParams(location.search).get("sala"), 28) || "principal";
export const TIENDA = tiendaDe(SALA);
export const BASE   = "salas/" + SALA;      // el timer: reloj, mesas, sorteo
export const BASE_T = "salas/" + TIENDA;    // la tienda: historial, puntos, agenda

/* Desde el 25-09-2026 una sala es también una TIENDA: tiendas/<id> en Firebase
   guarda su nombre, su color y quiénes la organizan, con el mismo id. Estas
   dos cosas se muestran igual en el perfil, el muro y el panel. */
export const COLOR_TIENDA = "#0B7F6C";

/* Sin perfil guardado, el nombre sale del id: «cartas-del-sur» → «Cartas del sur». */
export const nombreTienda = (perfil, id) => (perfil && perfil.nombre) ||
  (id.charAt(0).toUpperCase() + id.slice(1)).replace(/-/g, " ");

/* Las dos letras del logo cuando la tienda no subió uno: «Cartas del Sur» → CS. */
export function iniciales(nombre){
  const p = String(nombre || "?").split(/\s+/).filter(w => w && !/^(de|del|la|las|los|el|y)$/i.test(w));
  if (!p.length) return "?";
  return (p[0][0] + (p[1] ? p[1][0] : (p[0][1] || ""))).toUpperCase();
}
