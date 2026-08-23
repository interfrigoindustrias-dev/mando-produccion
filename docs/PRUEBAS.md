# Comprobación antes de publicar

No hay pruebas automatizadas: la app depende del DOM y de la API de Google. Lo
que sí hay es una **comprobación de humo** que se pega en la consola del
navegador y verifica 70+ puntos en unos segundos.

Nació después de que una refactorización borrara un módulo entero sin que la
comprobación de sintaxis lo detectara: el archivo compilaba, simplemente le
faltaba código.

## Cómo correrla

1. Levantar la app en local: `python -m http.server 8080 --directory src`
2. Entrar y esperar a que cargue.
3. Abrir la consola (F12) y pegar el bloque de abajo.
4. Debe responder `"fallos": []`.

## El bloque

```js
(async()=>{
 const fallos=[];
 // 1 · Todas las funciones principales deben existir
 const nombres=["progreso","statusValue","tri","toDate","fmtDate","autoFechas",
  "fechaProgramada","congelarSiCompleta","repairStatus","repairNumeros","ensureRows",
  "setCheckboxUI","guardarDespacho","loadModelos","renderModelos","esModelo",
  "renderPlanta","plantaList","renderResumen","renderAlmacen","renderStock",
  "almacenList","stockList","stickerHTML","cartaHTML","printFichas","openDet",
  "renderHist","logChanges","logBulk","loadLog","setProc","paintRow","render","kpis",
  "filtered","fillLists","selPrio","selAp","selDesp","targetRows","nextOp","contador",
  "aplicaTema","numCell","anulada","stockBase","kpiCards","barras","tablaMini",
  "activas","completa","desp","enProduccion","almacenBase","goto"];
 nombres.forEach(n=>{ try{ if(typeof eval(n)!=="function") fallos.push("no es funcion: "+n); }
                      catch(e){ fallos.push("falta: "+n); } });

 // 2 · Cada vista debe pintar contenido
 for(const [v,sel] of [["control","#tb tr"],["planta",".pcard"],["resumen","#r-prod .kpi"],
   ["almacen","#a-tabla tbody tr"],["stock","#m-tabla tbody tr"]]){
   document.querySelector(`.tab[data-view="${v}"]`).click();
   await new Promise(r=>setTimeout(r,350));
   if(!document.querySelectorAll(sel).length) fallos.push(`vista ${v} vacia`);
 }

 // 3 · Los bloques de indicadores deben estar completos
 [["#kpis .kpi",10],["#r-inv .kpi",6],["#r-ritmo .kpi",8],["#r-14d .brk-r",14],
  ["#s-kpis .kpi",5],["#a-kpis .kpi",5],["#m-tabla tbody tr",17]].forEach(([sel,min])=>{
   const n=document.querySelectorAll(sel).length;
   if(n<min) fallos.push(`${sel}: ${n} < ${min}`);
 });

 // 4 · Las impresiones deben caber en su hoja
 const p=document.getElementById('print'); p.style.display='block';
 const mm=x=>+(x/(96/25.4)).toFixed(2);
 p.innerHTML=stickerHTML(ROWS.find(x=>rowActive(x.c)));
 const s=document.querySelector('.stk');
 if(s.scrollHeight>s.clientHeight+1) fallos.push("etiqueta desborda 100mm");
 p.innerHTML=cartaHTML(ROWS.find(x=>rowActive(x.c)));
 if(mm(document.querySelector('.carta').getBoundingClientRect().height)>279)
   fallos.push("hoja carta pasa de una pagina");
 p.style.display=''; p.innerHTML='';

 // 5 · Estilos y recursos
 if(!getComputedStyle(document.querySelector('.logo')).webkitMaskImage.includes('logo'))
   fallos.push("el logo no carga");
 if(getComputedStyle(document.documentElement).getPropertyValue('--brand').trim()!=='#0A4283')
   fallos.push("los tokens CSS no cargaron");

 document.querySelector('.tab[data-view="control"]').click();
 return {revisiones:nombres.length+5+7+4, fallos};
})()
```

## Qué NO cubre

- Escrituras reales a Google Sheets (probarlas a mano en una copia de la hoja).
- El resultado impreso en papel: mide el HTML, no lo que sale de la impresora.
- Las automatizaciones de calendario, que dependen del día.

## Prueba manual mínima tras un cambio grande

1. Marcar los 8 procesos de una puerta → debe llegar a 100 % sin saltos, y la
   fecha de proceso debe congelarse en hoy.
2. Cambiar una prioridad → la fecha de proceso debe recalcularse al instante.
3. Crear una ficha con cantidad 2 → dos filas con sufijos `-1` y `-2`, y las
   casillas de los procesos que no aplican deben desaparecer en la hoja.
4. Marcar Despachado → debe rellenarse la fecha de despacho.
5. Abrir la ficha y comprobar que el historial registró todo lo anterior.
