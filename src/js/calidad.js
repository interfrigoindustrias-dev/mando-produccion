/* Tablero de calidad: revision antes de almacen
   Proyecto: Control de Produccion - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en la pagina y comparten el ambito global. */

"use strict";

/* ============================== CALIDAD ==============================
   El paso que faltaba entre planta y almacen.

   Una puerta al 100% no esta lista para vender: esta lista para que la MIREN.
   Aqui aterrizan las terminadas, calidad las revisa y decide:

     · Sin problemas  -> pasa a «En Almacén» y desaparece de esta lista.
     · Con problemas  -> se marca NO APTA y se anota que le pasa. Se queda
                         arriba del todo hasta que alguien la arregle.

   Las notas van a la columna AK (NOTAS DE CALIDAD) de la hoja, asi que quedan
   con la puerta para siempre, no solo dentro de la aplicacion.

   El orden es deliberado: primero lo que esta mal. El objetivo del tablero es
   depurar rapido, y para eso lo pendiente tiene que estar arriba, no perdido
   entre decenas de puertas correctas.                                        */

/* Marca de «no apta». Se guarda dentro de la misma nota de la columna AK
   porque la hoja no tiene una columna aparte, y anadir una obligaria a cambiar
   la estructura de la hoja. El prefijo es reconocible y se lee bien desde la
   propia hoja de calculo. */
const NO_APTA = "NO APTA";
const esNoApta = c => String(c[C.CAL] ?? "").trim().toUpperCase().startsWith(NO_APTA);
/** La nota sin el prefijo: lo que la persona escribio de verdad. */
const notaLimpia = c => String(c[C.CAL] ?? "").replace(/^\s*NO APTA\s*[:·-]?\s*/i, "").trim();

/* Puertas marcadas para imprimir etiqueta. Se guarda aparte del HTML porque la
   lista se repinta cada vez que se guarda una nota: si la seleccion viviera solo
   en las casillas, se perderia a media tanda. */
const SEL_CAL = new Set();

/** Puertas que le competen a calidad ahora mismo. */
function calidadBase(){
  return ROWS.filter(({c})=>{
    if(!rowActive(c) || anulada(c)) return false;
    if(esNoApta(c)) return true;               // rechazada: sigue aqui hasta arreglarse
    // «Terminado» es una declaracion humana: la puerta esta hecha. Vale por si
    // sola, aunque falte marcar algun proceso — si se exigiera el 100% una
    // puerta terminada con un check sin marcar saldria de planta y no llegaria
    // aqui: se perderia entre las dos vistas.
    if(terminada(c)) return true;
    return completa(c) && desp(c) === "";
  });
}

function calidadList(){
  const q = $("#q-q").value.trim().toLowerCase(), fe = $("#q-est").value;
  const L = calidadBase().filter(({c})=>{
    if(fe === "mal" && !esNoApta(c)) return false;
    if(fe === "ok"  &&  esNoApta(c)) return false;
    if(q && ![c[C.OP], c[C.CLI], c[C.TIPO], notaLimpia(c)].join(" ").toLowerCase().includes(q)) return false;
    return true;
  });
  // Primero lo que hay que arreglar; dentro de cada grupo, lo mas antiguo antes.
  L.sort((a,b)=>{
    const ma = esNoApta(a.c), mb = esNoApta(b.c);
    if(ma !== mb) return ma ? -1 : 1;
    const fa = toDate(a.c[C.FPROC]), fb = toDate(b.c[C.FPROC]);
    return (fa ? fa.getTime() : 8e15) - (fb ? fb.getTime() : 8e15);
  });
  return L;
}

