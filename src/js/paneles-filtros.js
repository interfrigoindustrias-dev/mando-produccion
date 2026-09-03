/* Filtros de paneleria: varios valores a la vez, y sin comerse la pantalla
   Proyecto: Control de Produccion - Interfrigo

   DOS PROBLEMAS, UNA SOLA PIEZA

   1. Con un desplegable por columna solo se podia filtrar por UN valor. Pero
      «PANEL 2"» y «PISO 2"» son el mismo espesor y se preparan juntos: querer
      verlos a la vez no es un capricho, es como se trabaja.

   2. Nueve desplegables en fila ocupan media pantalla de tablet, y en el movil
      son nueve renglones que hay que pasar antes de llegar a los datos. La
      barra de filtros estorbaba mas de lo que ayudaba.

   Se resuelven con la misma pieza: cada filtro es un boton que abre una lista
   de casillas —con su propio buscador cuando hay muchas—, y lo elegido se ve
   como fichas quitables debajo. La barra ocupa una linea este vacia o llena, y
   en el movil todo se pliega detras de un unico boton «Filtros».             */
"use strict";

/** Cada vista tiene su barra: donde van los botones, donde las fichas de lo
 *  elegido, cual es su buscador libre, y con que boton se pliega. */
const GRUPOS = [];
const grupoFiltros = g => { GRUPOS.push(g); return g; };

/** Lo seleccionado en cada filtro: id -> Set de valores. */
const FILTROS = new Map();
/** Como se llama cada filtro y que ofrece. */
const DEF_FILTROS = new Map();

const filtroSel = id => [...(FILTROS.get(id) || [])];
const filtroVacio = id => !(FILTROS.get(id) || new Set()).size;

/** Un filtro vacio no filtra; con varios valores puestos, vale cualquiera. */
function filtroPasa(id, valor){
  const sel = FILTROS.get(id);
  if(!sel || !sel.size) return true;
  return sel.has(String(valor ?? "").trim());
}
/** Igual, pero mirando varios campos a la vez: «cara A o cara B». */
function filtroPasaAlguno(id, valores){
  const sel = FILTROS.get(id);
  if(!sel || !sel.size) return true;
  return valores.some(v => sel.has(String(v ?? "").trim()));
}

/** Declara un filtro. `valores` puede ser una funcion, y entonces se pregunta
 *  cada vez que se abre: asi sigue a la hoja sin volver a declararlo. */
function definirFiltro(contenedor, id, etiqueta, valores){
  DEF_FILTROS.set(id, {contenedor, etiqueta, valores});
  if(!FILTROS.has(id)) FILTROS.set(id, new Set());
}
const valoresDeFiltro = def =>
  (typeof def.valores === "function" ? def.valores() : def.valores) || [];

/** Cuantos filtros de una barra tienen algo puesto, contando su buscador. */
function filtrosPuestos(g){
  let n = 0;
  for(const [id, def] of DEF_FILTROS){
    if(def.contenedor === g.filtros && !filtroVacio(id)) n++;
  }
  const q = g.busca ? $(g.busca) : null;
  if(q && q.value.trim()) n++;
  return n;
}

/* ------------------------------ pintado ------------------------------ */
function pintarFiltros(){
  const porContenedor = new Map();
  for(const [id, def] of DEF_FILTROS){
    const l = porContenedor.get(def.contenedor) ||
              porContenedor.set(def.contenedor, []).get(def.contenedor);
    l.push([id, def]);
  }
  for(const [sel, lista] of porContenedor){
    const cont = $(sel);
    if(!cont) continue;
    cont.innerHTML = lista.map(([id, def])=>{
      const puestos = filtroSel(id), n = puestos.length;
      /* Con un solo valor se dice cual, que es mas util que decir «1». Con
         varios no cabe, y entonces se dice cuantos. */
      const resumen = n === 0 ? def.etiqueta : n === 1 ? puestos[0] : `${def.etiqueta} · ${n}`;
      return `<div class="filtro ${n?"on":""}">
        <button type="button" class="filtro-btn" data-abrir="${esc(id)}"
          title="${esc(def.etiqueta)}"><span>${esc(resumen)}</span><i>▾</i></button>
        <div class="filtro-menu hide" data-menu="${esc(id)}"></div>
      </div>`;
    }).join("");
  }
  GRUPOS.forEach(pintarFichasFiltro);
}

/** Lo elegido, como fichas quitables. Es lo que hace que no haga falta abrir
 *  nada para saber por que se esta viendo lo que se ve. */
function pintarFichasFiltro(g){
  const cont = $(g.fichas);
  if(cont){
    const fichas = [];
    for(const [id, def] of DEF_FILTROS){
      if(def.contenedor !== g.filtros) continue;
      for(const v of filtroSel(id)){
        fichas.push(`<button type="button" class="ffic" data-quitar-f="${esc(id)}"
          data-valor="${esc(v)}" title="Quitar este filtro">
          <em>${esc(def.etiqueta)}</em>${esc(v)}<i>×</i></button>`);
      }
    }
    cont.innerHTML = fichas.join("");
    cont.classList.toggle("hide", !fichas.length);
  }
  const btn = g.boton ? $(g.boton) : null;
  if(btn){
    const n = filtrosPuestos(g);
    btn.classList.toggle("on", n > 0);
    const b = btn.querySelector("b");
    if(b) b.textContent = n ? String(n) : "";
  }
}

