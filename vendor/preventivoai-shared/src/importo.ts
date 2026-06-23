import type { RateAccontoTipo, RateModalitaPiano } from './calcolaAccontoSaldoPiano'
import { calcolaAccontoSaldoPiano } from './calcolaAccontoSaldoPiano'
import { calcolaImportiRate, parseImportoEuro } from './importoBase'

export { calcolaImportiRate, parseImportoEuro } from './importoBase'

const formattersImporto = new Map<number, Intl.NumberFormat>()

function formatterImportoEuro(decimals: number): Intl.NumberFormat {
  let formatter = formattersImporto.get(decimals)
  if (!formatter) {
    formatter = new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true,
    })
    formattersImporto.set(decimals, formatter)
  }
  return formatter
}

export function formatImportoEuro(valore: number, decimals = 0): string {
  return formatterImportoEuro(decimals).format(valore)
}

/** UI: sempre 2 decimali fissi (es. 100 → "100,00"). */
export function formatImportoEuroVisuale(valore: number): string {
  return formatImportoEuro(valore, 2)
}

export function formatImportoDb(valore: number | string | null | undefined): string {
  if (valore == null || valore === '') return ''
  const n = typeof valore === 'number' ? valore : Number(valore)
  if (Number.isNaN(n)) return String(valore)
  return formatImportoEuroVisuale(n)
}

export type RataImportoModificabile = {
  id: string
  pinnata: boolean
  importoBozza: number | null
  accontoMinimo: number
}

/** Ripartisce il residuo del piano sulle rate non fissate (pin o già pagate escluse). */
export function ricalcolaImportiRateLibere(
  totalePiano: number,
  sommaRateIncassate: number,
  rateModificabili: RataImportoModificabile[],
): { ok: true; importi: Record<string, number> } | { ok: false; messaggio: string } {
  let sommaFisse = sommaRateIncassate
  const importi: Record<string, number> = {}
  const libere: RataImportoModificabile[] = []

  for (const rata of rateModificabili) {
    if (rata.pinnata) {
      if (rata.importoBozza === null || rata.importoBozza <= 0) {
        return { ok: false, messaggio: 'Inserisci un importo valido per ogni rata fissata.' }
      }
      if (rata.importoBozza < rata.accontoMinimo) {
        return { ok: false, messaggio: 'Una rata fissata ha importo inferiore all\'acconto già versato.' }
      }
      importi[rata.id] = rata.importoBozza
      sommaFisse += rata.importoBozza
    } else {
      libere.push(rata)
    }
  }

  const residuo = Math.round((totalePiano - sommaFisse) * 100) / 100

  if (libere.length === 0) {
    if (Math.abs(residuo) > 0.01) {
      return { ok: false, messaggio: 'Gli importi fissi non corrispondono al totale del piano. Modifica le rate fissate o sbloccane una.' }
    }
    return { ok: true, importi }
  }

  if (residuo <= 0) {
    return { ok: false, messaggio: 'Gli importi fissi superano il totale del piano. Riduci una rata fissata.' }
  }

  const nuoviImporti = libere.length === 1
    ? [residuo]
    : calcolaImportiRate(residuo, libere.length)

  if (nuoviImporti.length !== libere.length) {
    return { ok: false, messaggio: 'Impossibile ricalcolare le rate libere.' }
  }

  for (let i = 0; i < libere.length; i++) {
    const rata = libere[i]
    const importo = nuoviImporti[i]
    if (importo < rata.accontoMinimo) {
      return {
        ok: false,
        messaggio: `Il ricalcolo assegnerebbe meno dell'acconto già versato su una rata. Fissa manualmente quella rata o sblocca altre.`,
      }
    }
    importi[rata.id] = importo
  }

  return { ok: true, importi }
}

/** Clamp giorno scadenza (1-31) all'ultimo giorno del mese indicato. */
export function clampGiornoScadenzaPerMese(giornoScadenza: number, mese: number, anno: number): number {
  const giorno = Math.min(Math.max(giornoScadenza, 1), 31)
  const ultimoGiornoMese = new Date(anno, mese, 0).getDate()
  return Math.min(giorno, ultimoGiornoMese)
}

export type RataScadenzaLabel = { mese: number; anno: number }

/** Etichetta scadenza rata/canone usando il giorno del piano padre (con clamp mensile). */
export function labelScadenzaRataDaPiano(rata: RataScadenzaLabel, giornoScadenzaPiano: number): string {
  const giornoClampato = clampGiornoScadenzaPerMese(giornoScadenzaPiano, rata.mese, rata.anno)
  return labelScadenzaRata(rata.mese, rata.anno, giornoClampato)
}

