/* ============================================================
   sesion.js — entrar y crear cuenta
   ------------------------------------------------------------
   Versión actual: v=9   (subir el ?v= al tocar este archivo)

   Lo usan la portada (index.html), que tiene el registro a la vista, y la
   cuenta (cuenta.html), con sus tres pasos. Vive acá para que las reglas de
   la contraseña, los mensajes de error y lo que se guarda al registrarse sean
   los mismos en las dos: copiadas, un día dejan de serlo (ver sala.js).

   Necesita config.js cargado antes: de ahí salen FIREBASE_CONFIG y EMULADOR.
   ============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, connectDatabaseEmulator, ref, set, get, update, increment }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, updateProfile, sendEmailVerification }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { SALA } from "./sala.js?v=4";
import { vigilar } from "./mantenimiento.js?v=3";

export const app  = initializeApp(FIREBASE_CONFIG);
export const db   = getDatabase(app);
export const auth = getAuth(app);
auth.languageCode = "es";   // los correos de Firebase (recuperar, confirmar) y su página, en español

export const enEmulador = () => typeof EMULADOR !== "undefined" && !!EMULADOR;

/* Si el interruptor de config.js esta encendido, todo apunta al emulador en vez
   de a la base real. Tiene que ir ANTES de cualquier lectura o escritura: una
   vez que el SDK hablo con el servidor, connect*Emulator ya no puede cambiarlo. */
if (enEmulador()){
  connectAuthEmulator(auth, "http://" + EMULADOR.host + ":" + EMULADOR.auth, { disableWarnings: true });
  connectDatabaseEmulator(db, EMULADOR.host, EMULADOR.db);
}
/* La pantalla de mantenimiento: la portada, la cuenta y las tiendas pasan por acá. */
vigilar(db, auth);

/* El ?emu=1 y la sala viajan en cada enlace que sale de acá. Si el ?emu se
   perdiera, el panel caería en la base REAL sin avisar, que es la dirección
   peligrosa del fallo; si se perdiera la sala, quien entró desde el torneo de
   una tienda terminaría en el muro de otra. */
export function params(){
  const p = new URLSearchParams();
  if (enEmulador()) p.set("emu", "1");
  if (SALA !== "principal") p.set("sala", SALA);
  const s = p.toString();
  return s ? "?" + s : "";
}
export const urlPanel  = () => "admin.html" + params();
export const urlMuro   = h => "muro.html" + params() + (h ? "#" + h : "");
export const urlCuenta = h => "cuenta.html" + params() + (h ? "#" + h : "");

/* ------------------------------------------------------------
   Errores de Firebase, en castellano
   ------------------------------------------------------------ */
const ERRORES = {
  "auth/invalid-email":          "Ese correo no tiene un formato válido.",
  "auth/user-disabled":          "Esta cuenta está deshabilitada. Habla con la tienda.",
  "auth/user-not-found":         "No hay ninguna cuenta con ese correo.",
  "auth/wrong-password":         "La contraseña no es correcta.",
  "auth/invalid-credential":     "El correo o la contraseña no coinciden.",
  "auth/email-already-in-use":   "Ya existe una cuenta con ese correo. Prueba ingresando.",
  "auth/weak-password":          "La contraseña es muy débil. Revisa lo que falta debajo del campo.",
  "auth/too-many-requests":      "Demasiados intentos seguidos. Espera un momento y vuelve a probar.",
  "auth/network-request-failed": "Sin conexión. Revisa tu internet y vuelve a intentar.",
  "auth/operation-not-allowed":  "El registro con correo no está habilitado en Firebase. Avísale al organizador.",
  "beta/falta":                  "ByePass está en beta cerrada: para crear tu cuenta necesitas un código de invitación.",
  "beta/codigo":                 "Ese código de invitación no existe o ya se usó todas las veces que permite.",
};
export const decir = e => {
  const c = e && e.code;
  /* Con el emulador encendido, un fallo de red NO es el wifi del usuario: es
     que no levantaron emulador.cmd. */
  if (c === "auth/network-request-failed" && enEmulador())
    return "El emulador no responde. ¿Está corriendo emulador.cmd en la otra ventana?";
  return ERRORES[c] || "No se pudo completar. Intenta de nuevo.";
};

/* ------------------------------------------------------------
   Lo que se valida
   ------------------------------------------------------------ */
export const ID_OK = v => /^[0-9]{7,8}$/.test(v);
export const CORREO_OK = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/* Fuerza de la contraseña. Nota honesta sobre el criterio: la guía moderna
   (NIST 800-63B) prefiere LARGO por sobre exigir variedad de caracteres,
   porque las reglas de composición empujan a la gente hacia "Clave2026!".
   Acá se piden las dos cosas —8 de largo (eran 10 hasta el 27-09-2026) y las
   cuatro clases, que fue lo pedido— más el filtro de que no contenga el nombre ni el correo, que es lo
   que de verdad atrapa a "camilarios2004". */
export function revisarClave(clave, nombre, correo){
  const propios = [];
  String(nombre || "").split(/\s+/).forEach(p => { if (p.length >= 3) propios.push(p.toLowerCase()); });
  const local = String(correo || "").split("@")[0];
  if (local.length >= 3) propios.push(local.toLowerCase());
  const baja = clave.toLowerCase();
  return {
    largo:  clave.length >= 8,
    min:    /[a-záéíóúñü]/.test(clave),
    may:    /[A-ZÁÉÍÓÚÑÜ]/.test(clave),
    num:    /[0-9]/.test(clave),
    sim:    /[^A-Za-z0-9áéíóúñüÁÉÍÓÚÑÜ]/.test(clave),
    propio: clave.length > 0 && !propios.some(p => baja.includes(p)),
  };
}
export const claveOk = r => Object.values(r).every(Boolean);
export const QUE_FALTA = { largo:"más caracteres (van al menos 8)", min:"una minúscula",
                           may:"una mayúscula", num:"un número", sim:"un símbolo (. , - _ ! ? @ #)" };
