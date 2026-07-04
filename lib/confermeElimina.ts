import type { RataAbbonamento } from './types'
import {
  messaggioEliminaDefinitiva as messaggioEliminaDefinitivaShared,
  messaggioEliminaPiano as messaggioEliminaPianoShared,
  messaggioEliminaPreventiviMultipli as messaggioEliminaPreventiviMultipliShared,
  messaggioEliminaPreventivoSingolo as messaggioEliminaPreventivoSingoloShared,
  messaggioEliminaRata as messaggioEliminaRataShared,
  messaggioRipristina as messaggioRipristinaShared,
} from 'previcloud-shared'

export const messaggioEliminaPreventivoSingolo = messaggioEliminaPreventivoSingoloShared
export const messaggioEliminaPiano = messaggioEliminaPianoShared
export const messaggioEliminaDefinitiva = messaggioEliminaDefinitivaShared
export const messaggioRipristina = messaggioRipristinaShared

export function messaggioEliminaPreventiviMultipli(
  count: number,
  ids: string[],
  collegamentiPiano: Record<string, 'canone' | 'rate'>,
): string {
  return messaggioEliminaPreventiviMultipliShared(count, ids, collegamentiPiano)
}

export function messaggioEliminaRata(
  rata: RataAbbonamento,
  tipo: 'rate' | 'canone',
): { titolo: string; messaggio: string } {
  return messaggioEliminaRataShared(rata, tipo)
}
