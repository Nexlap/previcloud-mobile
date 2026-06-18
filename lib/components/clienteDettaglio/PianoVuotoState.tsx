import { StyleSheet, Text, View } from 'react-native'

type Props = {
  emoji: string
  title: string
  description: string
}

export function PianoVuotoState({ emoji, title, description }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24, gap: 10 },
  emoji: { fontSize: 40 },
  title: { fontSize: 16, fontWeight: '700', color: '#0D1B2A', textAlign: 'center' },
  description: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
})
