import { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useSettingsTheme } from '../../hooks/useSettingsTheme'
import { AppIcon } from '../icons/AppIcon'
import { settingsStyles as styles } from './settingsStyles'

type Props = {
  label: string
  value: string
  options: readonly string[]
  onChange: (val: string) => void
}

/** Riga impostazioni: etichetta sopra, valore selezionabile sotto (evita a capo indesiderati). */
export function SettingsDropdown({ label, value, options, onChange }: Props) {
  const t = useSettingsTheme()
  const [open, setOpen] = useState(false)

  return (
    <>
      <TouchableOpacity
        style={[styles.settingsRowStacked, t.card]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.settingsRowLabelStacked, t.title]}>{label}</Text>
        <View style={[styles.settingsSelector, { backgroundColor: t.input.backgroundColor, borderColor: t.input.borderColor }]}>
          <Text style={[styles.settingsSelectorValue, { color: t.title.color }]} numberOfLines={2}>{value}</Text>
          <AppIcon name="chevron-down" size={16} color={t.icon} />
        </View>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <Pressable style={[styles.modalSheet, t.card]} onPress={e => e.stopPropagation()}>
            <Text style={[styles.cardTitle, t.title, { marginBottom: 12 }]}>{label}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {options.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.modalOption, opt === value && { backgroundColor: t.input.backgroundColor }]}
                  onPress={() => { onChange(opt); setOpen(false) }}
                >
                  <Text style={[styles.modalOptionText, t.title, opt === value && { color: '#0E9F8E', fontWeight: '600' }]}>
                    {opt}
                  </Text>
                  {opt === value ? <AppIcon name="check" size={16} color="#0E9F8E" /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
