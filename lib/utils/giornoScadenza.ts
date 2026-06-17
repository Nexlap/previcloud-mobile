/** Normalizza input giorno scadenza: solo cifre, massimo 31. */
export function normalizzaGiornoScadenzaInput(raw: string): string {
  const cleaned = raw.replace(/\D/g, '').slice(0, 2)
  if (!cleaned) return ''
  const n = parseInt(cleaned, 10)
  if (Number.isNaN(n)) return ''
  return String(Math.min(31, n))
}

export function giornoScadenzaValido(raw: string): boolean {
  const n = parseInt(raw, 10)
  return n >= 1 && n <= 31
}

/** Normalizza mese inizio (1-12). */
export function normalizzaMeseInizioInput(raw: string): string {
  const cleaned = raw.replace(/\D/g, '').slice(0, 2)
  if (!cleaned) return ''
  const n = parseInt(cleaned, 10)
  if (Number.isNaN(n)) return ''
  return String(Math.min(12, Math.max(1, n)))
}

export function meseInizioValido(raw: string): boolean {
  const n = parseInt(raw, 10)
  return n >= 1 && n <= 12
}

export function meseCorrenteString() {
  return String(new Date().getMonth() + 1)
}
