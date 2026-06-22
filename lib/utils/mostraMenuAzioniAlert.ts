import { Alert, type AlertButton } from 'react-native'
import type { VoceMenuAzione } from '../components/MenuAzioniSheet'

const LABEL_ANNULLA = 'Annulla'

/** Menu contestuale via Alert nativo (action sheet su iOS, dialog su Android). */
export function mostraMenuAzioniAlert(voci: VoceMenuAzione[], titolo?: string) {
  const visibili = voci.filter(v => !v.hidden && v.label !== LABEL_ANNULLA)
  if (visibili.length === 0) return

  const buttons: AlertButton[] = visibili.map(v => ({
    text: v.label,
    style: v.danger ? 'destructive' : 'default',
    onPress: v.onPress,
  }))

  buttons.push({ text: LABEL_ANNULLA, style: 'cancel' })

  Alert.alert(titolo ?? '', undefined, buttons, { cancelable: true })
}
