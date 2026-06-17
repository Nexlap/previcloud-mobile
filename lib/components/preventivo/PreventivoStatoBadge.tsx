import { StyleSheet, Text, View, ViewStyle } from 'react-native'

type Props = {
  stato?: string | null
  showArrow?: boolean
}

export function statoBadgeStyle(stato?: string | null): ViewStyle {
  const s = stato || 'bozza'
  if (s === 'accettato') return { backgroundColor: '#D1FAE5' }
  if (s === 'rifiutato') return { backgroundColor: '#FEE2E2' }
  if (s === 'inviato') return { backgroundColor: '#DBEAFE' }
  return { backgroundColor: '#F3F4F6' }
}

export function PreventivoStatoBadge({ stato, showArrow = false }: Props) {
  const label = `${stato || 'bozza'}${showArrow ? ' \u25BC' : ''}`

  return (
    <View style={[styles.badge, statoBadgeStyle(stato)]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start' },
  text: { fontSize: 10, color: '#6B7280', fontWeight: '500' },
})
