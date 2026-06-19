import { StyleSheet, Text, TouchableOpacity } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

type Props = {
  onPress: () => void
  onLongPress?: () => void
}

export function InviaFirmaChip({ onPress, onLongPress }: Props) {
  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.75}
      accessibilityLabel="Invia firma"
    >
      <MaterialCommunityIcons name="signature-freehand" size={13} color="#0D1B2A" />
      <Text style={styles.label}>Invia firma</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(13, 27, 42, 0.2)',
    backgroundColor: 'rgba(13, 27, 42, 0.07)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0D1B2A',
  },
})
