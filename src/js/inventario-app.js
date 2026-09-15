/* Arranque y navegacion del modulo de Inventario
   Proyecto: Inventario de Almacen - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en la pagina y comparten el ambito global. */

"use strict";

/* ============================== ARRANQUE DEL ALMACÉN ==============================
   El inventario NO usa app.js. Puertas y paneles arrancan leyendo su pestaña de
   OPs, reparando columnas, programando fechas y montando el formulario de ficha;
   aquí nada de eso existe. Su verdad son tres pestañas propias (INSUMOS, BODEGAS,
   MOVIMIENTOS) y no depende de que haya una sola puerta creada.

   Por eso este archivo repite lo poco que sí hace falta —router, indicador de
   sincronización, refresco y avisos— en vez de cargar app.js y esquivar a
   base de condicionales todo lo que no aplica.                                */

/* ---------- navegación ---------- */

const VIEWS = ["exist", "kardex", "req"].filter(v => document.getElementById("v-" + v));

function goto(v){
  if(!VIEWS.includes(v)) return;
  $$(".tab").forEach(x => x.setAttribute("aria-selected", String(x.dataset.view === v)));
  VIEWS.forEach(x => $("#v-" + x).classList.toggle("hide", x !== v));
  if(v === "exist")  renderInv();
  if(v === "kardex") renderKardex();
  if(v === "req" && typeof renderReq === "function") renderReq();
}
$$(".tab").forEach(t => t.onclick = () => goto(t.dataset.view));

/** Repinta lo que esté a la vista. */
function renderInvVisible(){
  const visible = id => { const e = $("#v-" + id); return e && !e.classList.contains("hide"); };
  if(visible("exist")) renderInv();
  else if(visible("kardex")) renderKardex();
  else if(visible("req") && typeof renderReq === "function") renderReq();
  pintarTimbre();
}

/* ---------- indicador de sincronización ---------- */
/* Mismo contrato que datos.js en los otros módulos: inventario.js llama a
   setSync() sin saber en qué página está. */
function setSync(kind, txt){
  const d = $("#sync .dot"), t = $("#sync-t");
  if(!d || !t) return;
  d.className = "dot" + (kind === "busy" ? " busy" : kind === "err" ? " err" : "");
  t.textContent = txt;
}

/* ---------- exportación ---------- */
/* csvDe vive en dashboards.js, que es de puertas y aquí no se carga. Se repite
   por eso: son ocho líneas y traerse 47 KB de tableros ajenos sería peor. */
