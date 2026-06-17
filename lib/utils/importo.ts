export function parseImportoEuro(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, '')
  if (!trimmed) return null

  if (trimmed.includes(',') && trimmed.includes('.')) {
    const lastComma = trimmed.lastIndexOf(',')
    const lastDot = trimmed.lastIndexOf('.')
    if (lastComma > lastDot) {
      const val = parseFloat(trimmed.replace(/\./g, '').replace(',', '.'))
      return Number.isNaN(val) ? null : val
    }
    const val = parseFloat(trimmed.replace(/,/g, ''))
    return Number.isNaN(val) ? null : val
  }

  if (trimmed.includes(',')) {
    const val = parseFloat(trimmed.replace(',', '.'))
    return Number.isNaN(val) ? null : val
  }

  if (trimmed.includes('.')) {
    const parts = trimmed.split('.')
    const lastPart = parts[parts.length - 1]
    const isThousands = parts.length > 1
      && lastPart.length === 3
      && /^\d{3}$/.test(lastPart)
      && parts.every((part, index) => (index === 0 ? /^\d{1,3}$/.test(part) : /^\d{3}$/.test(part)))

    if (isThousands) {
      const val = parseFloat(parts.join(''))
      return Number.isNaN(val) ? null : val
    }

    const val = parseFloat(trimmed)
    return Number.isNaN(val) ? null : val
  }

  const val = parseFloat(trimmed)
  return Number.isNaN(val) ? null : val
}

export function formatImportoEuro(valore: number, decimals = 0): string {
  return valore.toLocaleString('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Divide un totale in N rate: prime N-1 arrotondate a 2 decimali, ultima = resto. */
export function calcolaImportiRate(importoTotale: number, numeroRate: number): number[] {
  if (numeroRate < 2 || importoTotale <= 0) return []
  const quota = Math.round((importoTotale / numeroRate) * 100) / 100
  const prime = Array.from({ length: numeroRate - 1 }, () => quota)
  const ultima = Math.round((importoTotale - quota * (numeroRate - 1)) * 100) / 100
  return [...prime, ultima]
}

/** Scadenze mensili a partire dal mese indicato (1-12), con giorno fisso (1-31). */
export function calcolaScadenzeRate(
  numeroRate: number,
  giornoScadenza = 1,
  meseInizio?: number,
): { mese: number; anno: number; giorno: number }[] {
  const ora = new Date()
  const giorno = Math.min(Math.max(giornoScadenza, 1), 31)
  let mesePartenza = meseInizio && meseInizio >= 1 && meseInizio <= 12 ? meseInizio : ora.getMonth() + 1
  let annoPartenza = ora.getFullYear()
  if (mesePartenza < ora.getMonth() + 1) annoPartenza += 1
  return Array.from({ length: numeroRate }, (_, i) => {
    const d = new Date(annoPartenza, mesePartenza - 1 + i, giorno)
    return { mese: d.getMonth() + 1, anno: d.getFullYear(), giorno: d.getDate() }
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
}): string {
  if (!opts.attivo || !opts.visibileNelPDF || opts.numeroRate < 2 || opts.importoTotale <= 0) return ''
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
