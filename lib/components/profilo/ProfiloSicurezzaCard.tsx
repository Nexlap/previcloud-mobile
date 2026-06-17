import { Alert, Switch, Text, TouchableOpacity, View } from 'react-native'
import { PROFILO_COLORS as C } from '../../features/profilo/constants'
import { profiloStyles as styles } from './profiloStyles'

type Props = {
  biometricoDisponibile: boolean
  biometricoAttivato: boolean
  onToggleBiometrico: (value: boolean) => void
}

export function ProfiloSicurezzaCard({ biometricoDisponibile, biometricoAttivato, onToggleBiometrico }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Sicurezza</Text>
      {biometricoDisponibile ? (
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>Accesso biometrico</Text>
            <Text style={styles.settingDesc}>Impronta digitale o Face ID</Text>
          </View>
          <Switch
            value={biometricoAttivato}
            onValueChange={onToggleBiometrico}
            trackColor={{ false: C.border, true: C.teal }}
            thumbColor="#fff"
          />
        </View>
      ) : null}
      <TouchableOpacity
        style={styles.settingBtn}
        onPress={() => Alert.alert('Prossimamente', 'Il cambio password sarà disponibile a breve.')}
      >
        <Text style={styles.settingBtnText}>{'\uD83D\uDD11'} Cambia password</Text>
        <Text style={styles.settingBtnArrow}>{'\u203A'}</Text>
      </TouchableOpacity>
    </View>
  )
}
