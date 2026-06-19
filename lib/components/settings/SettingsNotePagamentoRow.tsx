import { useState } from 'react'
import { Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useSettingsTheme } from '../../hooks/useSettingsTheme'
import { settingsStyles as styles } from './settingsStyles'

type Props = {
  value: string
  onChange: (val: string) => void
}

export function SettingsNotePagamentoRow({ value, onChange }: Props) {
  const t = useSettingsTheme()
  const ph = t.sub.color as string
  const [expanded, setExpanded] = useState(false)
  const preview = value.trim() || 'Nessuna nota impostata'

  return (
    <View style={[styles.settingsPanel, t.card]}>
      <TouchableOpacity
        style={styles.settingsPanelHeader}
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.7}
      >
        <Text style={[styles.settingsRowLabel, t.title]}>Note di pagamento</Text>
        <Text style={{ fontSize: 18, color: t.icon }}>{expanded ? '▾' : '▸'}</Text>
      </TouchableOpacity>

      {!expanded ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <Text style={[styles.cardSub, t.sub]} numberOfLines={2}>{preview}</Text>
        </View>
      ) : null}

      {expanded ? (
        <View style={[styles.settingsPanelBody, { borderTopWidth: 1, borderTopColor: t.input.borderColor }]}>
          <Text style={[styles.cardSub, t.sub]}>Appare in fondo a tutti i preventivi PDF</Text>
          <TextInput
            style={[styles.input, t.input, { height: 100, textAlignVertical: 'top' as const }]}
            value={value}
            onChangeText={onChange}
            placeholder="es. Pagamento 50% anticipato, saldo alla consegna"
            placeholderTextColor={ph}
            multiline
          />
        </View>
      ) : null}
    </View>
  )
}
