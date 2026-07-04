import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { formatImportoEuroVisuale } from 'previcloud-shared'
import { AppIcon } from '../icons/AppIcon'

type Props = {
  disabled: boolean
  totaleConIva: number
  onPress: () => void
  bottomInset?: number
}

function formatTotale(totaleConIva: number) {
  return formatImportoEuroVisuale(totaleConIva)
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
        <View style={styles.generateBtnInner}>
          <AppIcon name="file-text" size={18} color="#fff" />
          <Text style={styles.generateBtnText}>Genera PDF</Text>
        </View>
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
  totalValue: { fontSize: 18, fontWeight: '700', color: '#0B7A6D' },
  generateBtn: { backgroundColor: '#0D1B2A', borderRadius: 16, padding: 16, alignItems: 'center' as const },
  generateBtnDisabled: { opacity: 0.4 },
  generateBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
