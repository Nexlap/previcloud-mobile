import { ActivityIndicator, Text, TouchableOpacity } from 'react-native'
import { settingsStyles as styles } from './settingsStyles'

type Props = {
  saving: boolean
  onSave: () => void
}

export function SettingsSaveFooter({ saving, onSave }: Props) {
  return (
    <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={onSave} disabled={saving}>
      {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Salva</Text>}
    </TouchableOpacity>
  )
}
