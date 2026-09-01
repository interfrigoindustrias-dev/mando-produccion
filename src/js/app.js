/* Navegacion entre vistas y arranque de la aplicacion
   Proyecto: Control de Puertas - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en index.html y comparten el ambito global. */

"use strict";

/* ------------------------------ navegación / arranque ------------------------------ */
/* Solo las vistas que EXISTEN en esta pagina. Puertas y paneles comparten este
   archivo pero no tienen los mismos tableros: dar por hecho que estan todas
   reventaba la navegacion entera en la pagina que no los tuviera. */
const VIEWS = ["control","planta","calidad","resumen","almacen","stock"]
  .filter(v => document.getElementById("v-"+v));

function goto(v){
  if(!VIEWS.includes(v)) return;
  $$(".tab").forEach(x=>x.setAttribute("aria-selected", String(x.dataset.view===v)));
  VIEWS.forEach(x=>$("#v-"+x).classList.toggle("hide", x!==v));
  /* Cada vista la pinta el modulo de su producto. Se llama solo a la que
     existe: puertas y paneles no comparten tableros, y dar por hecho que
     estan todos rompia la navegacion en la pagina que no los tuviera. */
  const pintar = {planta:"renderPlanta", calidad:"renderCalidad", resumen:"renderResumen",
                  almacen:"renderAlmacen", stock:"renderStock"}[v];
  if(pintar && typeof window[pintar] === "function") window[pintar]();
  if(v==="stock" && typeof renderModelos === "function") renderModelos();
}
$$(".tab").forEach(t=>t.onclick=()=>goto(t.dataset.view));

/** Quién soy, en la barra de arriba.
 *
 *  Se enseña el NOMBRE de la lista de usuarios, no el correo: en una pantalla
 *  compartida «Diego» se reconoce de un vistazo y «contacto@interfrigo.com.co»
 *  no dice quién está usando la aplicación. El correo sigue visible al pasar
 *  el ratón, que es cuando de verdad hace falta.
 *
 *  Si esa persona no tiene nombre puesto, se cae al correo: es preferible un
 *  correo a un hueco vacío. */
function pintarQuienSoy(){
  const nombre = (typeof MI_NOMBRE === "string" && MI_NOMBRE.trim()) ? MI_NOMBRE.trim() : "";
  const visible = nombre || userMail || "conectado";
  const el = $("#u-mail");
  el.textContent = visible;
  el.title = nombre ? `${nombre} · ${userMail}` : (userMail || "");
  $("#u-av").textContent = visible[0].toUpperCase();
}
$("#btn-nueva").onclick = ()=>{
  $("#n-op").value = String(nextOp());        // siempre la siguiente disponible
  $("#n-fecha").value = hoy();                // fecha de creación: hoy
  hintOp();
  $("#ov-nueva").classList.remove("hide");
  setTimeout(()=>$("#n-cli").focus(), 60);
};
/* Puertas y paneles no tienen los mismos filtros — el de ensamble, por ejemplo,
   solo existe en puertas. Se recorre lo que de verdad hay en la pagina: dar por
   hecho que estan todos rompia la carga aqui y dejaba sin enganchar el resto. */
["f-q", ...FSEL].forEach(id=>{
  const e = $("#"+id); if(!e) return;
  e.addEventListener("input", render);
  e.addEventListener("change", render);
});
$("#f-clear").onclick = ()=>{
  $("#f-q").value="";
  FSEL.forEach(id=>{ const e = $("#"+id); if(e) e.value=""; });
  SEL.clear(); render();
};
$("#reconectar").onclick = async ()=>{
  // Nace de un clic, así que el navegador no bloquea la ventana de Google.
  const b=$("#reconectar"); b.disabled=true;
  try{
    token=null;
    if(await pedirToken()){ b.classList.add("hide"); refresh(false); }
    else entrarConGoogle();          // la sesión del servidor caducó
  }catch(e){ toast(e.message,"err"); }
  finally{ b.disabled=false; }
};
$("#btn-reload").onclick = ()=>refresh(false);
$("#btn-cfg").onclick = openCfg; $("#g-cfg").onclick = openCfg;
$("#btn-out").onclick = logout;

