# Regole di business — incassi, rate e fatturato cliente

Documento di riferimento condiviso tra **preventivoai-desktop**, **preventivoai-mobile** e **preventivoai-shared**.
Descrive come l’app tratta pagamenti singoli, piani rate/canone e il calcolo del fatturato per cliente, senza duplicare importi.

---

## 1. Due modi di incassare un lavoro

| Modalità | Dove si registra | Quando si usa |
|----------|------------------|---------------|
| **Preventivo singolo** | Flag `preventivi.pagato` + `data_pagamento` | Preventivo accettato pagato in un’unica soluzione, **senza** piano collegato |
| **Piano rate / canone** | Righe in `rate_abbonamento` (campo `acconto`, `stato`) | Preventivo con abbonamento attivo collegato (`abbonamenti.preventivo_id`) |

Un preventivo **non** deve contribuire al fatturato in entrambe le modalità: se ha un piano attivo collegato, l’incasso passa solo dalle rate.

---

## 2. Stati di una rata (`rate_abbonamento.stato`)

| Stato | Significato | Quanto conta nel fatturato |
|-------|-------------|----------------------------|
| `da_incassare` | Scadenza futura o corrente, nessun pagamento registrato | **€0** |
| `parziale` | Pagamento parziale: `acconto > 0` ma `acconto < importo` | **`acconto`** (solo quanto già incassato) |
| `incassato` | Rata saldata per intero (`acconto >= importo`) | **`importo`** (importo pieno della rata) |
| `in_ritardo` | Scadenza passata senza incasso (o con acconto insufficiente) | **€0** se `acconto = 0`, altrimenti come `parziale` (`acconto`) |

### Differenza tra `parziale` e `incassato`

- **`incassato`**: la rata è chiusa. L’importo contabilizzato è sempre `importo` (non `acconto`), perché a saldo zero `acconto === importo`.
- **`parziale`**: il cliente ha pagato solo una parte. Conta solo `acconto`; il residuo (`importo - acconto`) **non** entra nel fatturato finché non si registra altro pagamento o la rata non passa a `incassato`.

Transizione tipica alla registrazione di un pagamento (`registraPagamento`):

```
nuovoAcconto = min(acconto + importoPagato, importo)
nuovoSaldo     = importo - nuovoAcconto
stato          = nuovoSaldo <= 0 ? "incassato" : "parziale"
```

Quando lo stato diventa `incassato`, viene impostata anche `data_incasso` (ISO, o data scelta dall’utente).

Se si **modifica l’importo** di una rata già parzialmente pagata, lo stato viene ricalcolato con `nuovoStatoDopoImportoRata`:

- `acconto >= nuovoImporto` → `incassato`
- `acconto > 0` → `parziale`
- altrimenti → `da_incassare` o `in_ritardo` (se era già in ritardo)

---

## 3. Anti doppio conteggio: preventivo singolo vs piano collegato

### Regola

> Se esiste un **abbonamento attivo** con `preventivo_id` puntato al preventivo, quel preventivo **escluso** dal calcolo “preventivi singoli pagati”.

Implementazione (`incassi.ts`):

1. Si caricano gli abbonamenti attivi dell’utente con `preventivo_id` valorizzato → insieme `preventiviConPiano`.
2. Si caricano i preventivi con `stato = accettato`, `pagato = true`, `is_ultimo = true`.
3. Per il fatturato si sommano solo i preventivi il cui `id` **non** è in `preventiviConPiano`.
4. Separatamente si sommano le rate degli abbonamenti attivi (del cliente o globali).

Il flag `preventivi.pagato` su un preventivo con piano collegato **non** deve essere usato per il fatturato: l’incasso reale è tracciato rata per rata. In UI conviene segnare pagato tramite il piano, non duplicando sul preventivo.

### Piano attivo

Conta solo se `abbonamenti.attivo = true` e (se presente) `deleted_at IS NULL` (cestino).

---

## 4. Calcolo del fatturato / incasso cliente

Funzione di riferimento: `calcolaIncassoCliente(userId, clienteId)` in `preventivoai-desktop/src/lib/incassi.ts`.

```
incassoCliente = partePreventivi + parteRate
```

### Parte preventivi (`partePreventivi`)

Somma di `importo_totale` per preventivi che soddisfano **tutte** le condizioni:

