import { Switch, Text, TouchableOpacity, View } from 'react-native'
import { PROFILO_COLORS as C } from '../../features/profilo/constants'
import { AppIcon } from '../icons/AppIcon'
import { profiloStyles as styles } from './profiloStyles'

type Props = {
  biometricoDisponibile: boolean
  biometricoAttivato: boolean
  biometricoAbilitabile?: boolean
  onToggleBiometrico: (value: boolean) => void
  onCambiaPassword: () => void
}

export function ProfiloSicurezzaCard({
  biometricoDisponibile,
  biometricoAttivato,
  biometricoAbilitabile = true,
  onToggleBiometrico,
  onCambiaPassword,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Sicurezza</Text>
      <Text style={styles.cardSub}>Cambia la password del tuo account.</Text>
      {biometricoDisponibile ? (
        <View style={[styles.settingRow, { marginTop: 4 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>Accesso biometrico</Text>
            <Text style={styles.settingDesc}>
              {biometricoAbilitabile
                ? 'Impronta digitale o Face ID'
                : 'Completa onboarding e termini per attivarlo'}
            </Text>
          </View>
          <Switch
            value={biometricoAttivato}
            onValueChange={onToggleBiometrico}
            disabled={!biometricoAbilitabile && !biometricoAttivato}
            trackColor={{ false: C.border, true: C.teal }}
            thumbColor="#fff"
          />
        </View>
      ) : null}
      <TouchableOpacity style={styles.settingBtn} onPress={onCambiaPassword}>
        <View style={styles.settingBtnInner}>
          <AppIcon name="key" size={16} />
          <Text style={styles.settingBtnText}>Cambia password</Text>
        </View>
        <AppIcon name="chevron-right" size={18} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  )
}