function csvDe(nombre, cols, filas){
  const q = v => `"${String(v ?? "").replace(/<[^>]*>/g, "").replace(/"/g, '""')}"`;
  const blob = new Blob(["﻿" + [cols.map(q).join(";"), ...filas.map(f => f.map(q).join(";"))].join("\r\n")],
    {type: "text/csv;charset=utf-8"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = `${nombre}_${iso(new Date())}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

/* ---------- refresco ---------- */

let refrescando = false;

/** Vuelve a leer el kardex. El catálogo cambia poco; se relee solo a mano. */
async function refrescarInv(silent, completo){
  if(refrescando) return;
  refrescando = true;
  if(!silent) setSync("busy", "Actualizando…");
  try{
    if(completo) await loadInventario();
    else         await loadMovs();
    if(typeof loadRequis === "function") await loadRequis();
    renderInvVisible();
    const h = new Date();
    setSync("ok", "Al día · " + p2(h.getHours()) + ":" + p2(h.getMinutes()));
  }catch(e){
    setSync("err", "Error");
    if(!silent) toast(e.message, "err");
    console.error(e);
  }finally{ refrescando = false; }
}

function restartPoll(){
  stopPoll();
  // Un almacén se mueve mucho menos que una línea de producción: el refresco
  // por defecto es más lento a propósito, y solo si nadie tiene un modal abierto.
  if(CFG.poll > 0) pollTimer = setInterval(() => {
    if(!document.hidden && $("#ov-mov").classList.contains("hide")) refrescarInv(true);
  }, Math.max(CFG.poll, 30) * 1000);
}
const stopPoll = () => { if(pollTimer) clearInterval(pollTimer); pollTimer = null; };
document.addEventListener("visibilitychange", () => {
  if(!document.hidden && invReady) refrescarInv(true);
});

/* ---------- avisos ----------
   Los del almacén no son los de puertas. Allí interesa qué tocó otra persona;
   aquí interesa sobre todo QUÉ FALTA: un insumo bajo mínimo no lo ha "hecho"
   nadie, pero es lo que para la producción. Se mezclan las dos cosas, primero
   lo que urge reponer y después lo que registraron los demás.                */

const VISTO_INV = "interfrigo.avisos.inventario";

const ultimoVistoInv = () => localStorage.getItem(VISTO_INV) || "";
const marcarVistoInv = () => {
  if(MOVS.length) localStorage.setItem(VISTO_INV, MOVS[0].id + "|" + MOVS[0].fecha);
};

/** Movimientos registrados por otras personas desde la última visita. */
function movsNuevos(){
  const visto = ultimoVistoInv();
  const out = [];
  for(const m of MOVS){                       // MOVS viene del más reciente al más antiguo
    if((m.id + "|" + m.fecha) === visto) break;
    if(String(m.user).toLowerCase().includes(String(userMail).toLowerCase()) && userMail) continue;
    out.push(m);
    if(out.length >= 60) break;
  }
  return out;
}

/** Insumos que hay que reponer, ordenados por gravedad. */
function alertasStock(){
  if(!invReady) return [];
  const s = saldos();
  const out = [];
  for(const i of INSUMOS){
    const tot = saldoTotal(s, i.cod);
    if(tot < 0)                              out.push({i, tot, nivel: "negativo"});
    else if(i.min !== null && tot < i.min)   out.push({i, tot, nivel: "bajo"});
  }
  return out.sort((a, b) => (a.nivel === b.nivel) ? a.tot - b.tot : (a.nivel === "negativo" ? -1 : 1));
}

function pintarTimbre(){
  const b = $("#btn-avisos"), n = $("#avisos-n");
  if(!b) return;
  const total = alertasStock().length + movsNuevos().length;
  n.textContent = total > 99 ? "99+" : total;
  n.classList.toggle("hide", total === 0);
  b.classList.toggle("hay", total > 0);
  b.title = total ? `${total} aviso(s) del almacén` : "Sin novedades";
}

function abrirAvisos(){
  const alertas = alertasStock();
  const nuevos = movsNuevos();
  const cuerpo = $("#av-lista");
  let html = "";

  if(alertas.length){
    html += `<p class="mut" style="margin:0 0 8px;font-weight:700">Hay que reponer</p>`;
    html += alertas.slice(0, 40).map(({i, tot, nivel}) => `
      <div class="av-r ${nivel === "negativo" ? "crea" : ""}">
        <time>${esc(i.cod)}</time>
        <div><span class="who">${esc(i.nom)}</span>
          <span class="what">${nivel === "negativo"
            ? `saldo <b>negativo</b>: ${fmtNum(tot)} ${esc(i.uni)} — falta registrar una entrada`
            : `quedan <b>${fmtNum(tot)}</b> ${esc(i.uni)}, el mínimo es ${fmtNum(i.min)}`}</span></div>
      </div>`).join("");
    if(alertas.length > 40) html += `<p class="mut">y ${alertas.length - 40} más</p>`;
  }

  if(nuevos.length){
    html += `<p class="mut" style="margin:${alertas.length ? "16px" : "0"} 0 8px;font-weight:700">
      Movimientos de otras personas</p>`;
    html += nuevos.map(m => `
      <div class="av-r">
        <time>${esc(fmtSello(m.fecha))}</time>
        <div><span class="who">${esc(m.user.split("(")[0].trim() || m.user)}</span>
          <span class="op">${esc(m.tipo)}</span>
          <span class="what"><b>${esc(m.cod)}</b> ${m.cant > 0 ? "+" : ""}${fmtNum(m.cant)}
            en ${esc(m.bod)}${m.op ? ` · OP ${esc(m.op)}` : ""}${m.doc ? ` · ${esc(m.doc)}` : ""}</span></div>
      </div>`).join("");
  }

  cuerpo.innerHTML = html ||
    `<p class="mut" style="padding:16px 2px">Todo en orden: nada bajo mínimo y ningún
     movimiento nuevo desde tu última visita.</p>`;
  $("#ov-avisos").classList.remove("hide");
}

/* Al cerrar se da por leído. Las alertas de stock NO se silencian: siguen
   contando mientras el insumo siga faltando, que es justo lo que se quiere. */
function cerrarAvisos(){
  marcarVistoInv();
  pintarTimbre();
  $("#ov-avisos").classList.add("hide");
}

/* ---------- identidad ---------- */

function pintarQuienSoy(){
  const nombre = (typeof MI_NOMBRE === "string" && MI_NOMBRE.trim()) ? MI_NOMBRE.trim() : "";
  const visible = nombre || userMail || "conectado";
  const el = $("#u-mail");
  el.textContent = visible;
  el.title = nombre ? `${nombre} · ${userMail}` : (userMail || "");
  $("#u-av").textContent = visible[0].toUpperCase();
}

/** Dice qué falta configurar y de dónde debería venir. */
function explicarQueFalta(){
  const el = $("#g-falta"); if(!el) return;
  const falta = [];
  if(!CFG.clientId) falta.push("el <b>Client ID</b>");
  if(!CFG.sheetId)  falta.push("el <b>ID de la hoja</b>");
  const q = falta.join(" y ");
  el.innerHTML = configDelModulo()
    ? `Falta ${q} para el <b>Inventario</b>. La instalación sí trae configuración:
       pulsa <b>⚙ › Usar la de la empresa</b> para tomarla.`
    : `Falta ${q} para el <b>Inventario</b>. Pide el <b>enlace de configuración</b> a
       alguien que ya lo use (⚙ › Enlace para otros equipos) o introdúcelo a mano en ⚙.`;
}

/* ---------- cerrar ventanas ----------
   En puertas y paneles esto vive en ficha.js / paneles-ficha.js, que aquí no se
   cargan. Sin ello, el ×, el botón Cancelar, el clic fuera y la tecla Escape no
   hacían nada y la ventana quedaba atrapada. Un solo sitio, para que ninguna
   ventana futura se quede sin salida. */
$$("[data-close]").forEach(b => b.onclick = () => b.closest(".ov").classList.add("hide"));
// Clic en el fondo (no dentro de la tarjeta) cierra. mousedown y no click:
// si se empieza a arrastrar dentro y se suelta fuera, no debe cerrarse.
$$(".ov").forEach(o => o.addEventListener("mousedown", e => {
  if(e.target === o) o.classList.add("hide");
}));
document.addEventListener("keydown", e => {
  if(e.key !== "Escape") return;
  // El panel de avisos se da por leído al cerrarlo, también con Escape.
  const av = $("#ov-avisos");
  if(av && !av.classList.contains("hide")){ cerrarAvisos(); return; }
  $$(".ov").forEach(o => o.classList.add("hide"));
});

/* ---------- enganches ---------- */

$("#btn-reload").onclick = () => refrescarInv(false, true);
$("#btn-cfg").onclick = openCfg;
$("#g-cfg").onclick = openCfg;
$("#btn-out").onclick = logout;
$("#btn-avisos").onclick = abrirAvisos;
$("#av-cerrar").onclick = cerrarAvisos;
$("#av-cerrar2").onclick = cerrarAvisos;

$("#reconectar").onclick = async () => {
  // Nace de un clic, así que el navegador no bloquea la ventana de Google.
  const b = $("#reconectar"); b.disabled = true;
  try{
    token = null;
    if(await pedirToken()){ b.classList.add("hide"); refrescarInv(false); }
    else entrarConGoogle();
  }catch(e){ toast(e.message, "err"); }
  finally{ b.disabled = false; }
};

$("#g-login").onclick = () => {
  if(!cfgOk()){ openCfg(); return; }
  $("#g-msg").textContent = "Abriendo Google…";
  entrarConGoogle();
};

/* ---------- entrada ---------- */

async function enterApp(){
  // Antes de mostrar nada: ¿esta persona tiene acceso, y con qué rol?
  const permiso = await loadUsuarios();
  if(!permiso.acceso){ sinAcceso(permiso.motivo); return; }

  pintarQuienSoy();
  $("#gate").classList.add("hide");
  $("#app").classList.remove("hide");

  setSync("busy", "Cargando…");
  try{
    await loadInventario();
    if(typeof loadRequis === "function") await loadRequis();
  }catch(e){
    setSync("err", "Error");
    toast("No se pudo leer el inventario: " + e.message, "err");
  }
  if(!invReady){
    toast("Revisa que la hoja esté compartida contigo y que el ID en ⚙ sea el correcto.", "err");
  }
  aplicarRol();               // la interfaz se ajusta a lo que esta persona puede hacer
  goto("exist");
  pintarTimbre();
  restartPoll();
  if(invReady) setSync("ok", "Al día");
}

(function boot(){
  document.title = MOD.titulo + " | Interfrigo";
  aplicaTema(localStorage.getItem("puertas.tema") || "auto");
  loadCfg();
  $("#g-sheet").textContent = "INSUMOS · BODEGAS · MOVIMIENTOS";
  $("#g-cfgwarn").classList.toggle("hide", cfgOk());
  if(!cfgOk()) explicarQueFalta();

  // Si Google devolvió un problema, se dice en vez de dejar la pantalla muda.
  const err = new URLSearchParams(location.search).get("auth_error");
  if(err){
    $("#g-msg").textContent = err === "access_denied"
      ? "Se canceló el acceso. Vuelve a intentarlo."
      : "No se pudo entrar (" + err + ").";
    history.replaceState(null, "", location.pathname);
  }

  if(!cfgOk()) return;

  // ¿Ya hay sesión en el servidor? Entonces se entra sin un solo clic.
  $("#g-msg").textContent = "Conectando…";
  // Igual que en app.js: el error de enterApp tiene que verse, no tragarse.
  pedirToken().then(t => {
    if(t) return enterApp();
    $("#g-msg").textContent = ""; $("#g-login").focus();
  }).catch(e => {
    console.error(e);
    $("#g-msg").innerHTML = `No se pudo entrar: ${esc(e.message)}<br>
      <button class="btn sm" onclick="location.reload()" style="margin-top:8px">Reintentar</button>`;
  });
})();
