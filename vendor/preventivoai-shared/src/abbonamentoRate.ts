export type StatoRataAbbonamento = 'da_incassare' | 'parziale' | 'incassato' | 'in_ritardo'

export type RataPerStatoImporto = {
  acconto?: number | null
  stato: StatoRataAbbonamento
}

/**
 * Quattro branch, in ordine di priorità:
 * - `incassato`: acconto ≥ nuovo importo (saldo zero)
 * - `parziale`: acconto > 0 ma sotto il nuovo importo
 * - `in_ritardo`: nessun acconto, ma la rata era già scaduta (si preserva lo stato)
 * - `da_incassare`: nessun acconto e non in ritardo
 *
 * `data_incasso` (scritta lato app su pagamento completo) si imposta SOLO quando lo
 * stato diventa `incassato`.
 */
export function nuovoStatoDopoImportoRata(
  rata: RataPerStatoImporto,
  nuovoImporto: number,
): StatoRataAbbonamento {
  const acconto = rata.acconto || 0
  if (acconto >= nuovoImporto) return 'incassato'
  if (acconto > 0) return 'parziale'
  if (rata.stato === 'in_ritardo') return 'in_ritardo'
  return 'da_incassare'
}

export type RataPerScadenza = {
  id: string
  mese: number
  anno: number
  stato: StatoRataAbbonamento
}

export type AbbonamentoPerScadenza = {
  id: string
  giorno_scadenza: number | null
}

/** True se la rata (da_incassare/parziale) è oltre il giorno di scadenza del piano nel mese corrente. */
export function isRataScaduta(
  rata: Pick<RataPerScadenza, 'mese' | 'anno' | 'stato'>,
  giornoScadenza: number | null,
  ora = new Date(),
): boolean {
  if (rata.stato !== 'da_incassare' && rata.stato !== 'parziale') return false

  const meseOra = ora.getMonth() + 1
  const annoOra = ora.getFullYear()
  const giornoOggi = ora.getDate()
  const giornoLimite = (giornoScadenza ?? 0) > 0 ? giornoScadenza! : 1

  return (
    rata.anno < annoOra
    || (rata.anno === annoOra && rata.mese < meseOra)
    || (rata.anno === annoOra && rata.mese === meseOra && giornoOggi > giornoLimite)
  )
}

/** Rate da segnalare come `in_ritardo` (solo logica pura, senza write DB). */
export function rateScaduteDaSegnalare(
  abbonamentiAttivi: AbbonamentoPerScadenza[],
  ratePerPiano: Record<string, RataPerScadenza[]>,
  ora = new Date(),
): { abbonamentoId: string; rataId: string }[] {
  const scadute: { abbonamentoId: string; rataId: string }[] = []

  for (const abbonamento of abbonamentiAttivi) {
    const rate = ratePerPiano[abbonamento.id] || []
    for (const rata of rate) {
      if (isRataScaduta(rata, abbonamento.giorno_scadenza, ora)) {
        scadute.push({ abbonamentoId: abbonamento.id, rataId: rata.id })
      }
    }
  }

  return scadute
}
