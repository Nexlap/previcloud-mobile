import { AppIconName } from '../../components/icons/AppIcon'
import { statoPreventivoIconName } from '../../components/icons/StatoPreventivoIcon'

export const STATI_PREVENTIVO = ['bozza', 'inviato', 'accettato', 'rifiutato'] as const

/** @deprecated Usa StatoPreventivoIcon — mantiene compatibilità nome icona Feather. */
export function statoPreventivoIcon(stato: string): AppIconName {
  return statoPreventivoIconName(stato)
}
