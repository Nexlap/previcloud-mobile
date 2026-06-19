import { useState } from 'react'
import { Text, TextInput, TouchableOpacity, View } from 'react-native'
import { COLORI_BRAND } from '../../features/settings/constants'
import { useSettingsTheme } from '../../hooks/useSettingsTheme'
import { settingsStyles as styles } from './settingsStyles'

type Props = {
  value: string
  onChange: (val: string) => void
}

export function SettingsColoreBrandRow({ value, onChange }: Props) {
  const t = useSettingsTheme()
  const ph = t.sub.color as string
  const [expanded, setExpanded] = useState(false)
  const hex = value || '0D1B2A'

  return (
    <View style={[styles.settingsPanel, t.card]}>
      <TouchableOpacity
        style={styles.settingsPanelHeader}
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.7}
      >
        <Text style={[styles.settingsRowLabel, t.title]}>Colore brand</Text>
        <View style={styles.settingsRowRight}>
          <Text style={[styles.settingsRowValue, t.sub]}>#{hex}</Text>
          <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: `#${hex}`, borderWidth: 1, borderColor: t.input.borderColor }} />
          <Text style={{ fontSize: 18, color: t.icon }}>{expanded ? '▾' : '▸'}</Text>
        </View>
      </TouchableOpacity>

      {expanded ? (
        <View style={[styles.settingsPanelBody, { borderTopWidth: 1, borderTopColor: t.input.borderColor }]}>
          <Text style={[styles.cardSub, t.sub]}>Usato nell'intestazione e nei dettagli del PDF</Text>
          <View style={styles.coloriGrid}>
            {COLORI_BRAND.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.coloreChip, { backgroundColor: '#' + c }, hex === c && styles.coloreChipActive]}
                onPress={() => onChange(c)}
              >
                {hex === c ? <Text style={styles.coloreChipCheck}>✓</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.label, t.label]}>CODICE HEX</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TextInput
              style={[styles.input, t.input, { flex: 1 }]}
              value={hex}
              onChangeText={v => onChange(v.replace('#', '').toUpperCase())}
              placeholder="0D1B2A"
              placeholderTextColor={ph}
              maxLength={6}
              autoCapitalize="characters"
            />
            <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: `#${hex}` }} />
          </View>
        </View>
      ) : null}
    </View>
  )
}
