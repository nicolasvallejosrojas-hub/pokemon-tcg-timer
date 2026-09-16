/* =========================================================
   agenda.js — calendario de torneos, compartido por el panel
   del organizador y por la vista de los jugadores.

   Un evento en Firebase se ve así:

     salas/<sala>/agenda/<id> = {
       titulo:   "Torneo mensual Primer Bloque",
       detalle:  "Inscripción 15:30. Cupos limitados.",
       lugar:    "Tienda X, Av. Siempreviva 742",
       fecha:    "2026-10-04",     // lo que escribió el organizador
       hora:     "16:00",          // "" = todo el día
       duracion: 240,              // minutos
       inicioMs: 1759604400000,    // el MISMO instante, en epoch
       creado, updatedAt
     }

   Por qué van las dos cosas, el texto y el epoch: el texto es lo que se
   muestra (la hora de la tienda, tal cual la tipeó el juez) y el epoch es lo
   que se manda a Google Calendar. Si guardáramos solo el texto, el celular de
   un jugador que anda de viaje interpretaría "16:00" en SU zona horaria y
   agendaría el torneo a la hora equivocada.
   ========================================================= */

/* Epoch del instante, calculado en la zona horaria de quien lo escribe */
export function aEpoch(fecha, hora){
  if (!fecha) return null;
  const [a,m,d] = fecha.split("-").map(Number);
  if (!a || !m || !d) return null;
  const [hh,mm] = (hora || "00:00").split(":").map(Number);
  return new Date(a, m-1, d, hh||0, mm||0, 0, 0).getTime();
}

export const finEpoch = ev =>
  (ev.inicioMs ?? aEpoch(ev.fecha, ev.hora)) + (ev.duracion || 120)*60000;

/* Un evento sigue "vigente" hasta que termina, no hasta que empieza: si el
   jugador abre la página a mitad del torneo, el torneo todavía es el próximo. */
export const estaVigente = (ev, ahora = Date.now()) => finEpoch(ev) > ahora;

const dosD = n => String(n).padStart(2, "0");

/* aaaammddThhmmssZ — el formato que piden tanto Google como el .ics */
function utcCompacto(ms){
  const d = new Date(ms);
  return d.getUTCFullYear() + dosD(d.getUTCMonth()+1) + dosD(d.getUTCDate()) + "T" +
         dosD(d.getUTCHours()) + dosD(d.getUTCMinutes()) + dosD(d.getUTCSeconds()) + "Z";
}
/* aaaammdd en hora local, para los eventos de todo el día */
const diaCompacto = fecha => (fecha || "").replace(/-/g, "");
function diaSiguiente(fecha){
  const [a,m,d] = fecha.split("-").map(Number);
  const x = new Date(a, m-1, d+1);
  return "" + x.getFullYear() + dosD(x.getMonth()+1) + dosD(x.getDate());
}

/* ---------- Google Calendar ----------
   El enlace abre el formulario de "evento nuevo" ya relleno. No pide permisos
   ni API key: es la URL pública de siempre, y en el celular la toma la app. */
export function urlGoogle(ev){
  const ini = ev.inicioMs ?? aEpoch(ev.fecha, ev.hora);
  const rango = ev.hora
    ? utcCompacto(ini) + "/" + utcCompacto(ini + (ev.duracion||120)*60000)
    : diaCompacto(ev.fecha) + "/" + diaSiguiente(ev.fecha);   // el fin es exclusivo
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text:   ev.titulo || "Torneo",
    dates:  rango
  });
  if (ev.detalle) p.set("details", ev.detalle);
  if (ev.lugar)   p.set("location", ev.lugar);
  return "https://calendar.google.com/calendar/render?" + p.toString();
}

/* ---------- Archivo .ics ----------
   Para quien no usa Google: iPhone, Outlook, Proton. El mismo archivo sirve
   para los tres. */
const escIcs = t => String(t == null ? "" : t)
  .replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/* Las líneas de un .ics no pueden pasar de 75 octetos; se cortan con un
   espacio al principio de la continuación. Los lectores estrictos (Outlook)
   rechazan el archivo entero si esto no se respeta. */
