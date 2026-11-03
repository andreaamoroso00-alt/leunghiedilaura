# Collegare il calendario del sito a Google Fogli

Una volta fatto, Laura gestisce gli orari da un foglio Google (anche dal telefono) e:

- il sito mostra solo gli orari liberi;
- quando una cliente prenota, l'orario diventa "prenotato" e sparisce dal sito per tutti;
- la richiesta finisce nel foglio "Prenotazioni";
- partono due email dal Gmail dell'account che pubblica lo script: una a Laura, una di riepilogo alla cliente.

Conviene fare tutto **dall'account Google di Laura**, così le email partono da lei.

## 1. Crea il foglio
1. Vai su sheets.google.com e crea un foglio vuoto. Chiamalo per esempio "Le unghie di Laura – agenda".
2. Menu **Estensioni → Apps Script**.

## 2. Incolla lo script
1. Nell'editor che si apre, cancella tutto quello che c'è nel file `Codice.gs`.
2. Incolla tutto il contenuto del file `Codice.gs` di questa cartella e premi **Salva** (icona del dischetto).
3. In alto, nel menu a tendina delle funzioni, scegli **setup** e premi **Esegui**.
4. Google chiede l'autorizzazione: **Rivedi autorizzazioni → scegli l'account → Avanzate → Vai al progetto (non sicuro) → Consenti**.
   È normale: lo script è tuo e Google lo segnala solo perché non è stato verificato da loro.
5. Torna al foglio: ora ci sono le schede **Disponibilità** e **Prenotazioni**.

## 3. Pubblica lo script
1. Nell'editor Apps Script: **Esegui il deployment → Nuovo deployment**.
2. Icona dell'ingranaggio → tipo **App web**.
3. **Esegui come: Me**. **Chi ha accesso: Chiunque**.
4. **Esegui il deployment** e copia l'**URL dell'app web** (finisce con `/exec`).
5. Manda quell'URL a Claude: lo inserisce nel sito e lo ripubblica.

## Come lo usa Laura ogni giorno
Nella scheda **Disponibilità** una riga per ogni orario libero:

| Giorno | Ora | Stato |
|---|---|---|
| 12/11/2026 | 9:30 | libero |
| 12/11/2026 | 15:00 | libero |

- Quando una cliente prenota, lo **Stato** diventa `prenotato` da solo.
- Se Laura non può confermare un appuntamento, rimette `libero` e l'orario torna sul sito.
- Gli orari passati spariscono da soli dal sito; le righe vecchie si possono cancellare quando si vuole.
- Il sito si aggiorna entro un paio di minuti.

## Note
- Il foglio resta privato: il sito riceve solo giorni e orari liberi.
- Se in futuro si modifica lo script, bisogna fare **Esegui il deployment → Gestisci deployment → Modifica → Nuova versione**, così l'URL resta lo stesso.
- Gmail gratuito permette circa 100 email al giorno inviate da script: per un'attività come questa è più che sufficiente.
