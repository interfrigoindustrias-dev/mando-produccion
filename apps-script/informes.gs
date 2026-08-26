/**
 * Envío automático de informes — Control de Producción Interfrigo
 *
 * Vive DENTRO de la hoja de cálculo (Extensiones → Apps Script), no en el
 * servidor de Hostinger. Esa decisión evita tres cosas que habría que montar y
 * mantener: una cuenta de servicio, una tarea programada en hPanel y una clave
 * privada guardada en algún sitio. Aquí Google ya sabe quién eres y ya tiene
 * acceso a la hoja.
 *
 * QUÉ HACE
 *   Una vez al día mira la pestaña INFORMES, calcula a cuáles les toca salir
 *   hoy, arma el CSV y lo manda por correo. Después escribe la fecha en
 *   ULTIMO ENVIO, que es lo que impide que un informe salga dos veces.
 *
 * POR QUÉ UN DISPARADOR DIARIO Y NO UNO MENSUAL
 *   Un disparador mensual de Apps Script no garantiza el día exacto y no deja
 *   margen si falla. Uno diario que pregunta «¿te toca hoy?» es más simple de
 *   entender, se recupera solo si un día no se ejecuta, y permite tener
 *   informes semanales y mensuales con el mismo mecanismo.
 *
 * INSTALACIÓN (una sola vez)
 *   1. Abre la hoja → Extensiones → Apps Script.
 *   2. Pega este archivo entero y guarda.
 *   3. Ejecuta la función `instalar`. Google pedirá permiso una vez: acéptalo.
 *   4. Listo. Para comprobarlo sin esperar, ejecuta `enviarPrueba`.
 *
 * BOTÓN DE PRUEBA DESDE LA APLICACIÓN (opcional pero recomendado)
 *   Para que el botón «Probar correo» funcione, publica esto como aplicación web:
 *     Implementar → Nueva implementación → Aplicación web
 *     Ejecutar como: Yo     ·     Con acceso: Cualquier usuario
 *   Copia el enlace que da Google y pégalo en la aplicación, en Informes.
 *
 *   El navegador dispara la petición pero no puede leer la respuesta (Google no
 *   permite leerla desde otro dominio). No es un problema: la prueba se
 *   comprueba mirando el buzón, que es de lo que se trata.
 *
 * La pestaña INFORMES es el contrato con la aplicación web. Si allí cambian
 * las columnas, hay que cambiarlas aquí.
 */

var HOJA_OP   = 'OP PUERTA';
var HOJA_INF  = 'INFORMES';   // columnas A..H, ver informes.js
var REMITENTE = 'Control de Producción Interfrigo';

/* Columnas de OP PUERTA, en base 0. Debe coincidir con constantes.js. */
var C = {
  FECHA:0, OP:1, CLI:2, MAT:5, TIPO:6, ANCHO:7, ALTO:8, PTS:9, ESP:10, AP:11,
  PRIO:12, OBS:21, FPROC:23, DESP:24, FDESP:25, ENS:26, FINI:27, CAL:36
};
var PROCS = [13,14,15,16,17,18,19,20];   // N..U

/* ------------------------------------------------------------------ */
/*  Aplicación web: permite disparar desde la aplicación               */
/* ------------------------------------------------------------------ */

/**
 * ?a=prueba&para=alguien@dominio      correo de prueba
 * ?a=enviar&fila=3                    manda ese informe ahora mismo
 *
 * Se responde siempre en texto plano: si algo falla, el mensaje queda en el
 * registro de ejecuciones de Apps Script, que es donde se puede leer.
 */
function doGet(e) {
  var p = (e && e.parameter) || {};
  var salida = ContentService.createTextOutput();
  try {
    if (p.a === 'prueba') {
      var para = String(p.para || Session.getEffectiveUser().getEmail() || '').trim();
      if (!para) { return salida.setContent('sin destinatario'); }
      MailApp.sendEmail({
        to: para,
        subject: 'Prueba de correo · Control de Producción Interfrigo',
        body: 'Si estás leyendo esto, el envío automático de informes funciona.\n\n' +
              'Enviado el ' + Utilities.formatDate(new Date(), tz(), 'dd/MM/yyyy HH:mm') + '.\n' +
              'Cuota restante hoy: ' + MailApp.getRemainingDailyQuota() + ' correos.\n\n' +
              '— No hace falta responder a este mensaje.',
        name: REMITENTE
      });
      return salida.setContent('enviado a ' + para);
    }
    if (p.a === 'enviar') {
      var n = revisarInformes(true, Number(p.fila) || 0);
      return salida.setContent('informes enviados: ' + n);
    }
    return salida.setContent('cuota restante: ' + MailApp.getRemainingDailyQuota());
  } catch (err) {
    Logger.log('doGet: ' + err.message);
    return salida.setContent('error: ' + err.message);
  }
}