/** Scadenze mensili a partire dal mese indicato (1-12), con giorno fisso (1-31). */
export function calcolaScadenzeRate(
  numeroRate: number,
  giornoScadenza = 1,
  meseInizio?: number,
): { mese: number; anno: number; giorno: number }[] {
  const ora = new Date()
  let mesePartenza = meseInizio && meseInizio >= 1 && meseInizio <= 12 ? meseInizio : ora.getMonth() + 1
  let annoPartenza = ora.getFullYear()
  if (mesePartenza < ora.getMonth() + 1) annoPartenza += 1

  return Array.from({ length: numeroRate }, (_, i) => {
    let meseTotale = mesePartenza - 1 + i
    const anno = annoPartenza + Math.floor(meseTotale / 12)
    const mese = (meseTotale % 12) + 1
    const giornoClampato = clampGiornoScadenzaPerMese(giornoScadenza, mese, anno)
    return { mese, anno, giorno: giornoClampato }
  })
}

const MESI_NOMI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

export function labelScadenzaRata(mese: number, anno: number, giorno?: number) {
  const meseNome = MESI_NOMI[mese - 1]
  if (giorno) return `${giorno} ${meseNome} ${anno}`
  return `${meseNome} ${anno}`
}

export function testoPagamentoRatePdf(opts: {
  attivo: boolean
  visibileNelPDF: boolean
  importoTotale: number
  numeroRate: number
  giornoScadenza: number
  meseInizio?: number
  rateModalita?: RateModalitaPiano
  rateAccontoTipo?: RateAccontoTipo
  rateAccontoValore?: string
}): string {
  if (!opts.attivo || !opts.visibileNelPDF || opts.importoTotale <= 0) return ''

  if (opts.rateModalita === 'acconto_saldo') {
    const accontoSaldo = calcolaAccontoSaldoPiano(
      opts.importoTotale,
      opts.rateAccontoTipo ?? 'fisso',
      opts.rateAccontoValore ?? '',
    )
    if (accontoSaldo) {
      return `\nPAGAMENTO A RATE: Acconto + saldo`
        + `\nIMPORTO ACCONTO: \u20AC${formatImportoEuro(accontoSaldo.acconto, 2)}`
        + `\nIMPORTO SALDO: \u20AC${formatImportoEuro(accontoSaldo.saldo, 2)}`
    }
  }

  if (opts.numeroRate < 2) return ''
  const importi = calcolaImportiRate(opts.importoTotale, opts.numeroRate)
  if (importi.length === 0) return ''
  const scadenze = calcolaScadenzeRate(opts.numeroRate, opts.giornoScadenza, opts.meseInizio)
  const quota = importi[0]
  const ultima = importi[importi.length - 1]
  const primaScadenza = scadenze[0]
  let blocco = `\nPAGAMENTO A RATE: ${opts.numeroRate} rate`
  blocco += `\nIMPORTO RATA: \u20AC${formatImportoEuro(quota, 2)}`
  if (ultima !== quota) blocco += `\nULTIMA RATA: \u20AC${formatImportoEuro(ultima, 2)}`
  if (primaScadenza) {
    blocco += `\nSCADENZA PRIMA RATA: ${labelScadenzaRata(primaScadenza.mese, primaScadenza.anno, primaScadenza.giorno)}`
  }
  return blocco
}

/** Estrae l'importo totale dal testo preventivo (ultima riga TOTALE:, fallback Imponibile). */
export function importoDaTesto(testo: string): number | null {
  const righe = testo.split('\n')
  for (let i = righe.length - 1; i >= 0; i--) {
    const riga = righe[i].trim()
    if (!/^TOTALE:/i.test(riga)) continue
    const match = riga.match(/TOTALE:\s*(?:EUR\s*)?(?:€\s*)?([\d.,]+)/i)
    if (match) return parseImportoEuro(match[1])
  }

  const matches = [...testo.matchAll(/TOTALE:\s*(?:EUR\s*)?(?:€\s*)?([\d.,]+)/gi)]
  if (matches.length > 0) {
    return parseImportoEuro(matches[matches.length - 1][1])
  }

  const imponibile = testo.match(/Imponibile:\s*(?:EUR\s*)?(?:€\s*)?([\d.,]+)/i)
  if (imponibile && !/IVA\s*22%/i.test(testo)) {
    return parseImportoEuro(imponibile[1])
  }

  return null
}
