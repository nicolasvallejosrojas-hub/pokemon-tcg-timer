/* ============================================================
   mantenimiento.js — la pantalla de «Cerrado por mantenimiento»
   ------------------------------------------------------------
   Versión actual: v=1   (subir el ?v= al tocar este archivo)

   El cierre de verdad NO está acá: lo hacen las reglas de Firebase. Con
   sistema/mantenimiento/activo = true nadie lee ni escribe nada, salvo quien
   administra (admins/<uid>, puesto a mano en la consola). Esta pantalla solo
   lo explica. Quitarla desde la consola del navegador no sirve de nada: la
   página queda sin datos y sin poder guardar.

   Quien administra entra con su correo y su clave de siempre (las verifica
   Firebase, no esta página), sigue viendo todo con un aviso, y desde ahí
   abre el sitio. Lo usan todas las páginas.
   ============================================================ */
import { ref, onValue, get, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const RECUERDO = "mantenimiento";   // la última vez que se supo: para no mostrar la página un instante
const ERRORES = {
  "auth/invalid-credential": "El correo o la clave no coinciden.",
  "auth/wrong-password": "El correo o la clave no coinciden.",
  "auth/user-not-found": "El correo o la clave no coinciden.",
  "auth/too-many-requests": "Demasiados intentos seguidos. Espera un momento.",
  "auth/network-request-failed": "Sin conexión. Revisa tu internet.",
};
const LLAVE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' +
  'stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a4.5 4.5 0 0 0-5.9 5.9L3.5 17.5a1.8 1.8 0 0 0 2.5 2.5l5.3-5.3a4.5 ' +
  '4.5 0 0 0 5.9-5.9l-2.8 2.8-2.5-.5-.5-2.5z"/></svg>';

const CSS = `
.mant{position:fixed;inset:0;z-index:10000;background:var(--pagina);display:flex;align-items:center;justify-content:center;
  padding:24px 16px;overflow:auto;color:var(--texto);}
.mant .caja{width:100%;max-width:420px;text-align:center;}
.mant .marca{font-family:var(--fuente-reloj);font-weight:300;font-size:var(--t5);color:var(--franja);}
.mant .ico{width:76px;height:76px;margin:28px auto 20px;border-radius:50%;display:grid;place-items:center;color:#fff;
  background:linear-gradient(145deg,#FF8A3D,#D93A2B);box-shadow:inset 0 0 0 3px rgba(255,255,255,.3),0 10px 22px -12px #D93A2B;}
.mant .ico svg{width:36px;height:36px;}
.mant h1{font-size:var(--d3);line-height:1.1;letter-spacing:-.02em;margin:0 0 10px;}
.mant p{color:var(--apagado);font-size:var(--t4);line-height:1.5;margin:0;}
.mant details{margin-top:40px;text-align:left;}
.mant summary{cursor:pointer;color:var(--rotulo);font-size:var(--t2);text-align:center;list-style:none;min-height:44px;
  display:flex;align-items:center;justify-content:center;}
.mant summary::-webkit-details-marker{display:none;}
.mant form{display:flex;flex-direction:column;gap:10px;margin-top:8px;}
.mant input{width:100%;box-sizing:border-box;padding:13px 14px;font-size:var(--t4);}
.mant .btn{min-height:44px;}
.mant .error{color:var(--negativo);font-size:var(--t2);min-height:1.2em;margin:0;}
.mantAviso{position:fixed;right:12px;bottom:48px;z-index:10001;display:flex;align-items:center;gap:10px;padding:8px 8px 8px 14px;
  border-radius:999px;background:#10231E;color:#F3FFFB;font-size:13px;box-shadow:0 10px 24px -10px rgba(0,0,0,.5);}
.mantAviso button{border:none;border-radius:999px;padding:7px 12px;font:inherit;font-weight:600;cursor:pointer;
  background:var(--accion);color:var(--sobre-accion);}
`;

export function vigilar(db, auth){
  let activo = false, mensaje = "", admin = false, primera = true, authListo = false, seCerro = false;
  try { activo = localStorage.getItem(RECUERDO) === "1"; } catch(e){}
  const estilo = document.createElement("style");
  estilo.textContent = CSS;
  document.head.appendChild(estilo);
  const capa = document.createElement("div"), aviso = document.createElement("div");
  capa.className = "mant"; aviso.className = "mantAviso";
  capa.setAttribute("role", "dialog"); capa.setAttribute("aria-modal", "true"); capa.setAttribute("aria-labelledby", "mantTit");

  function pintar(){
    const cerrado = activo && !admin;
    /* Cerrada de verdad para esta página: el estado vino del servidor y la
       sesión ya se sabe. Sus lecturas se rechazaron. */
    if (cerrado && authListo && !primera) seCerro = true;
    if (cerrado && !capa.isConnected){
      capa.innerHTML = '<div class="caja"><div class="marca">Mis Torneos</div><div class="ico">' + LLAVE + "</div>" +
        '<h1 id="mantTit">Cerrado por mantenimiento</h1><p id="mantMsg"></p>' +
        '<details><summary>Acceso de administración</summary><form id="mantForm" novalidate>' +
        '<input type="email" id="mantCorreo" placeholder="Correo" autocomplete="username" aria-label="Correo">' +
        '<input type="password" id="mantClave" placeholder="Clave" autocomplete="current-password" aria-label="Clave">' +
        '<button class="btn primario" type="submit">Entrar</button><p class="error" id="mantErr" role="alert"></p>' +
        "</form></details></div>";
      document.body.appendChild(capa);
      capa.querySelector("#mantForm").onsubmit = async e => {
        e.preventDefault();
        const err = capa.querySelector("#mantErr");
        err.textContent = "";
        try {
          await signInWithEmailAndPassword(auth, capa.querySelector("#mantCorreo").value.trim(), capa.querySelector("#mantClave").value);
          /* Quien no administra queda con la sesión abierta pero igual afuera. */
          setTimeout(() => { if (!admin) err.textContent = "Esta cuenta no tiene acceso mientras dura el mantenimiento."; }, 1500);
        } catch(x){ err.textContent = ERRORES[x && x.code] || "No se pudo entrar. Intenta de nuevo."; }
      };
    }
    if (!cerrado && capa.isConnected) capa.remove();
    if (cerrado) capa.querySelector("#mantMsg").textContent = mensaje ||
      "Estamos revisando que todo funcione. Vuelve en un rato: tus resultados y tus insignias siguen guardados.";
    document.documentElement.style.overflow = cerrado ? "hidden" : "";

    /* Quien administra ve el sitio con un aviso, y lo abre desde ahí. */
    const conAviso = activo && admin;
    if (conAviso && !aviso.isConnected){
      aviso.innerHTML = '<span>Mantenimiento activo: solo tú ves el sitio</span><button type="button">Abrir el sitio</button>';
      aviso.querySelector("button").onclick = async () => {
        aviso.querySelector("button").disabled = true;
        try { await update(ref(db, "sistema/mantenimiento"), { activo: false, desde: Date.now() }); }
        catch(e){ aviso.querySelector("button").disabled = false; }
      };
      document.body.appendChild(aviso);
    }
    if (!conAviso && aviso.isConnected) aviso.remove();
  }

  onValue(ref(db, "sistema/mantenimiento"), s => {
    const v = s.val() || {}, antes = activo;
    activo = v.activo === true; mensaje = typeof v.mensaje === "string" ? v.mensaje : "";
    try { localStorage.setItem(RECUERDO, activo ? "1" : "0"); } catch(e){}
    /* Mientras estuvo cerrado, las lecturas de esta página se cortaron: al
       abrirse, quien estaba afuera recarga para volver a verlo todo. */
    if (!primera && antes && !activo && !admin) return location.reload();
    primera = false;
    pintar();
  }, () => {});
  onAuthStateChanged(auth, async u => {
    admin = false;
    if (u) try { admin = (await get(ref(db, "admins/" + u.uid))).val() === true; } catch(e){}
    authListo = true;
    /* Quien administra entró desde la pantalla: la página se armó sin datos
       (se los negaron), así que se recarga una vez para verla entera. */
    if (admin && seCerro) return location.reload();
    pintar();
  });
  pintar();
}