/** El contenido de un menu: casillas, y buscador propio si son muchas. */
function pintarMenu(id){
  const def = DEF_FILTROS.get(id);
  const menu = document.querySelector(`[data-menu="${CSS.escape(id)}"]`);
  if(!def || !menu) return;
  const valores = valoresDeFiltro(def).map(String);
  const sel = FILTROS.get(id) || new Set();
  const busca = (menu.dataset.busca || "").toLowerCase();
  const visibles = busca ? valores.filter(v => v.toLowerCase().includes(busca)) : valores;

  menu.innerHTML =
    (valores.length > 8
      ? `<input class="inp sm filtro-busca" placeholder="Buscar…" autocomplete="off"
           value="${esc(menu.dataset.busca || "")}">` : "") +
    `<div class="filtro-ops">` +
      (visibles.length
        ? visibles.map(v=>`<label class="filtro-op">
            <input type="checkbox" value="${esc(v)}"${sel.has(v)?" checked":""}>
            <span>${esc(v)}</span></label>`).join("")
        : `<p class="mut" style="padding:10px">Nada que coincida.</p>`) +
    `</div>
     <div class="filtro-pie">
       <button type="button" class="btn sm" data-todos="${esc(id)}">Todos</button>
       <button type="button" class="btn sm" data-ninguno="${esc(id)}">Ninguno</button>
     </div>`;
}

const cerrarMenus = () => $$(".filtro-menu").forEach(m=>m.classList.add("hide"));
const avisarCambio = () => { if(typeof aplicarFiltros === "function") aplicarFiltros(); };

/* ------------------------------ interaccion ------------------------------ */
document.addEventListener("click", ev=>{
  const abrir = ev.target.closest("[data-abrir]");
  if(abrir){
    const id = abrir.dataset.abrir;
    const menu = document.querySelector(`[data-menu="${CSS.escape(id)}"]`);
    const estaba = menu && !menu.classList.contains("hide");
    cerrarMenus();
    if(menu && !estaba){ pintarMenu(id); menu.classList.remove("hide"); }
    ev.stopPropagation();
    return;
  }

  /* Dentro del menu NO se cierra: la gracia de esto es marcar varias casillas
     de una vez, y cerrarse en la primera obligaria a abrirlo otra vez. */
  const dentro = ev.target.closest(".filtro-menu");
  if(dentro){
    const bt = ev.target.closest("[data-todos], [data-ninguno]");
    if(bt){
      const id = bt.dataset.todos || bt.dataset.ninguno;
      const valores = valoresDeFiltro(DEF_FILTROS.get(id)).map(String);
      FILTROS.set(id, bt.dataset.todos ? new Set(valores) : new Set());
      const busca = dentro.dataset.busca || "";
      pintarFiltros();
      const nuevo = document.querySelector(`[data-menu="${CSS.escape(id)}"]`);
      if(nuevo){ nuevo.dataset.busca = busca; pintarMenu(id); nuevo.classList.remove("hide"); }
      avisarCambio();
    }
    ev.stopPropagation();
    return;
  }

  const quitar = ev.target.closest("[data-quitar-f]");
  if(quitar){
    (FILTROS.get(quitar.dataset.quitarF) || new Set()).delete(quitar.dataset.valor);
    pintarFiltros();
    avisarCambio();
    return;
  }

  const plegar = ev.target.closest("[data-plegar]");
  if(plegar){
    const caja = $(plegar.dataset.plegar);
    if(caja) caja.classList.toggle("abierta");
    ev.stopPropagation();
    return;
  }
  cerrarMenus();
});

document.addEventListener("change", ev=>{
  const ck = ev.target.closest(".filtro-menu input[type=checkbox]");
  if(!ck) return;
  const menu = ck.closest("[data-menu]");
  const id = menu.dataset.menu;
  const sel = FILTROS.get(id) || new Set();
  ck.checked ? sel.add(ck.value) : sel.delete(ck.value);
  FILTROS.set(id, sel);

  /* Se repinta la barra —el boton tiene que decir cuantos van— pero el menu se
     deja abierto y en su sitio: a quien esta marcando casillas no se le puede
     mover la lista debajo del dedo. */
  const busca = menu.dataset.busca || "";
  const desplazado = menu.querySelector(".filtro-ops")
    ? menu.querySelector(".filtro-ops").scrollTop : 0;
  pintarFiltros();
  const nuevo = document.querySelector(`[data-menu="${CSS.escape(id)}"]`);
  if(nuevo){
    nuevo.dataset.busca = busca;
    pintarMenu(id);
    nuevo.classList.remove("hide");
    const ops = nuevo.querySelector(".filtro-ops");
    if(ops) ops.scrollTop = desplazado;
  }
  avisarCambio();
});

document.addEventListener("input", ev=>{
  const b = ev.target.closest(".filtro-busca");
  if(!b) return;
  const menu = b.closest("[data-menu]");
  menu.dataset.busca = b.value;
  pintarMenu(menu.dataset.menu);
  menu.classList.remove("hide");
  const campo = menu.querySelector(".filtro-busca");
  if(campo){ campo.focus(); campo.setSelectionRange(campo.value.length, campo.value.length); }
});

/** Vacia los filtros de una barra, o todos si no se dice cual. */
function limpiarFiltros(cual){
  for(const [id, def] of DEF_FILTROS){
    if(!cual || def.contenedor === cual) FILTROS.set(id, new Set());
  }
  GRUPOS.forEach(g=>{
    if(cual && g.filtros !== cual) return;
    const q = g.busca ? $(g.busca) : null;
    if(q) q.value = "";
  });
  pintarFiltros();
  avisarCambio();
}
