// ====== CONFIGURACIÓN DE FIREBASE ======
// Proyecto: timer-y-qrs-pokemon
// Estos valores NO son secretos: la seguridad real está en las reglas
// de la Realtime Database y en tu contraseña de organizador.
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDdjKoHckbsaTgjiIVij9tnt9gpRtefREY",
  authDomain: "timer-y-qrs-pokemon.firebaseapp.com",
  databaseURL: "https://timer-y-qrs-pokemon-default-rtdb.firebaseio.com",
  projectId: "timer-y-qrs-pokemon",
  storageBucket: "timer-y-qrs-pokemon.firebasestorage.app",
  messagingSenderId: "551925622696",
  appId: "1:551925622696:web:0bb0195d153fe7c64f9f9d"
};

// ====== EMULADOR LOCAL ======
// Este archivo se publica, así que el emulador tiene que ser IMPOSIBLE de
// encender en producción: primero se exige que la página venga de localhost o
// de una IP de red privada. En github.io el parámetro ?emu=1 no hace nada.
//
// Se enciende con ?emu=1 y queda recordado en la pestaña; ?emu=0 lo apaga.
// Es explícito a propósito: adivinar por el nombre del host llevaría a creer
// que estás probando contra datos falsos cuando en realidad tocas producción.
//
// EMULADOR es null (apagado) o { host, auth, db }.
const EMULADOR = (function(){
  var h = location.hostname;
  var local = h === "localhost" || h === "127.0.0.1" || h === "[::1]"
    || /^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)
    || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)
    || /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h);
  if (!local) return null;

  var q = null;
  try { q = new URLSearchParams(location.search).get("emu"); } catch(e){}
  var on = false;
  try {
    if (q === "1") sessionStorage.setItem("emu", "1");
    if (q === "0") sessionStorage.removeItem("emu");
    on = sessionStorage.getItem("emu") === "1";
  } catch(e){ on = (q === "1"); }     // modo privado: vale solo la URL
  if (!on) return null;

  // El host es el mismo por el que llegaste: desde el celular, la IP del
  // notebook. Por eso el emulador se levanta escuchando en 0.0.0.0.
  return { host: h, auth: 9099, db: 9000 };
})();

// ====== POLÍTICA DE SEGURIDAD (CSP) ======
// Dice de dónde pueden salir los scripts y con qué servidores puede hablar la
// página. Si algún día se colara código en una página, no podría cargar
// scripts de otro sitio ni mandar datos a otro servidor que Firebase.
// GitHub Pages no deja poner cabeceras, así que va como <meta>, puesta desde
// acá para que sea UNA para todas las páginas. Rige para lo que se carga
// después: los módulos de Firebase, las conexiones y las imágenes.
// Con el emulador no va: corre en la IP del computador (también desde el
// celular) y la política lo bloquearía.
if (!EMULADOR){
  var csp = document.createElement("meta");
  csp.httpEquiv = "Content-Security-Policy";
  csp.content = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.gstatic.com https://*.firebaseio.com",
    "connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com"
      + " https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
    "img-src 'self' data: blob: https://api.qrserver.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "media-src 'self' data: blob:",
    "frame-src https://timer-y-qrs-pokemon.firebaseapp.com",
    "object-src 'none'", "base-uri 'self'", "form-action 'self'"
  ].join("; ");
  document.head.appendChild(csp);
}

// ====== APP INSTALABLE ======
// El manifiesto (nombre e ícono al instalarla en el celular) y el ícono de la
// pestaña, puestos desde acá para que sean UNO para todas las páginas, igual
// que la política de arriba. sw.js es lo que la deja abrir sin señal.
["manifest:manifest.webmanifest", "icon:icono.svg", "apple-touch-icon:icono-apple.png"].forEach(function(x){
  var l = document.createElement("link"), p = x.split(":");
  l.rel = p[0]; l.href = p[1];
  document.head.appendChild(l);
});
if ("serviceWorker" in navigator) addEventListener("load", function(){
  navigator.serviceWorker.register("sw.js").catch(function(){});
});

// Barra fija, para que nunca se confunda una sesión de prueba con la real.
if (EMULADOR) addEventListener("DOMContentLoaded", function(){
  var b = document.createElement("div");
  b.textContent = "EMULADOR — datos de prueba, no es la base real";
  b.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:9999;"
    + "background:#7C2D45;color:#F7F5FF;font:600 12px/1.3 -apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif;"
    + "letter-spacing:.05em;text-transform:uppercase;text-align:center;padding:7px 10px;"
    + "pointer-events:none;";
  document.body.appendChild(b);

  // Avisar AL CARGAR si el emulador esta encendido pero no hay nadie al otro
  // lado, en vez de dejar que se descubra recien al fallar un registro.
  //
  // El emulador de Auth responde su raiz con CORS abierto, asi que esta es una
  // peticion normal. Se intento con mode:"no-cors" y era peor: la respuesta es
  // JSON, el navegador la bloquea por ORB despues de recibirla y deja un
  // net::ERR_ABORTED en la consola en cada carga, aunque el emulador este
  // perfectamente arriba.
  //
  // No se mira el status: cualquier respuesta significa que hay alguien
  // escuchando. Solo el fallo de red -- el catch -- quiere decir que no esta.
  fetch("http://" + EMULADOR.host + ":" + EMULADOR.auth + "/", { cache: "no-store" })
    .catch(function(){
      b.textContent = "El emulador no responde — falta correr emulador.cmd";
      b.style.background = "#FF9F0A";
      b.style.color = "#0C0A22";
    });
});