- `cliente_id` = cliente richiesto
- `stato = accettato`
- `pagato = true`
- `is_ultimo = true` (solo ultima versione)
- `id` **non** presente in `preventiviConPiano`
- non nel cestino (`deleted_at` null, con fallback se colonna assente)

### Parte rate (`parteRate`)

Per ogni rata di abbonamenti **attivi** del cliente (`sommaImportoRate`):

```typescript
if (stato === "incassato") totale += importo
if (stato === "parziale")   totale += acconto
// da_incassare, in_ritardo senza acconto → 0
```

### Incasso totale utente

`calcolaIncassatoTotale(userId)` applica la stessa logica senza filtrare per cliente (utile per dashboard/home).

### Cache

Il risultato per cliente può essere messo in cache (`getFatturatoClienteCached` / `setFatturatoClienteCached`); invalidare dopo operazioni che cambiano pagamenti o piani.

---

## 5. Progresso piano (UI)

In `preventivoai-shared` (`analizzaStatoPiano` / `statoPiano.ts`) il **progresso del piano** usa la stessa convenzione del fatturato sulle rate:

- `importoRaccolto` = somma `importo` (incassato) + `acconto` (parziale)
- `residuo` = importo totale piano − importoRaccolto
- Una rata conta come “pagata” nel conteggio `ratePagate` solo se `stato === incassato"`

Questo allinea badge, barre di progresso e totali incasso.

---

## 6. Preventivo singolo: flag `pagato`

- Si imposta con `segnaPreventivoPagato` o dalla UI notifiche/home.
- `data_pagamento`: ISO completo (timestamp) o mezzogiorno locale (`inputDateToIso`) se scelta dall’utente.
- Se lo **stato** del preventivo passa da `accettato` a un altro valore, `pagato` e `data_pagamento` vengono **azzerati** (`cambiaStatoPreventivo`).

---

## 7. Riepilogo operativo

| Azione utente | Effetto sul fatturato |
|---------------|------------------------|
| Segna preventivo accettato come pagato (senza piano) | + `importo_totale` del preventivo |
| Crea piano rate/canone collegato al preventivo | Preventivo escluso dai singoli; incasso solo via rate |
| Registra pagamento parziale su rata | + importo pagato (fino a `acconto` cumulato) |
| Chiude rata (incassato) | + `importo` rata |
| Azzera pagamento rata | − contributo precedente (acconto torna 0) |
| Disattiva/cestina abbonamento | Rate del piano non entrano più nel totale (filtro `attivo` + cestino) |

---

## 8. File di implementazione principali

| Area | Percorso |
|------|----------|
| Calcolo fatturato cliente | `preventivoai-desktop/src/lib/incassi.ts` |
| Registrazione pagamenti rata | `preventivoai-desktop/src/lib/hooks/useAbbonamento.ts` |
| Helper DB rate / stati | `preventivoai-desktop/src/lib/hooks/abbonamentoDb.ts` |
| Analisi stato piano (UI) | `preventivoai-shared/src/statoPiano.ts` |
| Pagamento preventivo singolo | `preventivoai-desktop/src/lib/preventivo.ts` |

---

## 9. Tipi database

Tipi Supabase generati o mantenuti in `preventivoai-desktop/src/lib/database.types.ts`. Rigenerare con:

```bash
npx supabase login
npx supabase gen types typescript --project-id xzvvsdnuurzsocsmrghi > src/lib/database.types.ts
```

Dopo la rigenerazione, verificare che union `stato` rata e `tipo` abbonamento restino allineate ai valori sopra.

---

## 10. Cestino e eliminazione

### Soft delete (7 giorni)

Quando l’utente elimina un preventivo dalla UI, il record **non** viene cancellato subito: viene impostato `deleted_at` e il preventivo compare nel **cestino**. Dopo **7 giorni** può essere eliminato definitivamente in automatico (`purgeCestinoScaduto`) o manualmente dall’utente.

Se il preventivo ha un **piano collegato** (abbonamento / rate), il piano viene soft-deleted **insieme** al preventivo (`attivo = false`, `deleted_at` valorizzato), nell’ordine:

1. **Prima** il piano (`abbonamenti`)
2. **Poi** il preventivo (`preventivi`)

Se il secondo step fallisce, si tenta il **rollback** del piano (ripristino `deleted_at` / `attivo`).

### Hard delete definitivo

Dopo 7 giorni in cestino o su eliminazione manuale dal cestino, i record vengono rimossi in modo permanente. **Ordine obbligatorio** (non invertire):

