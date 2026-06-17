import { StyleSheet } from 'react-native'

export const abbonamentoSelectionStyles = StyleSheet.create({
  selectionBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: '#0D1B2A',
    borderRadius: 16,
    padding: 12,
    gap: 10,
    zIndex: 20,
  },
  selectionTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectionCount: { color: '#fff', fontSize: 14, fontWeight: '600' },
  selectionCancel: { color: '#9EC5C0', fontSize: 13, fontWeight: '600' },
  selectionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectionActionBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9 },
  selectionActionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
})
