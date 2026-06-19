import { StyleSheet, Text, View } from 'react-native'
import { AppIcon, type AppIconName } from '../icons/AppIcon'

type Props = {
  icon: AppIconName
  title: string
  description: string
}

export function PianoVuotoState({ icon, title, description }: Props) {
  return (
    <View style={styles.wrap}>
      <AppIcon name={icon} size={40} color="#9CA3AF" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24, gap: 10 },
  title: { fontSize: 16, fontWeight: '700', color: '#0D1B2A', textAlign: 'center' },
  description: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
})