/* ------------------------------------------------------------------ */
/*  Instalación                                                        */
/* ------------------------------------------------------------------ */

function instalar() {
  // Se borran los disparadores anteriores de esta función: si no, reinstalar
  // duplicaría los envíos.
  var t = ScriptApp.getProjectTriggers();
  for (var i = 0; i < t.length; i++) {
    if (t[i].getHandlerFunction() === 'revisarInformes') ScriptApp.deleteTrigger(t[i]);
  }
  ScriptApp.newTrigger('revisarInformes').timeBased().atHour(7).everyDays(1).create();
  SpreadsheetApp.getUi().alert(
    'Listo.\n\nLos informes se revisarán cada día sobre las 7 de la mañana.\n' +
    'Para probarlo ahora mismo, ejecuta la función enviarPrueba.');
}

/** Manda todos los informes activos ignorando el calendario. Para comprobar. */
function enviarPrueba() {
  var n = revisarInformes(true);
  SpreadsheetApp.getUi().alert(n
    ? 'Se enviaron ' + n + ' informe(s) de prueba.'
    : 'No hay informes activos con destinatarios y con filas en el periodo.');
}

/* ------------------------------------------------------------------ */
/*  Motor                                                              */
/* ------------------------------------------------------------------ */

/**
 * @param {boolean} forzar  ignora el calendario y el registro de último envío.
 * @return {number} informes enviados.
 */
function revisarInformes(forzar, soloFila) {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var hi  = ss.getSheetByName(HOJA_INF);
  if (!hi) { Logger.log('No existe la pestaña ' + HOJA_INF); return 0; }

  var datos = hi.getDataRange().getValues();
  var hoy   = new Date();
  var enviados = 0;

  for (var f = 1; f < datos.length; f++) {
    var r = datos[f];
    var inf = {
      fila:   f + 1,
      nombre: String(r[0] || '').trim(),
      tipo:   String(r[1] || 'produccion').trim().toLowerCase(),
      frec:   String(r[2] || 'mensual').trim().toLowerCase(),
      dia:    Number(r[3]) || 1,
      para:   String(r[4] || '').trim(),
      activo: r[5] !== false && String(r[5]).toUpperCase() !== 'FALSE',
      ultimo: String(r[6] || '').trim(),
      // Columna H: que columnas incluir, separadas por coma. Vacio = todas.
      campos: String(r[7] || '').trim()
    };
    if (soloFila && inf.fila !== soloFila) continue;
    if (!inf.nombre || !inf.activo || !inf.para) continue;
    if (!forzar && !leToca(inf, hoy)) continue;
    if (!forzar && yaSalio(inf, hoy)) continue;

    try {
      if (enviarInforme(ss, inf, hoy)) {
        hi.getRange(inf.fila, 7).setValue(Utilities.formatDate(hoy, tz(), 'dd/MM/yyyy HH:mm'));
        enviados++;
      }
    } catch (e) {
      Logger.log('Fallo en «' + inf.nombre + '»: ' + e.message);
    }
  }
  return enviados;
}

/** ¿Le toca salir hoy? */
function leToca(inf, hoy) {
  if (inf.frec === 'semanal') {
    var d = hoy.getDay();               // 0 domingo … 6 sábado
    var lunes1 = (d === 0) ? 7 : d;     // 1 lunes … 7 domingo
    return lunes1 === inf.dia;
  }
  return hoy.getDate() === Math.min(28, Math.max(1, inf.dia));
}

/** ¿Ya se mandó en este mismo periodo? Evita duplicados si se ejecuta dos veces. */
function yaSalio(inf, hoy) {
  if (!inf.ultimo) return false;
  var p = inf.ultimo.split(/[\/\s:]/);
  if (p.length < 3) return false;
  var u = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
  var dias = Math.floor((hoy - u) / 864e5);
  return inf.frec === 'semanal' ? dias < 7 : dias < 25;
}