```
rate_abbonamento → abbonamenti → preventivi
```

### Famiglia versioni

L’eliminazione (soft o hard) coinvolge l’**intera famiglia di versioni** del preventivo: antenati **e** discendenti dalla stessa radice (`preventivo_padre_id` / catena versioni), non solo la versione corrente.

Su desktop l’espansione usa `idsFamigliaPreventivo` (antenati + discendenti). Su mobile, oggi, `idsCatenaPreventivo` considera **solo gli antenati** — comportamento diverso da unificare in shared prima del porting.

### Eccezione — eliminazione cliente

L’eliminazione di un **cliente** è un **hard delete immediato**: **non** passa dal cestino. Cliente, preventivi, abbonamenti e rate collegati vengono cancellati definitivamente. È una scelta intenzionale, diversa dal resto dell’app.

L’UI deve **avvertire** l’utente che l’azione è permanente e irreversibile.

### Incoerenza nota desktop / mobile

| Piattaforma | Helper famiglia versioni | Scope |
|-------------|--------------------------|--------|
| Desktop | `idsFamigliaPreventivo` | Antenati + discendenti |
| Mobile | `idsCatenaPreventivo` | Solo antenati |

Da unificare in `preventivoai-shared` prima del porting mobile del cestino.

### File di implementazione

| Area | Percorso |
|------|----------|
| Cestino desktop | `preventivoai-desktop/src/lib/cestino.ts` |
| Eliminazione cliente (hard) | `preventivoai-desktop/src/lib/clienti.ts` |
| UI cestino | `preventivoai-desktop/src/pages/Cestino.tsx` |
| Cestino mobile | `preventivoai-mobile/lib/cestino.ts` |

---

## 11. Bozza Nuovo preventivo

La bozza del flusso **Nuovo preventivo** (chat e builder manuale) vive in **localStorage** sul device, non su Supabase.

### Salvataggio automatico

Mentre l’utente compila, lo stato viene salvato automaticamente in localStorage (`nuovoDraft.ts`: chiavi separate per bozza chat e bozza manuale).

### Cancellazione al “Genera”

La bozza viene **cancellata** quando l’utente clicca **Genera** (preventivo persistito su DB). Da quel momento le modifiche passano solo tramite **Crea variante** / modifica del preventivo salvato.

### Intercett “Nuovo preventivo” con bozza in sospeso

Se esiste una bozza in sospeso e l’utente clicca **Nuovo preventivo** (sidebar o hub), l’app chiede:

- **Riprendi bozza**, oppure
- **Inizia nuovo**

Nel dialogo, mostrare il **nome cliente** se disponibile nella bozza.

### Due bozze attive (chat + manuale)

Se esistono contemporaneamente una bozza chat e una bozza manuale non vuote, viene ripresa quella con **timestamp di ultima modifica più recente** (`aggiornatoAt` in localStorage). A parità di timestamp, prevale la bozza manuale.

### Path di ripresa

Il path corrente sotto `/nuovo/*` viene tracciato in `nuovoRipresaPath.ts` e **azzerato** quando l’utente esce dal flusso `/nuovo/*`.

### File di implementazione

| Area | Percorso |
|------|----------|
| Draft localStorage | `preventivoai-desktop/src/lib/nuovoDraft.ts` |
| Navigazione / intercept | `preventivoai-desktop/src/lib/nuovoNav.ts` |
| Path ripresa | `preventivoai-desktop/src/lib/nuovoRipresaPath.ts` |
| Provider intercept | `preventivoai-desktop/src/components/NuovoPreventivoNavProvider.tsx` |
| Tracker path | `preventivoai-desktop/src/components/NuovoRipresaPathTracker.tsx` |
| Dialog bozza | `preventivoai-desktop/src/components/BozzaInSospesoDialog.tsx` |

---

## 12. Notifiche — architettura a 3 canali

Le notifiche in-app su desktop usano **tre canali** coordinati ma indipendenti.

### Canale 1 — Realtime JS (Supabase INSERT)

- **Quando:** arriva una nuova riga in `notifiche` mentre la finestra è in **foreground**.
- **Effetto:** toast in-app + aggiornamento badge campanella.
- **Implementazione:** `NotificheProvider.tsx`, subscription Supabase Realtime.

### Canale 2 — Polling Rust nativo (~35 s)