async function enterApp(){
  // Antes de mostrar nada: ¿esta persona tiene acceso, y con qué rol?
  const permiso = await loadUsuarios();
  if(!permiso.acceso){ sinAcceso(permiso.motivo); return; }

  pintarQuienSoy();
  $("#gate").classList.add("hide"); $("#app").classList.remove("hide");
  /* Las listas desplegables las manda la hoja, no una copia en el codigo. Se
     leen ANTES de montar el formulario, que es quien las reparte. */
  if(typeof leerListasDeLaHoja === "function"){
    await leerListasDeLaHoja();
    if(typeof pintarOrigenListas === "function") pintarOrigenListas();
  }
  initForm();
  // El dia de referencia es del resumen de puertas; paneles no lo tiene.
  const dia = $("#r-dia"); if(dia) dia.value = iso(new Date());
  await detectSep();          // separador de fórmulas según la región del documento
  await refresh(false);
  await repairStatus();       // sana los #ERROR! que pudieran quedar de versiones previas
  const nn = await repairNumeros();   // deshace los números que se guardaron como fecha
  if(nn) toast(`${nn} valor(es) numérico(s) corregido(s)`,"ok");
  /* Las reparaciones y automatismos que siguen son propios de cada producto.
     Se invocan solo si esta pagina los trae: antes se llamaban a ciegas, y la
     pagina de paneles ejecutaba los de puertas contra su propia hoja. */
  const si = async (nombre, msg) => {
    if(typeof window[nombre] !== "function") return;
    const n = await window[nombre]();
    if(n && msg) toast(msg(n), "ok");
  };
  try{                                // la hoja siempre con al menos MIN_FILAS filas
    const nf = await ensureRows(MIN_FILAS, 0);
    if(nf) toast(`Hoja ampliada: ${nf} fila(s) añadida(s)`,"ok");
  }catch(e){ console.warn("filas:", e.message); }
  await loadLog();                // el historial hace falta para poder reparar
  await sincronizarValidacion();        // la hoja ofrece las mismas opciones
  await si("repairSeparadas",    n=>`${n} separada(s) pasadas a su propia columna`);
  await si("repairFechasFalsas", n=>`${n} fecha(s) de proceso restaurada(s)`);
  // El escalado va ANTES: subir una OP de prioridad cambia su fecha programada,
  // y si se hiciera después quedaría con la fecha de la prioridad vieja.
  await si("autoPrioridades", n=>`${n} OP subieron de prioridad por antigüedad`);
  await si("autoFechas",      n=>`${n} fecha(s) de proceso programada(s)`);
  restartPoll();
  if(typeof loadModelos === "function") await loadModelos();   // catálogo de stock
  // La meta solo existe en puertas: paneles no tiene cronograma.
  if(typeof loadMeta === "function") await loadMeta();
  if(typeof loadInformes === "function") await loadInformes();
  aplicarRol();               // la interfaz se ajusta a lo que esta persona puede hacer
  pintarTimbre();
  renderDashVisible();
}
$("#g-login").onclick = ()=>{
  if(!cfgOk()){ openCfg(); return; }
  $("#g-msg").textContent = "Abriendo Google…";
  entrarConGoogle();
};

/** Dice exactamente qué falta y de dónde debería venir, en vez de un aviso
 *  genérico que obliga a adivinar. */
function explicarQueFalta(){
  const el = $("#g-falta"); if(!el) return;
  const emp = configDelModulo();
  const falta = [];
  if(!CFG.clientId) falta.push("el <b>Client ID</b>");
  if(!CFG.sheetId)  falta.push("el <b>ID de la hoja</b>");
  const q = falta.join(" y ");
  if(!emp){
    el.innerHTML = `Falta ${q} para el módulo <b>${esc(MOD.nombre)}</b>, y esta instalación
      no trae configuración propia. Pide el <b>enlace de configuración</b> a alguien que ya
      la use (⚙ › Enlace para otros equipos) o introdúcelo a mano en ⚙.`;
  } else {
    el.innerHTML = `Falta ${q} para el módulo <b>${esc(MOD.nombre)}</b>. La instalación sí
      trae configuración: pulsa <b>⚙ › Usar la de la empresa</b> para tomarla.`;
  }
}

(function boot(){
  // Todo lo visible dice a qué producto pertenece: sin ambigüedad posible.
  document.title = MOD.titulo + " | Interfrigo";
  const h1 = document.querySelector("#gate h1");
  if(h1) h1.textContent = MOD.titulo;

  aplicaTema(localStorage.getItem("puertas.tema") || "auto");
  loadCfg();
  $("#g-sheet").textContent = CFG.tab;
  $("#g-cfgwarn").classList.toggle("hide", cfgOk());

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
  pedirToken().then(t=>{
    if(t){ enterApp(); }
    else { $("#g-msg").textContent = ""; $("#g-login").focus(); }
  }).catch(e=>{ $("#g-msg").textContent = e.message; });
})();
