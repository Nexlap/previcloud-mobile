export function errorMessage(error: unknown, fallback = 'Errore imprevisto') {
  return error instanceof Error ? error.message : fallback
}