function renderCalidad(){
  const L = calidadList(), B = calidadBase();
  const malas = B.filter(({c})=>esNoApta(c));
  const esperando = B.filter(({c})=>!esNoApta(c));

  kpiCards("#q-kpis", [
    ["Por revisar", esperando.length, "Terminadas al 100% esperando el visto bueno de calidad", 0, esperando],
    ["No aptas",    malas.length,     "Rechazadas: tienen algo que corregir antes de almacén", malas.length > 0, malas],
    ["En revisión",  B.length,        "Todo lo que hoy le compete a calidad", 0, B]
  ]);

  contador("#q-cnt", L.length, B.length, ["q-est"], "q-q");

  $("#q-lista").innerHTML = L.map(({r,c})=>{
    const mal = esNoApta(c);
    const bloqueo = mal ? " disabled" : "";
    return `<div class="qcard${mal ? " mal" : ""}" data-r="${r}">
      <div class="qh">
        <label class="qsel" title="Marcar para imprimir su etiqueta">
          <input type="checkbox" data-sel="${r}"${SEL_CAL.has(r) ? " checked" : ""}></label>
        <span class="op">OP ${esc(c[C.OP] ?? "")}</span>
        <span class="cli">${esc(c[C.CLI] ?? "")}</span>
        <span class="met">${esc(c[C.TIPO] ?? "")} · ${num(c[C.ANCHO]) ?? "—"}×${num(c[C.ALTO]) ?? "—"} · ${esc(c[C.AP] ?? "")}</span>
        <span class="met">Fabricada ${esc(fmtDate(c[C.FPROC])) || "—"}</span>
        ${mal ? '<span class="tag t-mal">NO APTA</span>' : '<span class="tag t-esp">POR REVISAR</span>'}
        <button class="btn sm" data-ver="${r}" title="Abrir la ficha completa">Ficha</button>
      </div>
      <label class="qnota"><span>Qué le pasa</span>
        <textarea class="inp" data-nota="${r}" rows="2"
          placeholder="Golpe en la hoja, marco torcido, falta empaque…">${esc(notaLimpia(c))}</textarea></label>
      <div class="qacc">
        <label class="proc"><input type="checkbox" data-mal="${r}"${mal ? " checked" : ""}>
          <span>No apta — necesita corrección</span></label>
        <div class="grow"></div>
        <button class="btn" data-guardar="${r}">Guardar nota</button>
        <button class="btn pri" data-almacen="${r}"${bloqueo}>Aprobar → En Almacén</button>
      </div>
    </div>`;
  }).join("");
  $("#q-empty").classList.toggle("hide", L.length > 0);

  // Si una puerta sale de la lista (se aprobo, se filtro), deja de estar
  // seleccionada: imprimir la etiqueta de algo que ya no se ve confunde.
  const visibles = new Set(L.map(x=>x.r));
  [...SEL_CAL].forEach(r=>{ if(!visibles.has(r)) SEL_CAL.delete(r); });
  pintarSelCalidad();
}

/** Refresca el contador y el botón de etiquetas. */
function pintarSelCalidad(){
  const n = SEL_CAL.size;
  const c = $("#q-nsel"); if(c) c.textContent = n;
  const b = $("#q-print"); if(b) b.disabled = n === 0;
  const t = $("#q-todas");
  if(t) t.textContent = n && n === document.querySelectorAll("[data-sel]").length
    ? "Quitar selección" : "Seleccionar todas";
}

/** Guarda la nota de calidad (AK) y, si procede, el estado de despacho (Y). */
async function guardarCalidad(r, {nota, mal, aAlmacen}){
  const row = ROWS.find(x=>x.r === r); if(!row) return false;
  const c = row.c;
  const antesNota = String(c[C.CAL] ?? "");
  const antesDesp = desp(c);

  // La marca y el texto viven en la misma celda: se componen en un solo sitio
  // para que no puedan quedar en desacuerdo.
  const limpio = String(nota ?? "").trim();
  const nueva  = mal ? (limpio ? `${NO_APTA}: ${limpio}` : NO_APTA) : limpio;

  const ups = [], cambios = [];
  if(nueva !== antesNota){
    ups.push({a1:`AK${r}`, v:[[nueva]]});
    cambios.push({campo:"Notas de calidad", antes:antesNota, despues:nueva});
    c[C.CAL] = nueva;
  }
  if(aAlmacen && antesDesp !== "En Almacén"){
    ups.push({a1:`Y${r}`, v:[["En Almacén"]]});
    cambios.push({campo:"Estado despacho", antes:antesDesp, despues:"En Almacén"});
    c[C.DESP] = "En Almacén";
  }
  if(!ups.length) return true;

  try{
    await writeCells(ups);
    logChanges("EDITA", c[C.OP], r, cambios);
    setSync("", "Guardado");
    return true;
  }catch(e){
    c[C.CAL] = antesNota; c[C.DESP] = antesDesp;
    toast(e.message, "err"); return false;
  }
}

