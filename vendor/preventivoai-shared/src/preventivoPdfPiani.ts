import { calcolaImportiRate, calcolaScadenzeRate, parseImportoEuro } from './importo'
import { nomePianoDaPreventivo } from './preventivoMadre'

export type ClientePreventivo = { id: string; nome: string }

export type PreventivoPianiDb = {
  getUserId(): Promise<string | null>
  esistePianoAttivo(preventivoId: string): Promise<boolean>
  fetchPreventivo(preventivoId: string): Promise<{
    titolo: string | null
    created_at: string | null
    versione: number
  } | null>
  insertAbbonamento(row: {
    user_id: string
    cliente_id: string
    importo_default: number
    giorno_scadenza: number
    attivo: boolean
    preventivo_id: string | null
    numero_mensilita: number | null
    tipo: 'canone' | 'rate'
    nome: string | null
    note?: null
  }): Promise<{ id: string } | null>
  insertRate(rows: Array<{
    abbonamento_id: string
    mese: number
    anno: number
    importo: number
    acconto: number
    stato: 'da_incassare'
  }>): Promise<void>
  agganciaPianoAPreventivo(abbonamentoId: string, preventivoId: string): Promise<boolean>
}

export async function creaAbbonamentoDaPreventivo(
  db: PreventivoPianiDb,
  {
    cliente,
    preventivoId,
    importoRaw,
    giornoRaw,
    meseInizioRaw,
    mensilitaRaw,
  }: {
    cliente: ClientePreventivo
    preventivoId: string
    importoRaw: string
    giornoRaw: string
    meseInizioRaw: string
    mensilitaRaw: string
  },
): Promise<{ esistente: boolean }> {
  const userId = await db.getUserId()
  if (!userId) return { esistente: false }

  const importo = parseImportoEuro(importoRaw) ?? 0
  const giorno = parseInt(giornoRaw, 10)
  const meseInizio = parseInt(meseInizioRaw, 10)
  const mensilita = mensilitaRaw ? parseInt(mensilitaRaw, 10) : null
  if (!(importo > 0 && giorno >= 1 && giorno <= 31 && meseInizio >= 1 && meseInizio <= 12)) {
    return { esistente: false }
  }

  if (await db.esistePianoAttivo(preventivoId)) return { esistente: true }

  const prev = await db.fetchPreventivo(preventivoId)
  const nome = prev ? nomePianoDaPreventivo(prev, 'canone') : null
  const ab = await db.insertAbbonamento({
    user_id: userId,
    cliente_id: cliente.id,
    importo_default: importo,
    giorno_scadenza: giorno,
    attivo: true,
    preventivo_id: preventivoId,
    numero_mensilita: mensilita,
    tipo: 'canone',
    nome,
  })

  if (!ab) return { esistente: false }

  const numRate = mensilita && mensilita > 0 ? mensilita : 1
  const scadenze = calcolaScadenzeRate(numRate, giorno, meseInizio)
  await db.insertRate(scadenze.map((s) => ({
    abbonamento_id: ab.id,
    mese: s.mese,
    anno: s.anno,
    importo,
    acconto: 0,
    stato: 'da_incassare' as const,
  })))

  return { esistente: false }
}

export async function creaPianoRateDaPreventivo(
  db: PreventivoPianiDb,
  {
    cliente,
    preventivoId,
    importoTotale,
    numeroRateRaw,
    giornoScadenzaRaw,
    meseInizioRaw,
    importiPersonalizzati,
  }: {
    cliente: ClientePreventivo
    preventivoId: string | null
    importoTotale: number
    numeroRateRaw: string
    giornoScadenzaRaw: string
    meseInizioRaw: string
    importiPersonalizzati?: number[]
  },
): Promise<{ esistente: boolean; abbonamentoId?: string }> {
  const userId = await db.getUserId()
  if (!userId) return { esistente: false }

  const numeroRate = parseInt(numeroRateRaw, 10)
  const giornoScadenza = parseInt(giornoScadenzaRaw, 10)
  const meseInizio = parseInt(meseInizioRaw, 10)
  if (!(importoTotale > 0 && numeroRate >= 2 && giornoScadenza >= 1 && giornoScadenza <= 31 && meseInizio >= 1 && meseInizio <= 12)) {
    return { esistente: false }
  }

  if (preventivoId && await db.esistePianoAttivo(preventivoId)) return { esistente: true }

  const sommaPersonalizzati = importiPersonalizzati
    ? Math.round(importiPersonalizzati.reduce((a, v) => a + v, 0) * 100) / 100
    : null
  const usaImportiPersonalizzati =
    importiPersonalizzati != null
    && importiPersonalizzati.length === numeroRate
    && sommaPersonalizzati != null
    && Math.abs(sommaPersonalizzati - importoTotale) <= 0.01

  const importi = usaImportiPersonalizzati
    ? importiPersonalizzati
    : calcolaImportiRate(importoTotale, numeroRate)
  const scadenze = calcolaScadenzeRate(numeroRate, giornoScadenza, meseInizio)

  const prev = preventivoId ? await db.fetchPreventivo(preventivoId) : null
  const nome = prev ? nomePianoDaPreventivo(prev, 'rate') : null
  const ab = await db.insertAbbonamento({
    user_id: userId,
    cliente_id: cliente.id,
    importo_default: importoTotale,
    giorno_scadenza: giornoScadenza,
    attivo: true,
    preventivo_id: preventivoId,
    numero_mensilita: numeroRate,
    note: null,
    tipo: 'rate',
    nome,
  })

  if (!ab) return { esistente: false }

  await db.insertRate(importi.map((importo, i) => ({
    abbonamento_id: ab.id,
    mese: scadenze[i].mese,
    anno: scadenze[i].anno,
    importo,
    acconto: 0,
    stato: 'da_incassare' as const,
  })))

  return { esistente: false, abbonamentoId: ab.id }
}

export async function agganciaPianoAPreventivo(
  db: PreventivoPianiDb,
  abbonamentoId: string,
  preventivoId: string,
): Promise<boolean> {
  return db.agganciaPianoAPreventivo(abbonamentoId, preventivoId)
}