function plegar(linea){
  const b = new TextEncoder().encode(linea);
  if (b.length <= 75) return linea;
  const out = []; let actual = "";
  for (const ch of linea){
    const tentativa = actual + ch;
    if (new TextEncoder().encode(tentativa).length > (out.length ? 74 : 75)){
      out.push(actual); actual = ch;
    } else actual = tentativa;
  }
  out.push(actual);
  return out[0] + "\r\n" + out.slice(1).map(x => " " + x).join("\r\n");
}

export function textoIcs(eventos, nombreCalendario = "Torneos"){
  const sello = utcCompacto(Date.now());
  const lineas = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "PRODID:-//Timer de torneo//ES", "X-WR-CALNAME:" + escIcs(nombreCalendario)
  ];
  eventos.forEach((ev, i) => {
    const ini = ev.inicioMs ?? aEpoch(ev.fecha, ev.hora);
    lineas.push("BEGIN:VEVENT");
    lineas.push("UID:" + (ev.id || (ini + "-" + i)) + "@timer-torneo");
    lineas.push("DTSTAMP:" + sello);
    if (ev.hora){
      lineas.push("DTSTART:" + utcCompacto(ini));
      lineas.push("DTEND:"   + utcCompacto(ini + (ev.duracion||120)*60000));
    } else {
      lineas.push("DTSTART;VALUE=DATE:" + diaCompacto(ev.fecha));
      lineas.push("DTEND;VALUE=DATE:"   + diaSiguiente(ev.fecha));
    }
    lineas.push("SUMMARY:" + escIcs(ev.titulo || "Torneo"));
    if (ev.detalle) lineas.push("DESCRIPTION:" + escIcs(ev.detalle));
    if (ev.lugar)   lineas.push("LOCATION:"    + escIcs(ev.lugar));
    lineas.push("BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY",
                "DESCRIPTION:" + escIcs(ev.titulo || "Torneo"), "END:VALARM");
    lineas.push("END:VEVENT");
  });
  lineas.push("END:VCALENDAR");
  return lineas.map(plegar).join("\r\n") + "\r\n";
}

export function bajarIcs(eventos, nombreArchivo = "torneos.ics", nombreCalendario){
  const blob = new Blob([textoIcs(eventos, nombreCalendario)], { type:"text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombreArchivo;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ---------- Texto para humanos ---------- */
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio",
               "agosto","septiembre","octubre","noviembre","diciembre"];
const DIAS = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

export function fechaLegible(fecha, conDia = true){
  if (!fecha) return "";
  const [a,m,d] = fecha.split("-").map(Number);
  const dt = new Date(a, m-1, d);
  return (conDia ? DIAS[dt.getDay()] + " " : "") + d + " de " + MESES[m-1] +
         (a !== new Date().getFullYear() ? " de " + a : "");
}

/* "en 3 días", "mañana", "hoy". Se calcula por días de calendario y no por
   milisegundos: un torneo mañana a las 9 tiene que decir "mañana" aunque
   falten 20 horas y no 24. */
export function cuantoFalta(ev, ahora = Date.now()){
  const ini = ev.inicioMs ?? aEpoch(ev.fecha, ev.hora);
  const dia = x => { const d = new Date(x); d.setHours(0,0,0,0); return d.getTime(); };
  const dias = Math.round((dia(ini) - dia(ahora)) / 86400000);
  if (dias < 0)  return "ya pasó";
  if (dias === 0) return ini > ahora ? "hoy" : "en curso";
  if (dias === 1) return "mañana";
  if (dias < 7)   return "en " + dias + " días";
  if (dias < 14)  return "en una semana";
  if (dias < 31)  return "en " + Math.round(dias/7) + " semanas";
  return "en " + Math.round(dias/30) + (Math.round(dias/30) === 1 ? " mes" : " meses");
}

export const ordenar = evs => [...evs].sort((a,b) =>
  (a.inicioMs ?? aEpoch(a.fecha,a.hora)) - (b.inicioMs ?? aEpoch(b.fecha,b.hora)));
