/* Meta de produccion: cuantos puntos en cuantos dias
   Proyecto: Control de Produccion - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en la pagina y comparten el ambito global. */

"use strict";

/* ============================== META ==============================
   «Quiero tantos puntos en tantos dias» — y el sistema organiza el trabajo
   para ese ritmo.

   Vive en la pestaña META de la hoja, no en el codigo ni en el navegador.
   Tres razones: se cambia sin tocar la aplicacion, la ve todo el mundo, y
   queda igual en el movil del jefe de planta que en el ordenador de oficina.

   La cifra que manda es PUNTOS AL DIA: puntos objetivo divididos entre dias.
   Se guarda como objetivo y plazo, en vez de directamente puntos/dia, porque
   asi se pide como se piensa («108 puntos en 15 dias»), no como se calcula.  */

const META_TAB  = "META";
const META_HEAD = ["PARAMETRO", "VALOR", "NOTA"];

/* Por defecto, 7,2 puntos al dia — el ritmo que se fijo como objetivo.
   Expresado como 108 puntos en 15 dias habiles. */
const META_DEF = {puntos: 108, dias: 15};

let META = {...META_DEF};

/** Puntos que hay que sacar cada dia habil para cumplir la meta. */
const puntosDia = () => META.dias > 0 ? META.puntos / META.dias : 0;

async function loadMeta(){
  try{
    const meta = await api("?fields=sheets.properties.title");
    const hay = (meta.sheets || []).some(s => s.properties.title === META_TAB);
    if(!hay){
      await api(":batchUpdate", {method:"POST", body: JSON.stringify({
        requests:[{addSheet:{properties:{title:META_TAB, gridProperties:{frozenRowCount:1}}}}]})});
      await api(`/values/${encodeURIComponent(`'${META_TAB}'!A1`)}?valueInputOption=USER_ENTERED`,
        {method:"PUT", body: JSON.stringify({values:[
          META_HEAD,
          ["PUNTOS OBJETIVO", META_DEF.puntos, "Cuántos puntos se quieren sacar en el plazo"],
          ["DIAS HABILES",    META_DEF.dias,   "En cuántos días hábiles (sin sábados ni domingos)"]
        ]})});
      META = {...META_DEF};
      return META;
    }
    const j = await api(`/values/${encodeURIComponent(`'${META_TAB}'!A2:B10`)}?valueRenderOption=UNFORMATTED_VALUE`);
    // Se busca por nombre y no por posicion: si alguien reordena las filas de
    // la hoja, la meta debe seguir leyendose bien.
    const val = nombre => {
      const f = (j.values || []).find(r => String(r[0] ?? "").trim().toUpperCase() === nombre);
      return f ? num(f[1]) : null;
    };
    const p = val("PUNTOS OBJETIVO"), d = val("DIAS HABILES");
    META = {
      puntos: (p !== null && p > 0) ? p : META_DEF.puntos,
      dias:   (d !== null && d > 0) ? Math.round(d) : META_DEF.dias
    };
  }catch(e){
    console.warn("META:", e.message);
    META = {...META_DEF};       // sin meta legible se sigue trabajando con la de fábrica
  }
  return META;
}

/** Guarda la meta en la hoja. Devuelve true si se escribió. */
async function guardarMeta(puntos, dias){
  const p = Number(puntos), d = Math.round(Number(dias));
  if(!(p > 0) || !(d > 0)){ toast("La meta necesita puntos y días mayores que cero","err"); return false; }
  const antes = {...META};
  META = {puntos:p, dias:d};
  try{
    await api(`/values/${encodeURIComponent(`'${META_TAB}'!A2:B3`)}?valueInputOption=USER_ENTERED`,
      {method:"PUT", body: JSON.stringify({values:[
        ["PUNTOS OBJETIVO", p],
        ["DIAS HABILES",    d]
      ]})});
    logBulk([{accion:"EDITA", op:"—", fila:0, campo:"Meta de producción",
              antes:`${antes.puntos} pts / ${antes.dias} días`,
              despues:`${p} pts / ${d} días`}]);
    setSync("", "Guardado");
    return true;
  }catch(e){
    META = antes;
    toast(e.message, "err");
    return false;
  }
}
