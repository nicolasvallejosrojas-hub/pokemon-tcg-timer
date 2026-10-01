/* ============================================================
   tablafinal.js — la tabla final como imagen para compartir
   ------------------------------------------------------------
   Versión actual: v=1   (subir el ?v= al tocar este archivo)

   La dibuja en un canvas con las letras y los colores de la tele (lienzo
   oscuro, Inter, Newsreader) y la entrega como PNG: en el celular abre el
   menú de compartir (WhatsApp, Instagram…); en el computador se descarga.
   No sube nada a ningún lado: la imagen queda solo en el aparato.

   La usan el panel de la tienda (TOM y torneo de la página) y la sala de
   invitado. Los nombres llegan ya resueltos: quien pidió no salir con su
   nombre viene como «Jugador reservado».
   ============================================================ */

const C = { fondo: "#0F2E2A", fila: "#143833", texto: "#F3FFFB", suave: "#9DBDB4", coral: "#F45B45", ambar: "#FFB020", linea: "rgba(243,255,251,.1)" };
const W = 1080, PAD = 72, FILA = 66, CAB = 330, PIE = 170;

/* Corta con «…» lo que no cabe en el ancho dado. */
function cabe(g, txt, ancho){
  if (g.measureText(txt).width <= ancho) return txt;
  while (txt.length > 1 && g.measureText(txt + "…").width > ancho) txt = txt.slice(0, -1);
  return txt + "…";
}
const fechaLarga = iso => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return "";
  const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return (+m[3]) + " de " + MES[+m[2] - 1] + " de " + m[1];
};

/* filas: [{ puesto, nombre, w, l, t, pts, etapa? }] en orden. */
export async function dibujarTabla({ torneo, fecha, tienda, filas }){
  await Promise.all(["700 56px Inter", "600 30px Inter", "400 26px Inter", "300 60px Newsreader"].map(f => document.fonts.load(f).catch(() => {})));
  const H = CAB + filas.length * FILA + PIE;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  g.fillStyle = C.fondo; g.fillRect(0, 0, W, H);

  /* cabecera: tienda, torneo, fecha y cuántos */
  g.textBaseline = "alphabetic";
  g.fillStyle = C.suave; g.font = "600 24px Inter";
  g.fillText(cabe(g, (tienda || "Tabla final").toUpperCase(), W - 2 * PAD), PAD, 110);
  g.fillStyle = C.texto; g.font = "700 60px Inter";
  g.fillText(cabe(g, torneo || "Torneo", W - 2 * PAD), PAD, 184);
  g.fillStyle = C.suave; g.font = "400 28px Inter";
  g.fillText([fechaLarga(fecha), filas.length + (filas.length === 1 ? " jugador" : " jugadores")].filter(Boolean).join(" · "), PAD, 232);

  /* títulos de columna */
  const xPts = W - PAD, xRec = W - PAD - 150, xNom = PAD + 84;
  g.font = "600 22px Inter"; g.fillStyle = C.suave;
  g.textAlign = "left"; g.fillText("#", PAD, CAB - 26); g.fillText("JUGADOR", xNom, CAB - 26);
  g.textAlign = "right"; g.fillText("V-D-E", xRec, CAB - 26); g.fillText("PTS", xPts, CAB - 26);

  filas.forEach((f, i) => {
    const y = CAB + i * FILA, base = y + FILA / 2 + 10, podio = f.puesto <= 3;
    if (podio){ g.fillStyle = f.puesto === 1 ? "rgba(244,91,69,.22)" : C.fila; g.beginPath(); g.roundRect(PAD - 20, y + 4, W - 2 * PAD + 40, FILA - 8, 14); g.fill(); }
    else if (i){ g.fillStyle = C.linea; g.fillRect(PAD - 20, y, W - 2 * PAD + 40, 1); }
    g.textAlign = "left";
    g.fillStyle = f.puesto === 1 ? C.coral : podio ? C.ambar : C.suave; g.font = "700 30px Inter";
    g.fillText(String(f.puesto), PAD, base);
    g.fillStyle = C.texto; g.font = (podio ? "700" : "400") + " 30px Inter";
    /* «Cayó en semifinal» → «Semifinal»: el puesto ya dice que cayó. */
    const etapa = f.etapa && f.etapa !== "Sigue en el corte" ? f.etapa.replace(/^Cayó en /, "") : "";
    const anchoNom = xRec - 150 - xNom - (etapa ? 190 : 0);
    const nom = cabe(g, f.nombre || "?", anchoNom);
    g.fillText(nom, xNom, base);
    if (etapa){
      const x = xNom + g.measureText(nom).width + 20;
      g.font = "600 20px Inter"; g.fillStyle = f.etapa === "Campeón" ? C.coral : C.suave;
      g.fillText(cabe(g, etapa.toUpperCase(), 180), x, base - 2);
    }
    g.textAlign = "right"; g.font = "400 28px Inter"; g.fillStyle = C.suave;
    g.fillText(f.w + "-" + f.l + "-" + f.t, xRec, base);
    g.font = "700 30px Inter"; g.fillStyle = C.texto;
    g.fillText(String(f.pts), xPts, base);
  });

  /* pie: la marca */
  const yPie = CAB + filas.length * FILA + 96;
  g.textAlign = "left"; g.font = "300 56px Newsreader";
  g.fillStyle = C.texto; g.fillText("Bye", PAD, yPie);
  const wBye = g.measureText("Bye").width;
  g.fillStyle = C.coral; g.fillText("Pass", PAD + wBye, yPie);
  g.textAlign = "right"; g.font = "600 26px Inter"; g.fillStyle = C.suave;
  g.fillText("byepass.cl", W - PAD, yPie - 6);
  return cv;
}

/* Compartir en el celular; descargar en el computador. */
export async function entregarTabla(datos){
  const cv = await dibujarTabla(datos);
  const blob = await new Promise(r => cv.toBlob(r, "image/png"));
  const nombre = ("tabla-" + (datos.torneo || "torneo")).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) + ".png";
  const archivo = new File([blob], nombre, { type: "image/png" });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare && navigator.canShare({ files: [archivo] })){
    try { await navigator.share({ files: [archivo], title: datos.torneo || "Tabla final" }); return; }
    catch(e){ if (e.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
