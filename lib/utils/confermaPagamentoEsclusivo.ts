import { Alert } from 'react-native'

type Attivare = 'rate' | 'canone'

export function confermaPagamentoEsclusivo(
  attivare: Attivare,
  altroAttivo: boolean,
  onConferma: () => void,
) {
  if (!altroAttivo) {
    onConferma()
    return
  }
  const disattiva = attivare === 'rate' ? 'abbonamento mensile' : 'pagamento a rate'
  const attiva = attivare === 'rate' ? 'pagamento a rate' : 'abbonamento mensile'
  Alert.alert(
    'Cambia modalità di pagamento',
    `Hai già ${disattiva} attivo. Attivando ${attiva} verrà disattivato. Continuare?`,
    [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Conferma', onPress: onConferma },
    ],
  )
}
