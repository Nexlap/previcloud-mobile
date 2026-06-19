import { AppIcon, type AppIconName } from './AppIcon'

const STATO_ICONS: Record<string, AppIconName> = {
  bozza: 'edit-3',
  inviato: 'send',
  accettato: 'check-circle',
  rifiutato: 'x-circle',
}

export function statoPreventivoIconName(stato: string): AppIconName {
  return STATO_ICONS[stato] ?? 'file-text'
}

type Props = {
  stato: string
  size?: number
  color?: string
}

export function StatoPreventivoIcon({ stato, size = 18, color = '#6B7280' }: Props) {
  return <AppIcon name={statoPreventivoIconName(stato)} size={size} color={color} />
}
