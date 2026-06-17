import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'
import { settingsStyles as styles } from './settingsStyles'

type NavLink = {
  label: string
  onPress: () => void
}

type Props = {
  links: NavLink[]
  saving: boolean
  onSave: () => void
}

export function SettingsLinksSection({ links, saving, onSave }: Props) {
  return (
    <>
      {links.map(link => (
        <TouchableOpacity key={link.label} style={styles.fiscaleBtn} onPress={link.onPress}>
          <Text style={styles.fiscaleBtnText}>{link.label}</Text>
          <Text style={styles.fiscaleBtnArrow}>›</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={onSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Salva impostazioni</Text>}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </>
  )
}