function enviarInforme(ss, inf, hoy) {
  var per  = periodo(inf.frec, hoy);
  var arm  = armar(ss, inf.tipo, per);
  if (inf.campos) { arm = recortar(arm, inf.campos); }
  if (!arm.filas.length) {
    Logger.log('«' + inf.nombre + '»: sin filas en ' + per.etiqueta + ', no se envía.');
    return false;
  }

  var nombreArchivo = inf.tipo + '_' + per.etiqueta.replace(/\s+/g, '_') + '.csv';
  var adjunto = Utilities.newBlob('﻿' + arm.csv, 'text/csv', nombreArchivo);

  var asunto = inf.nombre + ' · ' + per.etiqueta;
  var cuerpo =
    'Informe automático de producción.\n\n' +
    'Periodo: ' + per.etiqueta + '\n' +
    'Filas: ' + arm.filas.length + '\n' +
    (arm.puntos !== null ? 'Puntos totales: ' + redondear(arm.puntos) + '\n' : '') +
    '\nEl detalle va en el archivo adjunto.\n\n' +
    '— Enviado solo por el Control de Producción de Interfrigo.\n' +
    'Para cambiar destinatarios o frecuencia, entra a la aplicación y abre Informes.';

  MailApp.sendEmail({
    to: inf.para,
    subject: asunto,
    body: cuerpo,
    name: REMITENTE,
    attachments: [adjunto]
  });
  return true;
}

/* ------------------------------------------------------------------ */
/*  Informes                                                           */
/* ------------------------------------------------------------------ */

function armar(ss, tipo, per) {
  var hoja = ss.getSheetByName(HOJA_OP);
  var datos = hoja.getDataRange().getValues();
  var cols, filas = [], puntos = 0, hayPuntos = false;

  for (var f = 1; f < datos.length; f++) {
    var c = datos[f];
    if (!String(c[C.OP] || '').trim()) continue;              // fila vacía
    if (String(c[C.DESP] || '').trim() === 'Anulada') continue;

    if (tipo === 'despachos') {
      if (String(c[C.DESP] || '').trim() !== 'Despachado') continue;
      if (!enRango(c[C.FDESP], per)) continue;
      filas.push([fecha(c[C.FDESP]), c[C.OP], c[C.CLI], c[C.TIPO],
                  c[C.ANCHO], c[C.ALTO], c[C.AP], c[C.PTS], c[C.ENS]]);

    } else if (tipo === 'calidad') {
      if (!String(c[C.CAL] || '').trim()) continue;
      if (!enRango(c[C.FPROC], per)) continue;
      filas.push([fecha(c[C.FPROC]), c[C.OP], c[C.CLI], c[C.TIPO],
                  c[C.DESP], c[C.CAL]]);

    } else if (tipo === 'pendientes') {
      if (completa(c)) continue;
      var e = String(c[C.DESP] || '').trim();
      if (e === 'Despachado' || e === 'En Almacén' || e === 'Terminado') continue;
      filas.push([c[C.OP], c[C.CLI], c[C.TIPO], c[C.PRIO], c[C.PTS],
                  Math.round(avance(c) * 100) + '%', fecha(c[C.FECHA])]);

    } else {                                                   // producción
      if (!completa(c)) continue;
      if (!enRango(c[C.FPROC], per)) continue;
      filas.push([c[C.OP], c[C.TIPO], medidas(c), c[C.CLI], c[C.ESP], c[C.PTS],
                  fecha(c[C.FINI]), fecha(c[C.FPROC])]);
      hayPuntos = true;
      puntos += Number(c[C.PTS]) || 0;
    }
  }

  cols = tipo === 'despachos'
      ? ['Fecha despacho','OP','Cliente','Tipo','Ancho','Alto','Apertura','Puntos','Ensamble']
    : tipo === 'calidad'
      ? ['Fecha','OP','Cliente','Tipo','Estado','Nota de calidad']
    : tipo === 'pendientes'
      ? ['OP','Cliente','Tipo','Prioridad','Puntos','Avance','Creada']
      : ['Orden','Tipo de puerta','Medidas','Cliente','Espesor','Puntos',
         'Fecha inicio','Fecha fin'];

  return {csv: aCsv(cols, filas), filas: filas, cols: cols,
          puntos: hayPuntos ? puntos : null};
}