- **Quando:** la finestra è **nascosta / minimizzata** nel system tray (app Tauri ancora attiva).
- **Effetto:** notifica **OS nativa** Windows.
- **Filtri obbligatori** sulla query:
  - `letta = false`
  - `snooze_until IS NULL` **oppure** `snooze_until <= now`
- **Implementazione:** `preventivoai-desktop/src-tauri/src/lib.rs` (poller), sessione sincronizzata da `nativeNotificationSession.ts`.

### Canale 3 — `visteLocalmente` (stato locale sessione)

- **Cosa:** `Set` in memoria JS delle notifiche considerate “viste” in questa sessione.
- **Non persistito** su DB né su disco: si azzera al riavvio dell’app.
- **Effetto:** hover su un toast marca la notifica come vista → il badge scende **senza** scrivere `letta = true` in Supabase.

### Dedup notifiche OS

Ogni notifica inviata da Rust viene tracciata in un `HashSet` in memoria per evitare **doppi alert OS** nella stessa sessione.

Il coordinamento JS ↔ Rust avviene tramite `segnalaNotificaConsegnataRust()` (evita che JS mostri di nuovo una notifica già consegnata da Rust).

### Regola foreground / background

| Stato finestra | Chi notifica |
|----------------|--------------|
| Focused + visible | **JS** (toast + campanella); Rust **salta** la notifica OS |
| Nascosta / tray | **Rust** (notifica OS); JS può non ricevere Realtime (throttling WebView2 in background) |

### File di implementazione

| Area | Percorso |
|------|----------|
| Provider + toast + Realtime | `preventivoai-desktop/src/components/NotificheProvider.tsx` |
| Campanella | `preventivoai-desktop/src/components/NotificheBell.tsx` |
| Query notifiche JS | `preventivoai-desktop/src/lib/notifiche.ts` |
| Poller OS Rust | `preventivoai-desktop/src-tauri/src/lib.rs` |
| Sync sessione Rust | `preventivoai-desktop/src/lib/nativeNotificationSession.ts` |

---

## 13. Convenzione date pagamento

### Date inserite dall’utente

Esempi: data pagamento preventivo singolo, data incasso rata scelta in modale.

- Salvate come ISO con **mezzogiorno locale** (`T12:00:00`) tramite `inputDateToIso()` in `format.ts`.
- Motivo: evitare che il fuso orario sposti la data visualizzata al **giorno precedente** rispetto a quanto scelto dall’utente.

### Date generate dal sistema

Esempi: `created_at`, `updated_at`, timestamp automatici.

- Formato: **ISO UTC** standard (`new Date().toISOString()`).

### Display in UI

- Sempre tramite `formatData()` / `formatDataBreve()` (e affini) in `format.ts`, locale **it-IT**.
- **Non** usare `toLocaleDateString()` inline nei componenti.

### `data_incasso` su `rate_abbonamento`

Si scrive **solo** quando la rata raggiunge saldo zero (`stato = incassato`), non sui pagamenti parziali (`parziale`).

### File di implementazione

| Area | Percorso |
|------|----------|
| Helper date desktop | `preventivoai-desktop/src/lib/format.ts` |
| Modale pagamento preventivo | `preventivoai-desktop/src/components/PreventivoStatoModal.tsx` |
| Registrazione pagamento rata | `preventivoai-desktop/src/lib/hooks/useAbbonamento.ts` |

---

## 14. Struttura moduli Nuovo preventivo (desktop)

Per capire il flusso completo **Nuovo preventivo**, leggere insieme questi moduli:

| Modulo | Ruolo |
|--------|--------|
| `Nuovo.tsx` | Orchestrazione principale (~1345 righe; candidato a ulteriore split) |
| `nuovoDraft.ts` | Bozza localStorage: salva / carica / cancella |
| `nuovoBozzaSnapshot.ts` | Snapshot stato builder per ripresa |
| `nuovoPianiPagamento.ts` | Logica piani pagamento nel builder |
| `nuovoNav.ts` | Navigazione e intercept bozza |
| `NuovoPreventivoNavProvider.tsx` | Context provider per intercept sidebar |
| `NuovoRipresaPathTracker.tsx` | Tracker path corrente sotto `/nuovo/*` per ripresa bozza |

Percorsi: `preventivoai-desktop/src/pages/Nuovo.tsx` e `preventivoai-desktop/src/lib/nuovo*.ts` / `preventivoai-desktop/src/components/Nuovo*.tsx`.

