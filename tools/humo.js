/* Prueba de humo: arranca las dos paginas como lo haria un navegador.
 *
 * La leccion de la ultima vez: el fallo se escondio porque la prueba llamaba a
 * render() a mano. Aqui NO se llama a nada a mano — se deja que arranque sola
 * por el mismo camino que sigue en el navegador (boot -> pedirToken ->
 * enterApp -> refresh -> render) y solo despues se comprueba lo que se ve. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { JSDOM } = require("jsdom");

const RAIZ = "C:\\Users\\User\\Proyectos\\mando-produccion\\src";
const SHEET = "HOJA_DE_PRUEBA";

/* ------------------------------ hoja falsa ------------------------------ */
/* Datos de paneles con la forma real: 21 columnas, lote en texto en unas filas
   y fecha de verdad en otras, y K/L ya calculadas por la hoja. */
const CAB_PANEL = ["FECHA","CLIENTE","OP","PRIORIDAD","CANT","LARGO","PRODUCTO","RANURADO",
  "CARA A","CARA B","UNIDAD","TOTAL","PERFIL","INYECCION","LIMPIEZA","M2","STATUS",
  "COMIENZO PROCESO","FIN PROCESO","ESTADO","FECHA DE DESPACHO"];

const filaPanel = (f,cli,op,prio,cant,largo,prod,uni,tot,procs,m2,est,fini,ffin) =>
  [f,cli,op,prio,cant,largo,prod,"RANURADO","9002","9002",uni,tot,
   procs[0],procs[1],procs[2],m2,0,fini||"",ffin||"",est||"",""];

const DATOS = {
  "PANEL": [CAB_PANEL,
    filaPanel("agosto - 1","AMERICAN BLUE","1","BAJA",22,2.45,'PANEL 3"',8.208,180.569,
              [false,false,false],62.52,"EN PROCESO"),
    filaPanel("15/08/2026","SEFRIO","2-1","ALTA",40,2.5,'PANEL 3"',8.375,335.0,
              [true,true,true],116,"TERMINADO","15/08/2026","20/08/2026"),
    filaPanel("15/08/2026","SEFRIO","2-2","ALTA",10,3,'PANEL 6"',20.1,201.0,
              [true,false,false],34.8,"EN PROCESO","18/08/2026"),
    filaPanel("22/08/2026","GRIVAN","3","URGENTE",15,6,'PANEL 6"',40.2,603.0,
              [false,false,false],104.4,"EN PROCESO"),
    filaPanel("01/08/2026","NOVAFRIOS","4","MEDIA",50,2.45,'PANEL 4"',10.8,540.0,
              [true,true,true],142.1,"DESPACHADO","01/08/2026","10/08/2026"),
  ],
  "OP PUERTA": [new Array(39).fill("H"),
    (()=>{ const c=new Array(39).fill(""); c[0]="01/08/2026"; c[1]="900"; c[2]="FRIO";
           c[5]="PP 9002"; c[6]="SE12"; c[7]=100; c[8]=200; c[9]=1; c[12]="ALTA";
           for(let i=13;i<=20;i++) c[i]=false; c[22]=0; return c; })()
  ],
  "LOG PANELES": [["FECHA","USUARIO","ACCION","OP","FILA","CAMPO","ANTES","DESPUES"]],
  "LOG APP":     [["FECHA","USUARIO","ACCION","OP","FILA","CAMPO","ANTES","DESPUES"]],
  "USUARIOS":    [["CORREO","NOMBRE","ROL","ACTIVO","NOTA"],
                  ["yo@interfrigo.com.co","Yo","admin",true,""]],
  "MODELOS":         [["NOMBRE"]],
  "MODELOS PANELES": [["NOMBRE"]]
};

/** Lo que la aplicacion escribio, para poder comprobarlo despues. */
let ESCRITURAS = [];
let VALIDACIONES = [];

function celdasDe(rango){                 // "'PANEL'!A1:U"  ->  {tab, a1}
  const m = String(rango).match(/^'?([^'!]+)'?!(.+)$/);
  return m ? {tab:m[1], a1:m[2]} : {tab:"", a1:rango};
}
const colNum = L => [...L].reduce((n,ch)=>n*26 + (ch.charCodeAt(0)-64), 0) - 1;

