export type RataPerIncasso = {
  importo: number
  acconto?: number | null
  stato: string | null
}

export type PreventivoPerIncasso = {
  id: string
  importo_totale: number | null
  cliente_id: string | null
}

/** Somma incassato su rate: importo pieno se incassato, acconto se parziale. */
export function sommaImportoRate(rate: RataPerIncasso[]): number {
  return rate.reduce((totale, r) => {
    if (r.stato === 'incassato') return totale + (r.importo || 0)
    if (r.stato === 'parziale') return totale + (r.acconto || 0)
    return totale
  }, 0)
}

/**
 * Incasso da preventivi singoli accettati e segnati pagati.
 * Esclude i preventivi con piano collegato (anti-doppio-conteggio con le rate).
 */
export function incassoSingoliPreventivi(
  preventivi: PreventivoPerIncasso[],
  preventiviConPiano: ReadonlySet<string>,
  clienteId?: string,
): number {
  return preventivi
    .filter((p) => (!clienteId || p.cliente_id === clienteId) && !preventiviConPiano.has(p.id))
    .reduce((totale, p) => totale + (p.importo_totale || 0), 0)
}
