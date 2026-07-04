import type { ReactNode } from 'react'
import { StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { AppIcon, type AppIconName } from '../icons/AppIcon'

type Props = {
  icon: AppIconName
  title: string
  subtitle?: string
  accent?: boolean
  right?: ReactNode
  style?: ViewStyle
}

export function BuilderSectionHeader({ icon, title, subtitle, accent, right, style }: Props) {
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.iconCircle, accent && styles.iconCircleAccent]}>
        <AppIcon name={icon} size={18} color={accent ? '#0B7A6D' : '#0D1B2A'} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  )
}

export const builderCardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
    shadowColor: '#0D1B2A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  cardSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
})

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F8FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleAccent: {
    backgroundColor: 'rgba(14, 159, 142, 0.1)',
  },
  textCol: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: '700', color: '#0B7A6D' },
  subtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2, lineHeight: 16 },
  right: { alignSelf: 'center', marginLeft: 4 },
})
