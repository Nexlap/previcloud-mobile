import { StyleSheet, Text, View, ViewStyle } from 'react-native'

type BadgeOpts = {
  stato?: string | null
  pagato?: boolean
  pagamentoGestitoDalPiano?: boolean
}

type Props = BadgeOpts & {
  showArrow?: boolean
}

function badgeMeta({ stato, pagato, pagamentoGestitoDalPiano }: BadgeOpts) {
  const s = stato || 'bozza'
  if (s === 'accettato' && !pagamentoGestitoDalPiano) {
    if (pagato) {
      return { label: 'pagato', backgroundColor: '#0E9F8E', color: '#fff', fontWeight: '600' as const }
    }
    return { label: 'da incassare', backgroundColor: '#FEF3C7', color: '#B45309', fontWeight: '600' as const }
  }
  if (s === 'accettato') return { label: 'accettato', backgroundColor: '#D1FAE5', color: '#6B7280', fontWeight: '500' as const }
  if (s === 'rifiutato') return { label: 'rifiutato', backgroundColor: '#FEE2E2', color: '#6B7280', fontWeight: '500' as const }
  if (s === 'inviato') return { label: 'inviato', backgroundColor: '#DBEAFE', color: '#6B7280', fontWeight: '500' as const }
  return { label: s, backgroundColor: '#F3F4F6', color: '#6B7280', fontWeight: '500' as const }
}

export function statoBadgeStyle(opts: BadgeOpts): ViewStyle {
  const { backgroundColor } = badgeMeta(opts)
  return { backgroundColor }
}

export function PreventivoStatoBadge({
  stato,
  pagato,
  pagamentoGestitoDalPiano,
  showArrow = false,
}: Props) {
  const meta = badgeMeta({ stato, pagato, pagamentoGestitoDalPiano })

  if (!showArrow) {
    return (
      <View style={[styles.badge, { backgroundColor: meta.backgroundColor }]}>
        <Text style={[styles.text, { color: meta.color, fontWeight: meta.fontWeight }]}>{meta.label}</Text>
      </View>
    )
  }

  return (
    <View style={[styles.badge, styles.badgeConFreccia, { backgroundColor: meta.backgroundColor }]}>
      <Text style={[styles.text, { color: meta.color, fontWeight: meta.fontWeight }]}>{meta.label}</Text>
      <Text style={styles.arrow}>{'\u25BC'}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeConFreccia: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  text: { fontSize: 10 },
  arrow: { fontSize: 10, color: '#9CA3AF' },
})