/* ---------- interacción ---------- */
const notaDe = r => { const t = $(`[data-nota="${r}"]`); return t ? t.value : ""; };
const malDe  = r => { const k = $(`[data-mal="${r}"]`);  return k ? k.checked : false; };

$("#q-lista").addEventListener("click", async ev=>{
  const ver = ev.target.closest("[data-ver]");
  if(ver){ openDet(+ver.dataset.ver); return; }

  const g = ev.target.closest("[data-guardar]");
  if(g){
    const r = +g.dataset.guardar; g.disabled = true;
    const ok = await guardarCalidad(r, {nota:notaDe(r), mal:malDe(r), aAlmacen:false});
    g.disabled = false;
    if(ok){ toast("Nota guardada","ok"); renderCalidad(); render(); renderDashVisible(); }
    return;
  }

  const a = ev.target.closest("[data-almacen]");
  if(a){
    const r = +a.dataset.almacen;
    if(malDe(r)){ toast("Está marcada como no apta: corrígela y quita la marca","err"); return; }
    a.disabled = true;
    const ok = await guardarCalidad(r, {nota:notaDe(r), mal:false, aAlmacen:true});
    a.disabled = false;
    if(ok){ toast("Puerta aprobada y pasada a almacén","ok"); renderCalidad(); render(); renderDashVisible(); }
  }
});

/* Marcar «no apta» bloquea el botón de aprobar en el acto: no tiene sentido
   poder mandar a almacén algo que se acaba de rechazar. */
$("#q-lista").addEventListener("change", ev=>{
  const k = ev.target.closest("[data-mal]"); if(!k) return;
  const card = k.closest(".qcard");
  card.classList.toggle("mal", k.checked);
  card.querySelector("[data-almacen]").disabled = k.checked;
  const tag = card.querySelector(".tag");
  tag.className = "tag " + (k.checked ? "t-mal" : "t-esp");
  tag.textContent = k.checked ? "NO APTA" : "POR REVISAR";
});

/* Selección para imprimir. La casilla no toca la hoja: solo elige qué se
   imprime, asi que no pasa por guardarCalidad. */
$("#q-lista").addEventListener("change", ev=>{
  const k = ev.target.closest("[data-sel]"); if(!k) return;
  const r = +k.dataset.sel;
  k.checked ? SEL_CAL.add(r) : SEL_CAL.delete(r);
  k.closest(".qcard").classList.toggle("sel", k.checked);
  pintarSelCalidad();
});

document.addEventListener("DOMContentLoaded", ()=>{
  const t = $("#q-todas");
  if(t) t.onclick = ()=>{
    const cajas = [...document.querySelectorAll("[data-sel]")];
    const marcar = SEL_CAL.size !== cajas.length;      // si ya estaban todas, se quitan
    SEL_CAL.clear();
    cajas.forEach(k=>{
      k.checked = marcar;
      k.closest(".qcard").classList.toggle("sel", marcar);
      if(marcar) SEL_CAL.add(+k.dataset.sel);
    });
    pintarSelCalidad();
  };

  const p = $("#q-print");
  if(p) p.onclick = ()=> pedirSticker([...SEL_CAL]);
});

["#q-q","#q-est"].forEach(s=>{
  const el = $(s); if(!el) return;
  el.addEventListener("input", renderCalidad);
  el.addEventListener("change", renderCalidad);
});
