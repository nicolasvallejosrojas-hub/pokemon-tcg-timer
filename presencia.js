/* ============================================================
   presencia.js — cuántas personas hay en línea, y cuántas visitas
   ------------------------------------------------------------
   Versión actual: v=4   (subir el ?v= al tocar este archivo)

   Cada pestaña abierta deja una entrada en presencia/<id> con la hora del
   servidor y en qué página está, y nada más: ni uid ni nombre. Firebase la
   borra sola cuando la pestaña se desconecta (onDisconnect), y un latido cada
   2 minutos la mantiene al día. Se cuentan las entradas de los últimos 5
   minutos; las de más de 10 (una desconexión que no alcanzó a avisar) las
   borra la primera página que las ve.

   Es un contador de pestañas, no de personas: la misma persona con dos
   pestañas cuenta dos. Para una tienda eso alcanza.

   Solo herramientas.html cuenta (contarEnLinea): leer presencia/ es de quien
   administra (reglas). Hasta el 28-09-2026 lo mostraban también la portada, el
   muro y tiendas, y así cada visita bajaba la lista entera: como cualquiera
   puede escribir una entrada, un script podía inflarla y subir la cuenta.

   También suelta la conexión con Firebase cuando la pestaña pasa 20 segundos
   en segundo plano (teléfono bloqueado, otra app encima) y la retoma al
   volver. Lo que se paga es la conexión abierta, no los datos, así que es el
   ahorro más grande. El panel no se duerme: la tienda lo necesita siempre.

   Visitas (contarVisita, la llama estoyEnLinea): un número por día y página
   en stats/visitas/<día>/<página> — «v» cada vez que se abre, «u» la primera
   vez del día en ese navegador (una marca en localStorage). Si la página es de
   una tienda, lo mismo en stats/tiendas/<tienda>/…, que ve quien la organiza.
   No se guarda quién visita: solo los números. Las reglas solo dejan sumar de
   a uno. Las lee estadisticas.html (quien administra) y el panel de cada tienda.
   ============================================================ */
import { ref, push, set, update, remove, onValue, onDisconnect, serverTimestamp, goOffline, goOnline, increment }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const LATIDO = 120000, VIGENTE = 300000, VIEJA = 600000;

/* El día de hoy en la hora del teléfono, como 2026-09-28. */
const hoy = () => { const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

/* Suma esta visita. `tienda`: el id de la tienda si la página es de una (su
   perfil, su timer, su muro, su widget). Nunca falla hacia afuera; la promesa
   se cumple cuando las sumas llegaron (o fallaron). */
export function contarVisita(db, pagina, tienda){
  const dia = hoy(), marca = "visita:" + dia + ":" + pagina + ":" + (tienda || "");
  let unica = true;
  try {
    unica = !localStorage.getItem(marca);
    localStorage.setItem(marca, "1");
    /* Las marcas de otros días ya no sirven. */
    for (let i = localStorage.length - 1; i >= 0; i--){
      const k = localStorage.key(i);
      if (k && k.startsWith("visita:") && !k.startsWith("visita:" + dia + ":")) localStorage.removeItem(k);
    }
  } catch(e){}
  const suma = unica ? { v: increment(1), u: increment(1) } : { v: increment(1) };
  const envios = [update(ref(db, "stats/visitas/" + dia + "/" + pagina), suma).catch(() => {})];
  if (tienda && /^[a-z0-9-]{1,40}$/.test(tienda) && tienda !== "principal")
    envios.push(update(ref(db, "stats/tiendas/" + tienda + "/" + dia + "/" + pagina), suma).catch(() => {}));
  return Promise.all(envios);   // el widget espera esto antes de soltar la conexión
}

/* Marca esta pestaña como en línea y cuenta la visita. `pagina`: portada,
   cuenta, muro, tiendas, timer, panel o herramientas (las que aceptan las
   reglas); `tienda`, como en contarVisita. */
export function estoyEnLinea(db, pagina, tienda){
  contarVisita(db, pagina, tienda);
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
  if (pagina === "panel") return;
  let dormir = null;
  document.addEventListener("visibilitychange", () => {
    clearTimeout(dormir);
    if (document.hidden) dormir = setTimeout(() => { try { goOffline(db); } catch(e){} }, 20000);
    // Siempre al volver: si el teléfono cortó por su cuenta, es inofensivo.
    else try { goOnline(db); } catch(e){}
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

