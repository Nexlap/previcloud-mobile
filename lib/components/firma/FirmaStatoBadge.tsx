import { Text } from 'react-native'
import type { PreventivoInvio } from '../../api/firma'
import { labelFirmaFirmata, statoFirmaInvio } from '../../api/firma'
import { LongPressAwareTouchableOpacity } from '../LongPressAwarePressable'

type Props = {
  invio?: PreventivoInvio
  onPress?: () => void
  onLongPress?: () => void
}

export function FirmaStatoBadge({ invio, onPress, onLongPress }: Props) {
  const sf = statoFirmaInvio(invio)
  if (sf === 'nessuno') return null

  const label =
    sf === 'firmato' ? labelFirmaFirmata(invio)
      : sf === 'attesa' ? '\u23F3 In attesa firma'
        : sf === 'scaduto' ? 'Link firma scaduto'
          : 'Link revocato'

  const style = {
    fontSize: 11,
    fontWeight: '700' as const,
    marginTop: 4,
    color: sf === 'firmato' ? '#065F46' : sf === 'attesa' ? '#B45309' : '#6B7280',
  }

  if (onPress || onLongPress) {
    return (
      <LongPressAwareTouchableOpacity
        onPress={onPress ?? (() => {})}
        onLongPress={onLongPress}
        delayLongPress={400}
        hitSlop={8}
        activeOpacity={0.7}
      >
        <Text style={style}>{label}</Text>
      </LongPressAwareTouchableOpacity>
    )
  }

  return <Text style={style}>{label}</Text>
}

export function mostraPulsanteInviaFirma(pdfUrl?: string | null, invio?: PreventivoInvio) {
  if (!pdfUrl) return false
  const sf = statoFirmaInvio(invio)
  return sf === 'nessuno' || sf === 'scaduto' || sf === 'revocato'
}
