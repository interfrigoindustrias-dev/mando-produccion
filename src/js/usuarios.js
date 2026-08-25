/* Usuarios y roles
   Proyecto: Control de Produccion - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en la pagina y comparten el ambito global. */

"use strict";

/* ============================== USUARIOS ==============================
   La lista vive en la pestaña USUARIOS de la misma hoja. Al entrar, la app
   busca el correo de la persona y aplica su rol.

   HASTA DÓNDE LLEGA ESTO — importa entenderlo bien:
   los roles gobiernan la INTERFAZ. Como cada quien entra con su propia cuenta
   de Google y el navegador habla directo con la hoja, alguien con conocimientos
   podría saltárselos abriendo la hoja de cálculo. Sirven para ordenar el
   trabajo y evitar errores, no para contener a quien quiera saltárselos.
   Para que se cumplan de verdad, todas las escrituras tendrían que pasar por
   el servidor.                                                              */

const USU_TAB  = "USUARIOS";
const USU_HEAD = ["CORREO", "NOMBRE", "ROL", "ACTIVO", "NOTAS"];

/* Qué puede hacer cada rol. La primera columna es la más permisiva. */
const ROLES = {
  admin:   {nombre:"Administrador", puede:["*"]},
  oficina: {nombre:"Oficina",       puede:["ver","marcar","despachar","crear","editar","calidad"]},
  planta:  {nombre:"Planta",        puede:["ver.planta","marcar","despachar"]},
  lectura: {nombre:"Solo lectura",  puede:["ver"]}
};

let USUARIOS = [];
let MI_ROL = "admin";        // hasta que se lea la lista, no se estorba a nadie
let MI_NOMBRE = "";

/** ¿El rol actual permite esta acción? */
function puede(accion){
  const r = ROLES[MI_ROL];
  if(!r) return false;
  return r.puede.some(p => p === "*" || p === accion || accion.startsWith(p + "."));
}

/** Vistas que el rol tiene permitido abrir. */
function vistasPermitidas(){
  return VIEWS.filter(v => puede("ver") || puede("ver." + v));
}

async function loadUsuarios(){
  try{
    const meta = await api("?fields=sheets.properties.title");
    const hay = (meta.sheets||[]).some(s => s.properties.title === USU_TAB);
    if(!hay){
      // Primera vez: se crea la pestaña y quien la estrena queda como
      // administrador. Si no, nadie podría entrar a repartir permisos.
      await api(":batchUpdate", {method:"POST", body: JSON.stringify({
        requests:[{addSheet:{properties:{title:USU_TAB, gridProperties:{frozenRowCount:1}}}}]})});
      await api(`/values/${encodeURIComponent(`'${USU_TAB}'!A1`)}?valueInputOption=USER_ENTERED`,
        {method:"PUT", body: JSON.stringify({values:[
          USU_HEAD,
          [userMail, "", "admin", true, "Creó la lista al entrar por primera vez"]
        ]})});
    }
    const j = await api(`/values/${encodeURIComponent(`'${USU_TAB}'!A2:E`)}?valueRenderOption=UNFORMATTED_VALUE`);
    USUARIOS = (j.values||[])
      .filter(r => String(r[0]||"").trim())
      .map(r => ({
        correo: String(r[0]).trim().toLowerCase(),
        nombre: String(r[1]||"").trim(),
        rol:    String(r[2]||"lectura").trim().toLowerCase(),
        activo: tri(r[3]) !== false,
        notas:  String(r[4]||"").trim()
      }));
  }catch(e){ console.warn("USUARIOS:", e.message); USUARIOS = []; }

  // Sin lista legible no se bloquea a nadie: preferible seguir trabajando.
  if(!USUARIOS.length){ MI_ROL = "admin"; return {acceso:true}; }

  const yo = USUARIOS.find(u => u.correo === String(userMail).toLowerCase());
  if(!yo)        return {acceso:false, motivo:"no_esta"};
  if(!yo.activo) return {acceso:false, motivo:"inactivo"};

  MI_ROL = ROLES[yo.rol] ? yo.rol : "lectura";
  MI_NOMBRE = yo.nombre;
  return {acceso:true};
}

/** Adapta la interfaz al rol: oculta lo que esta persona no puede usar. */
function aplicarRol(){
  const permitidas = vistasPermitidas();
  $$(".tab").forEach(t => t.classList.toggle("hide", !permitidas.includes(t.dataset.view)));
  // Si la vista actual ya no está permitida, se va a la primera que sí lo esté.
  const actual = VIEWS.find(v => !$("#v-" + v).classList.contains("hide"));
  if(!permitidas.includes(actual) && permitidas.length) goto(permitidas[0]);

  const ocultar = (sel, cond) => $$(sel).forEach(e => e.classList.toggle("hide", !cond));
  ocultar("#btn-nueva",       puede("crear"));
  ocultar("#btn-usuarios",    puede("usuarios") || puede("*"));
  ocultar("#btn-print-stk",   puede("ver"));
  ocultar("#btn-print-carta", puede("ver"));
  ocultar("#q-print",         puede("ver"));
  ocultar("#q-todas",         puede("ver"));

  // Distintivo del rol junto al correo, para que nadie dude de con qué permisos entró.
  const chip = $("#u-rol");
  if(chip){
    chip.textContent = (ROLES[MI_ROL]||{}).nombre || MI_ROL;
    chip.className = "rolchip r-" + MI_ROL;
  }
  document.documentElement.dataset.rol = MI_ROL;
}

