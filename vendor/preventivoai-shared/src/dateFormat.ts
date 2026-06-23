const FORMATTER_DATA_ESTESA = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const FORMATTER_DATA_BREVE = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** Valore per input HTML / DatePicker (YYYY-MM-DD nel fuso locale). */
export function oggiInputDate(now = new Date()): string {
  return now.toLocaleDateString('en-CA')
}

/**
 * Persistenza date-only scelte dall'utente: mezzogiorno locale → ISO UTC.
 * Evita shift di giorno rispetto al fuso orario in visualizzazione.
 */
export function inputDateToIso(dateString: string): string {
  return new Date(`${dateString}T12:00:00`).toISOString()
}

/** Data estesa in italiano (es. "21 giugno 2026"). */
export function formatData(isoString: string | null | undefined): string {
  if (!isoString) return '-'
  return FORMATTER_DATA_ESTESA.format(new Date(isoString))
}

const FORMATTER_ORA_BREVE = new Intl.DateTimeFormat('it-IT', {
  hour: '2-digit',
  minute: '2-digit',
})

/** Ora breve in italiano (es. "17:20"). */
export function formatOraBreve(isoString: string | null | undefined): string {
  if (!isoString) return ''
  return FORMATTER_ORA_BREVE.format(new Date(isoString))
}

/** Data breve + ora (es. "22/06/2026 · 17:20"). */
export function formatDataBreveConOra(isoString: string | null | undefined): string {
  if (!isoString) return '-'
  return `${FORMATTER_DATA_BREVE.format(new Date(isoString))} · ${formatOraBreve(isoString)}`
}

/** Data breve numerica in italiano (es. "21/06/2026"). */
export function formatDataBreve(isoString: string | null | undefined): string {
  if (!isoString) return '-'
  return FORMATTER_DATA_BREVE.format(new Date(isoString))
}
