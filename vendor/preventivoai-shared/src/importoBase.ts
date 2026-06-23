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

/** Divide un totale in N rate: prime N-1 arrotondate a 2 decimali, ultima = resto. */
export function calcolaImportiRate(importoTotale: number, numeroRate: number): number[] {
  if (numeroRate < 2 || importoTotale <= 0) return []
  const quota = Math.round((importoTotale / numeroRate) * 100) / 100
  const prime = Array.from({ length: numeroRate - 1 }, () => quota)
  const ultima = Math.round((importoTotale - quota * (numeroRate - 1)) * 100) / 100
  return [...prime, ultima]
}
