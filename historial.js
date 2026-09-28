/* ============================================================
   historial.js — el historial de una tienda, guardado en el celular
   ------------------------------------------------------------
   Versión actual: v=1   (subir el ?v= al tocar este archivo)

   Un torneo archivado no cambia nunca: solo se agregan torneos o se borran.
   Así que cada celular guarda los que ya vio y a Firebase le pide solo los
   más nuevos que el último que tiene (las claves push van en orden de
   creación). Sin esto, cada visita al muro bajaba el historial entero de
   cada tienda, que crece con cada torneo.

   Borrar un torneo cambia salas/<sala>/historialVer (lo escribe el panel).
   Si no coincide con la que guardó el celular, se baja todo de nuevo.

   ponytail: si el almacenamiento del navegador se llena, simplemente no se
   guarda y se baja completo como antes. Y si borran una tienda y otra se
   crea con el mismo id, el celular mostraría los torneos viejos hasta que
   borre uno; para eso haría falta guardar también la fecha de alta.
   ============================================================ */
import { ref, query, orderByKey, startAfter, onValue }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* Llama a cb(historial) cada vez que cambia, con el mismo objeto
   { id: torneo } que daba leer salas/<sala>/historial. fallo() si no se pudo.
   Devuelve una función para dejar de escuchar. */
export function leerHistorial(db, sala, cb, fallo = () => {}){
  const k = "hist-" + (typeof EMULADOR !== "undefined" && EMULADOR ? "emu-" : "") + sala;
  let c = null, apagar = null;
  try { c = JSON.parse(localStorage.getItem(k) || "null"); } catch(e){}
  const parar = onValue(ref(db, "salas/" + sala + "/historialVer"), s => {
    const ver = s.val() ?? null;
    if (!c || c.ver !== ver || typeof c.datos !== "object") c = { ver, datos: {} };
    if (apagar) apagar();
    const ult = Object.keys(c.datos).sort().pop(), base = ref(db, "salas/" + sala + "/historial");
    apagar = onValue(ult ? query(base, orderByKey(), startAfter(ult)) : base, s2 => {
      Object.assign(c.datos, s2.val() || {});
      try { localStorage.setItem(k, JSON.stringify(c)); } catch(e){}
      cb({ ...c.datos });
    }, fallo);
  }, fallo);
  return () => { parar(); if (apagar) apagar(); };
}

/* Una sola lectura, para quien no necesita seguir los cambios. */
export const historialUnaVez = (db, sala) => new Promise(res => {
  const off = leerHistorial(db, sala, h => { setTimeout(() => off()); res(h); }, () => res({}));
});
