/**
 * Le unghie di Laura – collegamento tra il sito e Google Fogli.
 *
 * Cosa fa:
 *  - legge dal foglio "Disponibilità" gli orari liberi e li passa al calendario del sito;
 *  - quando una cliente prenota, segna l'orario come "prenotato" (così sparisce dal sito),
 *    salva la richiesta nel foglio "Prenotazioni" e manda due email dal Gmail di chi
 *    ha pubblicato lo script: una a Laura e una di riepilogo alla cliente.
 *
 * Il foglio resta privato: il sito riceve solo giorni e orari liberi, mai i dati delle clienti.
 * Istruzioni passo passo: vedi ISTRUZIONI.md nella stessa cartella.
 */

const FOGLIO_ORARI = 'Disponibilità';
const FOGLIO_PRENOTAZIONI = 'Prenotazioni';
const NOME_ATTIVITA = 'Le unghie di Laura';

/** Da eseguire una volta sola: prepara i due fogli con le intestazioni giuste. */
function setup() {
  const ss = SpreadsheetApp.getActive();

  const orari = ss.getSheetByName(FOGLIO_ORARI) || ss.insertSheet(FOGLIO_ORARI);
  if (orari.getLastRow() === 0) {
    orari.appendRow(['Giorno', 'Ora', 'Stato']);
    orari.getRange('A1:C1').setFontWeight('bold');
    orari.setFrozenRows(1);
    orari.getRange('A2:A').setNumberFormat('dd/mm/yyyy');
    orari.getRange('B2:B').setNumberFormat('@');   // l'ora resta testo: 9:30, 15:00
    const stati = SpreadsheetApp.newDataValidation()
      .requireValueInList(['libero', 'prenotato'], true).build();
    orari.getRange('C2:C').setDataValidation(stati);
    orari.setColumnWidths(1, 3, 130);
  }

  const pren = ss.getSheetByName(FOGLIO_PRENOTAZIONI) || ss.insertSheet(FOGLIO_PRENOTAZIONI);
  if (pren.getLastRow() === 0) {
    pren.appendRow(['Ricevuta il', 'Giorno e ora', 'Nome', 'Servizio', 'Telefono', 'Email', 'Orario dal calendario']);
    pren.getRange('A1:G1').setFontWeight('bold');
    pren.setFrozenRows(1);
  }

  const vuoto = ss.getSheetByName('Foglio1') || ss.getSheetByName('Sheet1');
  if (vuoto && vuoto.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(vuoto);
}

/** Il sito chiede gli orari liberi. */
function doGet() {
  const ss = SpreadsheetApp.getActive();
  const tz = ss.getSpreadsheetTimeZone();
  const sh = ss.getSheetByName(FOGLIO_ORARI);
  if (!sh) return json({ ok: false, reason: 'foglio_mancante' });

  const now = new Date();
  const righe = sh.getDataRange().getValues().slice(1);
  const slots = [];
  righe.forEach(function (r) {
    const quando = leggiData(r[0], r[1], tz);
    if (!quando || quando < now) return;
    if (String(r[2]).trim().toLowerCase() === 'prenotato') return;
    slots.push(slotDa(quando, tz));
  });
  slots.sort(function (a, b) { return a.id < b.id ? -1 : 1; });
  return json({ ok: true, slots: slots });
}

/** Il sito invia una richiesta di prenotazione. */
function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, reason: 'formato' }); }
  if (d.sito) return json({ ok: true });                    // campo trappola per i bot
  if (d.action !== 'book') return json({ ok: false, reason: 'azione' });

  const nome = pulisci(d.nome, 80), servizio = pulisci(d.servizio, 80);
  const telefono = pulisci(d.telefono, 30), email = pulisci(d.email, 120);
  const quandoTesto = pulisci(d.quando, 120), slotId = pulisci(d.slotId, 20);
  if (!nome || !servizio || !/^[+\d][\d\s./-]{5,}$/.test(telefono) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, reason: 'dati' });
  }
  if (slotId && !/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}$/.test(slotId)) return json({ ok: false, reason: 'orario' });

  const ss = SpreadsheetApp.getActive();
  const tz = ss.getSpreadsheetTimeZone();
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let etichetta = quandoTesto;
  try {
    if (slotId) {
      const sh = ss.getSheetByName(FOGLIO_ORARI);
      const righe = sh.getDataRange().getValues();
      let trovata = -1;
      for (let i = 1; i < righe.length; i++) {
        const q = leggiData(righe[i][0], righe[i][1], tz);
        if (q && slotDa(q, tz).id === slotId) { trovata = i; etichetta = Utilities.formatDate(q, tz, "EEEE d MMMM 'alle' HH:mm"); break; }
      }
      if (trovata < 0) return json({ ok: false, reason: 'occupato' });
      if (String(righe[trovata][2]).trim().toLowerCase() === 'prenotato') return json({ ok: false, reason: 'occupato' });
      sh.getRange(trovata + 1, 3).setValue('prenotato');
    }
    ss.getSheetByName(FOGLIO_PRENOTAZIONI)
      .appendRow([new Date(), quandoTesto || etichetta, nome, servizio, "'" + telefono, email, slotId ? 'sì' : 'no']);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  const laura = Session.getEffectiveUser().getEmail();
  const quando = quandoTesto || etichetta;
  try {
    MailApp.sendEmail({
      to: laura,
      subject: 'Nuova richiesta: ' + servizio + ' – ' + quando,
      replyTo: email,
      body: 'Nuova richiesta dal sito\n\nNome: ' + nome + '\nServizio: ' + servizio + '\nQuando: ' + quando +
            '\nTelefono: ' + telefono + '\nEmail: ' + email +
            (slotId ? '\n\nL\'orario è già stato segnato come prenotato nel foglio.' : '\n\nLa cliente non ha scelto un orario dal calendario: proponile tu l\'orario.')
    });
    MailApp.sendEmail({
      to: email,
      name: NOME_ATTIVITA,
      replyTo: laura,
      subject: NOME_ATTIVITA + ' – ho ricevuto la tua richiesta',
      body: 'Ciao ' + nome + ',\n\ngrazie! Ho ricevuto la tua richiesta:\n\nServizio: ' + servizio + '\nQuando: ' + quando +
            '\n\n' + (slotId ? 'L\'orario è riservato per te: ti scrivo a breve per confermare.' : 'Ti scrivo a breve per proporti l\'orario.') +
            '\nPer cambiare qualcosa rispondi pure a questa email.\n\nA presto,\nLaura'
    });
  } catch (err) {
    // la prenotazione è comunque salvata nel foglio
  }
  return json({ ok: true });
}