function leer(tab, a1){
  const grid = DATOS[tab];
  if(!grid) return [];
  const m = a1.match(/^([A-Z]+)(\d*)(?::([A-Z]+)(\d*))?$/);
  if(!m) return grid;
  const c1 = colNum(m[1]), f1 = m[2] ? +m[2] : 1;
  const c2 = m[3] ? colNum(m[3]) : c1;
  const f2 = m[4] ? +m[4] : grid.length;
  const out = [];
  for(let f = f1; f <= Math.min(f2, grid.length); f++){
    out.push((grid[f-1] || []).slice(c1, c2+1));
  }
  return out;
}
function escribir(tab, a1, valores){
  ESCRITURAS.push({tab, a1, valores});
  const grid = DATOS[tab] || (DATOS[tab] = []);
  const m = a1.match(/^([A-Z]+)(\d+)/);
  if(!m) return;
  const c0 = colNum(m[1]);
  let f = +m[2];
  for(const fila of valores){
    while(grid.length < f) grid.push([]);
    const g = grid[f-1];
    fila.forEach((v,i)=>{ g[c0+i] = v; });
    f++;
  }
}

/* ------------------------------ red falsa ------------------------------ */
function hacerFetch(){
  return async (url, opts={}) => {
    const u = String(url);
    const cuerpo = opts.body ? JSON.parse(opts.body) : null;
    const ok = obj => ({ok:true, status:200, json: async()=>obj, text: async()=>JSON.stringify(obj)});

    if(u.includes("auth.php")){
      return ok({access_token:"t0k3n", expires_in:3600, email:"yo@interfrigo.com.co"});
    }
    if(u.includes("/values:batchUpdate")){
      (cuerpo.data||[]).forEach(d=>{
        const {tab, a1} = celdasDe(decodeURIComponent(d.range));
        escribir(tab, a1, d.values);
      });
      return ok({});
    }
    if(/\/values\/[^?]+\?.*valueInputOption/.test(u) && opts.method === "PUT"){
      const rango = decodeURIComponent(u.split("/values/")[1].split("?")[0]);
      const {tab, a1} = celdasDe(rango);
      escribir(tab, a1, cuerpo.values);
      return ok({});
    }
    if(u.includes(":batchUpdate")){
      (cuerpo.requests||[]).forEach(r=>{
        if(r.setDataValidation) VALIDACIONES.push(r.setDataValidation.range);
      });
      return ok({replies:[]});
    }
    if(u.includes("/values/")){
      const rango = decodeURIComponent(u.split("/values/")[1].split("?")[0]);
      const {tab, a1} = celdasDe(rango);
      return ok({values: leer(tab, a1)});
    }
    if(u.includes("?fields=")){
      return ok({sheets: Object.keys(DATOS).map((t,i)=>({properties:{
        title:t, sheetId:i, gridProperties:{rowCount:2000}}}))});
    }
    return ok({});
  };
}

/* ------------------------------ arranque ------------------------------ */
async function arrancar(pagina, tab){
  ESCRITURAS = []; VALIDACIONES = [];
  const html = fs.readFileSync(path.join(RAIZ, pagina), "utf8");
  const dom = new JSDOM(html, {
    url: "https://interfrigo.com.co/produccion/" + pagina,
    runScripts: "outside-only",   // hace falta para tener un contexto de VM
    pretendToBeVisual: true
  });
  const w = dom.window;
  w.fetch = hacerFetch();
  w.matchMedia = () => ({matches:false, addEventListener(){}, addListener(){}});
  w.confirm = () => true;
  w.alert = () => {};
  w.print = () => {};
  w.scrollTo = () => {};
  // Sin service worker, como un navegador que no lo soporta. Se BORRA la
  // clave: dejarla en undefined hacia pasar el «"serviceWorker" in navigator».
  try{ delete w.navigator.serviceWorker; }catch(e){}
  w.CONFIG_SERVIDOR = {
    clientId: "prueba.apps.googleusercontent.com",
    modulos: {puertas:{sheetId:"HOJA", tab:"OP PUERTA"},
              paneles:{sheetId:"HOJA", tab: tab}}
  };

  const fallos = [];
  w.addEventListener("error", e => fallos.push("error: " + (e.message || e.error)));
  w.addEventListener("unhandledrejection", e =>
    fallos.push("promesa: " + (e.reason && e.reason.message || e.reason)));
  const errConsola = [];
  w.console.error = (...a) => errConsola.push(a.join(" "));
  w.console.warn = () => {};

  /* TODOS los scripts, en el orden del documento y en el mismo ambito global,
     igual que el navegador. Los de dentro de la pagina cuentan: paneles.html
     declara ahi cual es su modulo, y saltarselos hacia que la prueba cargara
     el modelo de puertas creyendo que probaba paneles. */
  for(const el of [...w.document.querySelectorAll("script")]){
    const src = el.getAttribute("src");
    if(src && !src.startsWith("js/")) continue;          // config-app.js no existe aqui
    const nombre = src || "(dentro de " + pagina + ")";
    const codigo = src ? fs.readFileSync(path.join(RAIZ, src), "utf8") : el.textContent;
    if(!codigo.trim()) continue;
    try{ vm.runInContext(codigo, dom.getInternalVMContext(), {filename:nombre}); }
    catch(e){ fallos.push(`${nombre} reventó al cargar: ${e.message}`); }
  }

  // Se deja que la aplicacion haga sola su arranque completo.
  for(let i = 0; i < 60 && !fallos.length; i++){
    await new Promise(r => setTimeout(r, 25));
    if(w.document.getElementById("app") &&
       !w.document.getElementById("app").classList.contains("hide") &&
       w.document.querySelectorAll("#tb tr").length) break;
  }
  await new Promise(r => setTimeout(r, 300));
  return {w, dom, fallos, errConsola};
}

