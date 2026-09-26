/* ============================================================
   sala.js — de qué sala habla esta pestaña
   ------------------------------------------------------------
   Versión actual: v=2   (subir el ?v= al tocar este archivo)

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
export const slug = v => (v || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 24);

export const SALA = slug(new URLSearchParams(location.search).get("sala")) || "principal";
export const BASE = "salas/" + SALA;

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
