export function messaggioEliminaDefinitiva(count: number, tipo: 'preventivo' | 'piano'): string {
  const cosa = tipo === 'preventivo'
    ? (count === 1 ? 'questo preventivo' : `questi ${count} preventivi`)
    : (count === 1 ? 'questo piano/abbonamento' : `questi ${count} piani/abbonamenti`)
  return `Eliminare definitivamente ${cosa}? Non sarà più possibile ripristinarli.`
}

export function messaggioRipristina(count: number, tipo: 'preventivo' | 'piano'): string {
  const cosa = tipo === 'preventivo'
    ? (count === 1 ? 'questo preventivo' : `questi ${count} preventivi`)
    : (count === 1 ? 'questo piano/abbonamento' : `questi ${count} piani/abbonamenti`)
  return `Ripristinare ${cosa}?`
}
