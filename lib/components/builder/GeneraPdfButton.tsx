import { StyleSheet, Text, TouchableOpacity } from 'react-native'

type Props = {
  disabled: boolean
  totaleConIva: number
  onPress: () => void
}

export function GeneraPdfButton({ disabled, totaleConIva, onPress }: Props) {
  return (
    <TouchableOpacity style={[styles.generateBtn, disabled && styles.generateBtnDisabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.generateBtnText}>
        📄 Genera PDF — €{totaleConIva % 1 === 0 ? totaleConIva.toFixed(0) : totaleConIva.toFixed(2)}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  generateBtn: { backgroundColor: '#0D1B2A', borderRadius: 16, padding: 16, alignItems: 'center' as const },
  generateBtnDisabled: { opacity: 0.4 },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
