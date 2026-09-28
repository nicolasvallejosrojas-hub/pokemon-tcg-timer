/* ============================================================
   presencia.js — cuántas personas hay en línea
   ------------------------------------------------------------
   Versión actual: v=1   (subir el ?v= al tocar este archivo)

   Cada pestaña abierta deja una entrada en presencia/<id> con la hora del
   servidor y en qué página está, y nada más: ni uid ni nombre. Firebase la
   borra sola cuando la pestaña se desconecta (onDisconnect), y un latido cada
   2 minutos la mantiene al día. Se cuentan las entradas de los últimos 5
   minutos; las de más de 10 (una desconexión que no alcanzó a avisar) las
   borra la primera página que las ve.

   Es un contador de pestañas, no de personas: la misma persona con dos
   pestañas cuenta dos. Para una tienda eso alcanza.
   ============================================================ */
import { ref, push, set, remove, onValue, onDisconnect, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const LATIDO = 120000, VIGENTE = 300000, VIEJA = 600000;

/* Marca esta pestaña como en línea. `pagina`: portada, cuenta, muro,
   tiendas, timer, panel o herramientas (las que aceptan las reglas). */
export function estoyEnLinea(db, pagina){
  const yo = push(ref(db, "presencia"));
  let latido = null;
  const marcar = () => set(yo, { t: serverTimestamp(), p: pagina }).catch(() => {});
  onValue(ref(db, ".info/connected"), s => {
    clearInterval(latido);
    if (s.val() !== true) return;
    /* Primero el aviso de salida y después la marca: si la conexión se corta
       en medio, no queda una entrada sin quien la borre. */
    onDisconnect(yo).remove().then(marcar).catch(() => {});
    latido = setInterval(marcar, LATIDO);
  });
}

/* Llama a cb(total, porPagina) cada vez que cambia. cb(null) si no se pudo leer. */
export function contarEnLinea(db, cb){
  let desfase = 0;
  onValue(ref(db, ".info/serverTimeOffset"), s => desfase = s.val() || 0);
  onValue(ref(db, "presencia"), s => {
    const ahora = Date.now() + desfase, porPagina = {};
    let total = 0;
    s.forEach(c => {
      const v = c.val() || {};
      if (typeof v.t !== "number") return;
      if (v.t < ahora - VIEJA){ remove(c.ref).catch(() => {}); return; }
      if (v.t < ahora - VIGENTE) return;
      total++;
      porPagina[v.p || "otra"] = (porPagina[v.p || "otra"] || 0) + 1;
    });
    cb(total, porPagina);
  }, () => cb(null));
}

/* El texto de la pastilla: «1 persona en línea», «12 personas en línea». */
export const textoEnLinea = n => n + (n === 1 ? " persona en línea" : " personas en línea");
