export const STATI_PREVENTIVO = ['bozza', 'inviato', 'accettato', 'rifiutato'] as const

export function statoPreventivoIcon(stato: string) {
  if (stato === 'bozza') return '\uD83D\uDCDD'
  if (stato === 'inviato') return '\uD83D\uDCE4'
  if (stato === 'accettato') return '\u2705'
  return '\u274C'
}
