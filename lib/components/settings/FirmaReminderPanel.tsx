import { Switch, Text, View } from 'react-native'
import { useSettingsTheme } from '../../hooks/useSettingsTheme'
import { GiorniReminderPicker } from '../pickers/DatePartPickers'
import { settingsStyles as styles } from './settingsStyles'

type Props = {
  giorni: number
  disabilitato: boolean
  onGiorniChange: (giorni: number) => void
  onDisabilitatoChange: (v: boolean) => void
}

export function FirmaReminderPanel({ giorni, disabilitato, onGiorniChange, onDisabilitatoChange }: Props) {
  const t = useSettingsTheme()
  return (
    <View style={[styles.card, t.card, { gap: 10 }]}>
      <Text style={[styles.cardTitle, t.title]}>Automazione reminder firma</Text>
      <Text style={[styles.cardSub, t.sub]}>
        Dopo quanti giorni dall'invio del link ti chiediamo se mandare il promemoria al cliente (usa il template «Reminder» sotto).
      </Text>
      <Text style={[styles.label, t.label]}>GIORNI PRIMA DEL REMINDER</Text>
      <GiorniReminderPicker
        value={giorni}
        onChange={onGiorniChange}
        disabled={disabilitato}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ flex: 1, fontSize: 13, color: t.sub.color, marginRight: 12 }}>
          Disabilita reminder firma (tutti i preventivi)
        </Text>
        <Switch
          value={disabilitato}
          onValueChange={onDisabilitatoChange}
          trackColor={{ false: '#D1D5DB', true: '#0E9F8E' }}
          thumbColor="#fff"
        />
      </View>
    </View>
  )
}
