import { Linking, Text, TouchableOpacity, View } from 'react-native'
import { APP_VERSION, WEB_PRIVACY_URL, WEB_TERMINI_URL } from '../../features/profilo/constants'
import { AppIcon } from '../icons/AppIcon'
import { profiloStyles as styles } from './profiloStyles'

export function ProfiloAppCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>App</Text>
      <TouchableOpacity
        style={styles.settingBtn}
        onPress={() => void Linking.openURL(WEB_TERMINI_URL)}
      >
        <View style={styles.settingBtnInner}>
          <AppIcon name="file-text" size={16} />
          <Text style={styles.settingBtnText}>Termini di servizio</Text>
        </View>
        <AppIcon name="chevron-right" size={18} color="#9CA3AF" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.settingBtn}
        onPress={() => void Linking.openURL(WEB_PRIVACY_URL)}
      >
        <View style={styles.settingBtnInner}>
          <AppIcon name="shield" size={16} />
          <Text style={styles.settingBtnText}>Privacy Policy</Text>
        </View>
        <AppIcon name="chevron-right" size={18} color="#9CA3AF" />
      </TouchableOpacity>
      <View style={styles.settingBtn}>
        <View style={styles.settingBtnInner}>
          <AppIcon name="smartphone" size={16} />
          <Text style={styles.settingBtnText}>Versione app</Text>
        </View>
        <Text style={styles.settingDesc}>{APP_VERSION}</Text>
      </View>
    </View>
  )
}