/** Deja solo las columnas pedidas, en el orden en que se pidieron.
 *  Un nombre que no exista se ignora en silencio: es preferible un informe con
 *  una columna de menos que ningun informe. */
function recortar(arm, campos) {
  var quiere = campos.split(',').map(function (x) { return x.trim().toLowerCase(); })
                     .filter(function (x) { return x; });
  var idx = [];
  for (var i = 0; i < quiere.length; i++) {
    for (var j = 0; j < arm.cols.length; j++) {
      if (String(arm.cols[j]).toLowerCase() === quiere[i]) { idx.push(j); break; }
    }
  }
  if (!idx.length) { return arm; }          // ninguna coincide: se manda entero
  var cols = idx.map(function (j) { return arm.cols[j]; });
  var filas = arm.filas.map(function (f) {
    return idx.map(function (j) { return f[j]; });
  });
  return {csv: aCsv(cols, filas), filas: filas, puntos: arm.puntos, cols: cols};
}

/* ------------------------------------------------------------------ */
/*  Ayudas                                                             */
/* ------------------------------------------------------------------ */

/** Una puerta está completa si TODOS los procesos que aplican están marcados.
 *  Celda vacía = ese proceso no aplica a esta puerta y no cuenta. */
function completa(c) {
  var aplican = 0, hechos = 0;
  for (var i = 0; i < PROCS.length; i++) {
    var v = c[PROCS[i]];
    if (v === '' || v === null || v === undefined) continue;
    aplican++;
    if (v === true || String(v).toUpperCase() === 'TRUE') hechos++;
  }
  return aplican > 0 && hechos === aplican;
}

function avance(c) {
  var aplican = 0, hechos = 0;
  for (var i = 0; i < PROCS.length; i++) {
    var v = c[PROCS[i]];
    if (v === '' || v === null || v === undefined) continue;
    aplican++;
    if (v === true || String(v).toUpperCase() === 'TRUE') hechos++;
  }
  return aplican ? hechos / aplican : 0;
}

function medidas(c) {
  var a = Number(c[C.ANCHO]), b = Number(c[C.ALTO]);
  return (a && b) ? a + '×' + b : '';
}

function periodo(frec, hoy) {
  if (frec === 'semanal') {
    var d = new Date(hoy); d.setDate(d.getDate() - 7);
    var h = new Date(hoy); h.setDate(h.getDate() - 1);
    return {desde: d, hasta: h, etiqueta: f(d) + ' a ' + f(h)};
  }
  // Mensual: el mes anterior COMPLETO, para que el informe cuadre con el mes.
  var desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  var hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
  var M = ['enero','febrero','marzo','abril','mayo','junio','julio',
           'agosto','septiembre','octubre','noviembre','diciembre'];
  return {desde: desde, hasta: hasta,
          etiqueta: M[desde.getMonth()] + ' ' + desde.getFullYear()};
}

function enRango(v, per) {
  var d = aFecha(v);
  if (!d) return false;
  d.setHours(0,0,0,0);
  var a = new Date(per.desde); a.setHours(0,0,0,0);
  var b = new Date(per.hasta); b.setHours(23,59,59,999);
  return d >= a && d <= b;
}

/** Acepta lo que la hoja tenga: fecha real o texto dd/mm/aaaa. */
function aFecha(v) {
  if (v instanceof Date) return new Date(v);
  var s = String(v || '').trim();
  if (!s) return null;
  var p = s.split(/[\/\-]/);
  if (p.length === 3) {
    var dd = Number(p[0]), mm = Number(p[1]), yy = Number(p[2]);
    if (yy > 1900 && mm >= 1 && mm <= 12) return new Date(yy, mm - 1, dd);
  }
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function fecha(v) { var d = aFecha(v); return d ? f(d) : ''; }
function f(d)     { return Utilities.formatDate(d, tz(), 'dd/MM/yyyy'); }
function tz()     { return SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(); }
function redondear(n) { return Math.round(n * 10) / 10; }

/** CSV con punto y coma, que es lo que Excel en español espera. */
function aCsv(cols, filas) {
  var q = function (v) { return '"' + String(v === null || v === undefined ? '' : v)
                                        .replace(/"/g, '""') + '"'; };
  var out = [cols.map(q).join(';')];
  for (var i = 0; i < filas.length; i++) out.push(filas[i].map(q).join(';'));
  return out.join('\r\n');
}