/* ---------- funzioni di servizio ---------- */

function leggiData(giorno, ora, tz) {
  if (!giorno || ora === '' || ora === null) return null;
  let d;
  if (giorno instanceof Date) d = new Date(giorno.getTime());
  else {
    const m = String(giorno).trim().match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
    if (!m) return null;
    const anno = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    d = new Date(anno, Number(m[2]) - 1, Number(m[1]));
  }
  let h, mi;
  if (ora instanceof Date) { h = Number(Utilities.formatDate(ora, tz, 'H')); mi = Number(Utilities.formatDate(ora, tz, 'm')); }
  else {
    const t = String(ora).trim().replace('.', ':').match(/^(\d{1,2})(?::(\d{2}))?$/);
    if (!t) return null;
    h = Number(t[1]); mi = Number(t[2] || 0);
  }
  if (h > 23 || mi > 59) return null;
  const giornoTesto = Utilities.formatDate(d, tz, 'yyyy-MM-dd');
  return Utilities.parseDate(giornoTesto + ' ' + h + ':' + mi, tz, 'yyyy-MM-dd H:m');
}

function slotDa(quando, tz) {
  const date = Utilities.formatDate(quando, tz, 'yyyy-MM-dd');
  const time = Utilities.formatDate(quando, tz, 'HH:mm');
  return { id: date + '_' + time.replace(':', '-'), date: date, time: time };
}

function pulisci(v, max) {
  return String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