/* ------------------------------ comprobaciones ------------------------------ */
let malas = 0;
function comprueba(nombre, cond, detalle){
  const bien = !!cond;
  if(!bien) malas++;
  console.log(`  ${bien ? "ok  " : "FALLA"} ${nombre}${bien || !detalle ? "" : "\n        " + detalle}`);
}

(async ()=>{
  /* ============ PANELES ============ */
  console.log("\n=== paneles.html — arranque natural ===");
  const {w, fallos, errConsola} = await arrancar("paneles.html", "PANEL");
  const $ = s => w.document.querySelector(s);
  const $$ = s => [...w.document.querySelectorAll(s)];

  comprueba("carga sin errores", !fallos.length, fallos.join("\n        "));
  /* Si los scripts no cargaron, lo que venga despues no prueba nada: sin este
     corte, las comprobaciones de las vistas salian «ok» sobre una pagina vacia
     y la prueba parecia pasar. */
  if(fallos.length){
    console.log("\n  Se corta: sin los scripts cargados no hay nada que comprobar.\n");
    process.exit(1);
  }
  comprueba("sin errores en consola", !errConsola.length, errConsola.join("\n        "));
  comprueba("entra a la aplicación sin pedir nada",
    $("#app") && !$("#app").classList.contains("hide"));
  comprueba("la tabla se pinta sola", $$("#tb tr").length > 0,
    "filas pintadas: " + $$("#tb tr").length);
  comprueba("los KPI se pintan solos", $$("#kpis .kpi").length > 0);
  comprueba("los filtros se llenan solos",
    $("#f-prod") && $("#f-prod").options.length > 1,
    "opciones: " + ($("#f-prod") ? $("#f-prod").options.length : "sin filtro"));

  console.log("\n=== las columnas que se escriben son las de PANELES ===");
  const fuera = ESCRITURAS.filter(e => e.tab === "PANEL")
    .filter(e => { const m = e.a1.match(/^([A-Z]+)/); return m && colNum(m[1]) > 20; });
  comprueba("nada se escribe más allá de la columna U", !fuera.length,
    fuera.map(e=>e.a1).join(", "));
  const valPanel = VALIDACIONES.filter(v => v.sheetId === Object.keys(DATOS).indexOf("PANEL"));
  const cols = [...new Set(valPanel.map(v=>v.startColumnIndex))].sort((a,b)=>a-b);
  comprueba("los desplegables van a D (prioridad) y T (estado)",
    JSON.stringify(cols) === "[3,19]", "columnas tocadas: " + JSON.stringify(cols));
  comprueba("NO se toca la columna M, que aquí es la casilla de PERFIL",
    !cols.includes(12));

  console.log("\n=== marcar un proceso ===");
  ESCRITURAS = [];
  const boton = $("#tb .p");
  comprueba("hay botones de proceso", !!boton);
  if(boton){
    boton.dispatchEvent(new w.MouseEvent("click", {bubbles:true}));
    await new Promise(r => setTimeout(r, 400));
    const letras = ESCRITURAS.filter(e=>e.tab==="PANEL").map(e=>e.a1.replace(/\d+/g,""));
    comprueba("escribe el proceso y el avance en Q, no en W",
      letras.includes("Q") && !letras.includes("W"),
      "columnas escritas: " + letras.join(", "));
    comprueba("sella el comienzo de proceso en R", letras.includes("R"),
      "columnas escritas: " + letras.join(", "));
  }

  console.log("\n=== llegar al 100 % NO cierra la línea ===");
  /* Esta es la regla que se cambio: marcar el ultimo proceso dice lo que se ha
     hecho, no que la linea este lista para almacen. Eso lo decide una persona
     con el boton Terminar. */
  ESCRITURAS = [];
  const fila = $$('#tb tr[data-r]')[0];
  const rMarca = +fila.dataset.r;
  // Solo los que faltan: el paso anterior ya marco uno, y volver a pulsarlo
  // lo desmarcaria en vez de completar la linea.
  for(const b of [...fila.querySelectorAll(".p.off")]){
    b.dispatchEvent(new w.MouseEvent("click", {bubbles:true}));
    await new Promise(r => setTimeout(r, 220));
  }
  await new Promise(r => setTimeout(r, 400));
  const trasMarcar = ESCRITURAS.filter(e=>e.tab==="PANEL").map(e=>e.a1.replace(/\d+/g,""));
  const avance = Math.round(
    [12,13,14].filter(i => DATOS.PANEL[rMarca-1][i] === true).length / 3 * 100);
  comprueba("los tres procesos quedan marcados", avance === 100, "avance: " + avance + "%");
  comprueba("NO sella el fin de proceso (S)", !trasMarcar.includes("S"),
    "columnas escritas: " + [...new Set(trasMarcar)].join(", "));
  comprueba("NO pone el estado en TERMINADO (T)", !trasMarcar.includes("T"),
    "estado en la hoja: " + DATOS.PANEL[rMarca-1][19]);

  console.log("\n=== la línea al 100 % sigue en planta, esperando ===");
  $$(".tab").find(t=>t.dataset.view==="planta")
    .dispatchEvent(new w.MouseEvent("click", {bubbles:true}));
  await new Promise(r => setTimeout(r, 300));
  const tarjeta = $(`#p-lista .pcard[data-r="${rMarca}"]`);
  comprueba("la tarjeta sigue en la cola", !!tarjeta);
  comprueba("y se marca como lista para terminar",
    tarjeta && tarjeta.classList.contains("pc-lista"),
    tarjeta ? "clases: " + tarjeta.className.trim() : "");

  console.log("\n=== Terminar es lo que la cierra y la manda a almacén ===");
  ESCRITURAS = [];
  if(tarjeta){
    tarjeta.querySelector("[data-term]")
      .dispatchEvent(new w.MouseEvent("click", {bubbles:true}));
    await new Promise(r => setTimeout(r, 500));
  }
  const trasTerminar = ESCRITURAS.filter(e=>e.tab==="PANEL")
    .map(e=>e.a1.replace(/\d+/g,""));
  comprueba("sella el fin de proceso en S", trasTerminar.includes("S"),
    "columnas escritas: " + [...new Set(trasTerminar)].join(", "));
  comprueba("pone el estado TERMINADO en T",
    String(DATOS.PANEL[rMarca-1][19]).toUpperCase() === "TERMINADO",
    "estado: " + DATOS.PANEL[rMarca-1][19]);
  comprueba("sale de la cola de planta",
    !$(`#p-lista .pcard[data-r="${rMarca}"]`));

  $$(".tab").find(t=>t.dataset.view==="almacen")
    .dispatchEvent(new w.MouseEvent("click", {bubbles:true}));
  await new Promise(r => setTimeout(r, 300));
  comprueba("y aparece en almacén",
    $("#a-lista").textContent.includes(String(DATOS.PANEL[rMarca-1][2])),
    "almacén dice: " + $("#a-lista").textContent.trim().slice(0, 90));

  $$(".tab").find(t=>t.dataset.view==="control")
    .dispatchEvent(new w.MouseEvent("click", {bubbles:true}));
  await new Promise(r => setTimeout(r, 200));

  console.log("\n=== crear una ficha de dos líneas ===");
  ESCRITURAS = [];
  $("#btn-nueva").dispatchEvent(new w.MouseEvent("click", {bubbles:true}));
  await new Promise(r => setTimeout(r, 60));
  $("#n-add").dispatchEvent(new w.MouseEvent("click", {bubbles:true}));
  $("#n-cli").value = "CLIENTE DE PRUEBA";
  const filas = $$("#n-lineas tr");
  comprueba("el creador tiene dos líneas", filas.length === 2, "líneas: " + filas.length);
  filas.forEach((tr,i)=>{
    tr.querySelector('[data-f="CANT"]').value = String(10 + i);
    tr.querySelector('[data-f="LARGO"]').value = "2.5";
    tr.querySelector('[data-f="PROD"]').value = i ? 'PANEL 4"' : 'PANEL 3"';
  });
  $("#n-lineas").dispatchEvent(new w.Event("input", {bubbles:true}));
  const opNueva = $("#n-op").value;
  $("#form-new").dispatchEvent(new w.Event("submit", {bubbles:true, cancelable:true}));
  await new Promise(r => setTimeout(r, 500));
  const nuevas = ESCRITURAS.filter(e => /^A\d+:U\d+$/.test(e.a1));
  comprueba("escribe dos filas completas A..U", nuevas.length === 2,
    "filas escritas: " + nuevas.length);
  if(nuevas.length === 2){
    const dosDigitos = n => String(n).padStart(2, "0");
    const ahora = new Date();
    const hoyTxt = `${dosDigitos(ahora.getDate())}/${dosDigitos(ahora.getMonth()+1)}/${ahora.getFullYear()}`;
    comprueba("la fecha de creación es la de hoy",
      nuevas.every(e => e.valores[0][0] === hoyTxt),
      "escrito: " + nuevas.map(e=>e.valores[0][0]).join(" y ") + " · hoy: " + hoyTxt);
    const ops = nuevas.map(e => e.valores[0][2]);
    comprueba("las dos líneas comparten OP con sufijo",
      ops[0] === opNueva + "-1" && ops[1] === opNueva + "-2", "OP: " + ops.join(" y "));
    const kl = nuevas.every(e => e.valores[0][10] === "" && e.valores[0][11] === "");
    comprueba("no pisa K ni L, que son fórmula de la hoja", kl);
  }

  console.log("\n=== las demás vistas, entrando por las pestañas ===");
  for(const vista of ["planta","resumen","almacen"]){
    const antes = errConsola.length;
    const tab = $$(".tab").find(t => t.dataset.view === vista);
    comprueba(`existe la pestaña ${vista}`, !!tab);
    if(!tab) continue;
    let reventó = null;
    try{ tab.dispatchEvent(new w.MouseEvent("click", {bubbles:true})); }
    catch(e){ reventó = e.message; }
    await new Promise(r => setTimeout(r, 250));
    comprueba(`${vista} se pinta sin reventar`, !reventó && errConsola.length === antes,
      reventó || errConsola.slice(antes).join(" | "));
    const cont = $("#v-" + vista);
    comprueba(`${vista} tiene contenido`, cont && cont.textContent.trim().length > 40);
  }
  const cola = $$("#p-lista .pcard").length;
  comprueba("planta ordena la cola", cola > 0, "tarjetas: " + cola);
  comprueba("planta avisa de los cambios de montaje", $$("#p-lista .setup").length > 0);
  comprueba("resumen calcula el poliuretano", $$("#r-poli-mes tr").length > 1);
  comprueba("resumen propone un plazo de entrega",
    $("#r-entrega") && /\d/.test($("#r-entrega").textContent));
  comprueba("almacén agrupa por pedido", $$("#a-lista .pedido").length > 0,
    "pedidos: " + $$("#a-lista .pedido").length);

  /* ============ PUERTAS: que no se haya roto nada ============ */
  console.log("\n=== puertas.html — que siga igual ===");
  const p = await arrancar("puertas.html", "OP PUERTA");
  comprueba("puertas carga sin errores", !p.fallos.length, p.fallos.join("\n        "));
  comprueba("puertas sin errores en consola", !p.errConsola.length,
    p.errConsola.join("\n        "));
  comprueba("puertas entra a la aplicación",
    p.w.document.getElementById("app") &&
    !p.w.document.getElementById("app").classList.contains("hide"));
  comprueba("puertas pinta su tabla",
    p.w.document.querySelectorAll("#tb tr").length > 0);
  const valPuerta = VALIDACIONES.map(v=>v.startColumnIndex).filter(v=>v!==undefined);
  comprueba("puertas sigue validando M, Y y AM",
    [12,24,38].every(c => valPuerta.includes(c)),
    "columnas: " + JSON.stringify([...new Set(valPuerta)].sort((a,b)=>a-b)));

  console.log(malas ? `\n${malas} comprobación(es) fallan\n` : "\nTodo correcto\n");
  process.exit(malas ? 1 : 0);
})().catch(e => { console.error("la prueba reventó:", e); process.exit(2); });