export const unir = xs => xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + " y " + xs[xs.length - 1];

/* Lo que va debajo del medidor: SOLO lo que falta. Devuelve HTML, porque lo
   pendiente va en negrita. */
export function textoFalta(clave, r){
  if (!clave) return "Mínimo 8 caracteres, con minúscula, mayúscula, número y símbolo.";
  if (claveOk(r)) return "Lista.";
  const faltan = Object.keys(QUE_FALTA).filter(k => !r[k]).map(k => QUE_FALTA[k]);
  return (faltan.length ? "Falta: <b>" + unir(faltan) + "</b>." : "") +
         (!r.propio ? (faltan.length ? " " : "") + "No puede incluir tu nombre ni tu correo." : "");
}

/* "" si la fecha sirve; si no, qué decirle a la persona. El input date
   entrega YYYY-MM-DD o nada, pero una fecha imposible (2099, o el año 0203 de
   un dedazo) igual pasa: hay que acotarla. */
export function errorNacimiento(v){
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v || "")) return "Elige tu fecha de nacimiento.";
  const d = new Date(v + "T12:00:00");
  const anios = (Date.now() - d.getTime()) / 31557600000;
  if (isNaN(d.getTime()) || anios < 0) return "Esa fecha de nacimiento está en el futuro.";
  if (anios > 110) return "Revisa la fecha de nacimiento: el año parece equivocado.";
  return "";
}

/* ------------------------------------------------------------
   Beta cerrada
   ------------------------------------------------------------
   Con beta/activa en true, crear una cuenta pide un código de invitación
   (beta/codigos/<CÓDIGO>, los crea la administración en herramientas.html).
   Lo que cierra de verdad son las reglas: sin un código válido la base no deja
   guardar el perfil. Esto de acá es para avisar antes de crear el acceso.
   El código llega por el enlace (?invitacion=) y se recuerda en la pestaña
   por si la persona pasa de la portada a la cuenta. */
export const normCodigo = v => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
export const CODIGO_OK = v => /^[A-Z0-9]{8,20}$/.test(v);
export function codigoInvitacion(){
  const q = normCodigo(new URLSearchParams(location.search).get("invitacion"));
  try { if (q) sessionStorage.setItem("invitacion", q); return q || sessionStorage.getItem("invitacion") || ""; }
  catch(e){ return q; }
}
codigoInvitacion();
export const betaActiva = () => get(ref(db, "beta/activa")).then(s => s.val() === true, () => false);
/* "" si el código sirve; si no, la clave del error para decir(). */
export async function revisarCodigo(c){
  c = normCodigo(c);
  if (!CODIGO_OK(c)) return "beta/codigo";
  try {
    const [max, usados] = await Promise.all(["max", "usados"].map(k => get(ref(db, "beta/codigos/" + c + "/" + k)).then(s => s.val())));
    return typeof max === "number" && (usados || 0) < max ? "" : "beta/codigo";
  } catch(e){ return "beta/codigo"; }
}

/* ------------------------------------------------------------
   Registrarse
   ------------------------------------------------------------
   Crea la cuenta y guarda el perfil. Quien llama tiene que esperar a que
   termine antes de salir de la página: onAuthStateChanged dispara ANTES de
   que el perfil se guarde, y redirigir ahí dejaba la cuenta huérfana. */
export async function registrar({ nombre, correo, clave, nacimiento, playerId = "", publico = false, invitacion = "" }){
  /* En beta cerrada el código se revisa ANTES de crear el acceso: si no sirve,
     no queda una cuenta a medias. Fuera de la beta no se usa. */
  const beta = await betaActiva();
  invitacion = beta ? normCodigo(invitacion) : "";
  if (beta && !invitacion) throw { code: "beta/falta" };
  if (invitacion){ const mal = await revisarCodigo(invitacion); if (mal) throw { code: mal }; }
  const cred = await createUserWithEmailAndPassword(auth, correo, clave);
  await updateProfile(cred.user, { displayName: nombre });
  const perfil = { nombre, nacimiento, playerId, publico, creado: Date.now() }, uid = cred.user.uid;
  if (!invitacion) await set(ref(db, "usuarios/" + uid), perfil);
  else try {
    /* Perfil, uso y contador van juntos: las reglas exigen los tres a la vez.
       beta/testers es público y da la insignia Beta tester. */
    const c = "beta/codigos/" + invitacion;
    await update(ref(db), { ["usuarios/" + uid]: { ...perfil, invitacion },
      [c + "/quienes/" + uid]: Date.now(), [c + "/usados"]: increment(1), ["beta/testers/" + uid]: true });
  } catch(e){
    /* Otro alcanzó a usar el último cupo entre la revisión y ahora: se borra
       el acceso recién creado para no dejarlo huérfano. */
    try { await cred.user.delete(); } catch(_){}
    throw { code: "beta/codigo" };
  }
  /* El correo para confirmar la dirección. Si no sale, el muro lo ofrece de
     nuevo; la marca le dice al muro que este ya se mandó. */
  try {
    await sendEmailVerification(cred.user);
    sessionStorage.setItem("correoMandado", "1");
  } catch(e){}
  return cred.user;
}
