import { Alert, Text, TouchableOpacity, View } from 'react-native'
import { APP_VERSION } from '../../features/profilo/constants'
import { profiloStyles as styles } from './profiloStyles'

export function ProfiloAppCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>App</Text>
      <TouchableOpacity
        style={styles.settingBtn}
        onPress={() => Alert.alert('Termini di servizio', 'Disponibili su preventivoai.it/termini')}
      >
        <Text style={styles.settingBtnText}>{'\uD83D\uDCC4'} Termini di servizio</Text>
        <Text style={styles.settingBtnArrow}>{'\u203A'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.settingBtn}
        onPress={() => Alert.alert('Privacy Policy', 'Disponibile su preventivoai.it/privacy')}
      >
        <Text style={styles.settingBtnText}>{'\uD83D\uDD12'} Privacy Policy</Text>
        <Text style={styles.settingBtnArrow}>{'\u203A'}</Text>
      </TouchableOpacity>
      <View style={styles.settingBtn}>
        <Text style={styles.settingBtnText}>{'\uD83D\uDCF1'} Versione app</Text>
        <Text style={styles.settingDesc}>{APP_VERSION}</Text>
      </View>
    </View>
  )
}
