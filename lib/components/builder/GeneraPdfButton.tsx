import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type Props = {
  disabled: boolean
  totaleConIva: number
  onPress: () => void
  bottomInset?: number
}

function formatTotale(totaleConIva: number) {
  return totaleConIva % 1 === 0 ? totaleConIva.toFixed(0) : totaleConIva.toFixed(2)
}

export function GeneraPdfButton({ disabled, totaleConIva, onPress, bottomInset = 0 }: Props) {
  const totaleFormatted = formatTotale(totaleConIva)

  return (
    <View
      style={[styles.footer, { paddingBottom: Math.max(bottomInset, 12) }]}
    >
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Totale:</Text>
        <Text style={styles.totalValue}>€{totaleFormatted}</Text>
      </View>
      <TouchableOpacity style={[styles.generateBtn, disabled && styles.generateBtnDisabled]} onPress={onPress} disabled={disabled}>
        <Text style={styles.generateBtnText}>
          📄 Genera PDF
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  totalValue: { fontSize: 18, fontWeight: '700', color: '#0E9F8E' },
  generateBtn: { backgroundColor: '#0D1B2A', borderRadius: 16, padding: 16, alignItems: 'center' as const },
  generateBtnDisabled: { opacity: 0.4 },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
