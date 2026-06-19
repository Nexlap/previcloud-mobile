import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native'
import { AppIcon, type AppIconName } from './AppIcon'

type Props = {
  icon: AppIconName
  label: string
  color?: string
  danger?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
}

/** Riga icona + testo (Feather, stile desktop). */
export function IconLabel({ icon, label, color = '#0D1B2A', danger, style, textStyle }: Props) {
  const iconColor = danger ? '#EF4444' : color
  return (
    <View style={[styles.row, style]}>
      <AppIcon name={icon} size={16} color={iconColor} />
      <Text style={[styles.label, { color: iconColor }, textStyle]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
})
