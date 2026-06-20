import { StyleSheet, Text, View } from 'react-native'
import type { AnalisiPiano } from 'preventivoai-shared'

type Props = {
  analisi: AnalisiPiano
  compact?: boolean
}

export function PianoStatoBadge({ analisi, compact }: Props) {
  return (
    <View style={[styles.badge, compact && styles.badgeCompact, { backgroundColor: analisi.badgeBg }]}>
      <Text style={[styles.text, compact && styles.textCompact, { color: analisi.badgeColor }]}>
        {analisi.concluso ? '\u2713 ' : ''}{analisi.label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textCompact: {
    fontSize: 10,
  },
})