/** Pantalla de acceso denegado: dice qué pasa y a quién pedirlo. */
function sinAcceso(motivo){
  const admins = USUARIOS.filter(u => u.rol === "admin" && u.activo)
                         .map(u => u.nombre || u.correo);
  $("#gate").classList.remove("hide");
  $("#app").classList.add("hide");
  $("#g-msg").innerHTML = motivo === "inactivo"
    ? `Tu acceso está <b>desactivado</b>.`
    : `La cuenta <b>${esc(userMail)}</b> no está en la lista de usuarios.`;
  $("#g-msg").innerHTML += admins.length
    ? `<br>Pídeselo a ${esc(admins.join(" o "))}.`
    : "";
  $("#g-login").textContent = "Entrar con otra cuenta";
  $("#g-login").onclick = async ()=>{ await logout(); entrarConGoogle(); };
}

/* ---------- Panel de gestión (solo administradores) ---------- */

function abrirUsuarios(){
  if(!puede("usuarios") && !puede("*")){ toast("Solo un administrador puede gestionar usuarios","err"); return; }

  $("#us-limite").innerHTML = `<b>Estos permisos ordenan el trabajo, no lo blindan.</b>
    Cada persona entra con su cuenta de Google y el navegador habla directo con la
    hoja, así que quien tenga la hoja compartida podría saltarse la app y editarla
    a mano. Para quitar de verdad un acceso, hay que dejar de compartirle la hoja.`;

  $("#us-rol").innerHTML = Object.entries(ROLES)
    .map(([k,v])=>`<option value="${k}"${k==="planta"?" selected":""}>${esc(v.nombre)}</option>`).join("");

  pintarUsuarios();
  $("#ov-usuarios").classList.remove("hide");
}

function pintarUsuarios(){
  const opciones = (sel) => Object.entries(ROLES)
    .map(([k,v])=>`<option value="${k}"${k===sel?" selected":""}>${esc(v.nombre)}</option>`).join("");

  tablaMini("#us-tabla", ["Correo","Nombre","Rol","Activo","Notas"],
    USUARIOS.map((u,i)=>[
      `<span class="op">${esc(u.correo)}</span>${
        u.correo===String(userMail).toLowerCase()?' <span class="rolchip">tú</span>':""}`,
      `<input class="mini" data-u="${i}" data-campo="nombre" value="${esc(u.nombre)}" placeholder="—">`,
      `<select class="mini" data-u="${i}" data-campo="rol">${opciones(u.rol)}</select>`,
      `<label class="swi"><input type="checkbox" data-u="${i}" data-campo="activo"
         ${u.activo?"checked":""}><span>${u.activo?"Sí":"No"}</span></label>`,
      `<input class="mini" data-u="${i}" data-campo="notas" value="${esc(u.notas)}" placeholder="—">`
    ]),
    USUARIOS.map(u=>u.activo?"":"inactivo"));
}

/** Guarda una celda de la lista. La fila 1 son encabezados: se suma 2. */
async function guardarUsuario(i, campo, valor){
  const u = USUARIOS[i]; if(!u) return;
  const col = {nombre:"B", rol:"C", activo:"D", notas:"E"}[campo];
  if(!col) return;
  const antes = u[campo];
  u[campo] = valor;
  try{
    // Se escribe DIRECTO en la pestaña USUARIOS. Nada de writeCells: esa
    // función apunta siempre a la pestaña del módulo, y usarla aquí habría
    // machacado celdas de producción.
    await api(`/values/${encodeURIComponent(`'${USU_TAB}'!${col}${i+2}`)}?valueInputOption=USER_ENTERED`,
      {method:"PUT", body: JSON.stringify({values:[[valor]]})});
    logChanges("EDITA", u.correo, i+2, [{campo:"Usuario · "+campo, antes:String(antes), despues:String(valor)}]);
    setSync("","Guardado");
    // Si me cambio el rol a mí mismo, la interfaz debe reflejarlo ya.
    if(u.correo === String(userMail).toLowerCase() && campo === "rol"){
      MI_ROL = ROLES[valor] ? valor : "lectura";
      aplicarRol();
      toast("Tu propio rol cambió a "+(ROLES[MI_ROL]||{}).nombre,"ok");
    }
  }catch(e){ u[campo] = antes; pintarUsuarios(); toast(e.message,"err"); }
}

document.addEventListener("DOMContentLoaded", ()=>{
  const b = $("#btn-usuarios");
  if(b) b.onclick = abrirUsuarios;

  const t = $("#us-tabla");
  if(t) t.addEventListener("change", ev=>{
    const el = ev.target.closest("[data-u]"); if(!el) return;
    const valor = el.type === "checkbox" ? el.checked : el.value;
    guardarUsuario(+el.dataset.u, el.dataset.campo, valor);
    if(el.type === "checkbox") pintarUsuarios();
  });

  const add = $("#us-add");
  if(add) add.onclick = async ()=>{
    const correo = $("#us-correo").value.trim().toLowerCase();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)){ toast("Correo no válido","err"); return; }
    if(USUARIOS.some(u=>u.correo===correo)){ toast("Ese correo ya está en la lista","err"); return; }
    const u = {correo, nombre:$("#us-nombre").value.trim(), rol:$("#us-rol").value, activo:true, notas:""};
    add.disabled = true;
    try{
      await api(`/values/${encodeURIComponent(`'${USU_TAB}'!A:E`)}:append`+
                `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {method:"POST", body: JSON.stringify({values:[[u.correo,u.nombre,u.rol,true,""]]})});
      USUARIOS.push(u);
      logChanges("CREA", u.correo, USUARIOS.length+1,
                 [{campo:"Usuario", antes:"", despues:u.rol}]);
      $("#us-correo").value = ""; $("#us-nombre").value = "";
      pintarUsuarios();
      toast("Usuario añadido. Recuérdale que la hoja debe estar compartida con ese correo.","ok");
    }catch(e){ toast(e.message,"err"); }
    finally{ add.disabled = false; }
  };
});
