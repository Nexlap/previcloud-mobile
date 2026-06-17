import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native'
import PreviewPaginata from '../PreviewPaginata'
import { PREVIEW_HEIGHT, PREVIEW_WIDTH } from '../../features/preventivoPdf/constants'

type Props = {
  htmlPreview: string
  caricandoPreview: boolean
}

export function PreventivoPdfPreviewCard({ htmlPreview, caricandoPreview }: Props) {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={styles.cardTitle}>Anteprima PDF</Text>
        {caricandoPreview && <ActivityIndicator size="small" color="#0E9F8E" />}
      </View>
      <View style={styles.previewContainer}>
        {htmlPreview ? (
          <PreviewPaginata htmlContent={htmlPreview} width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT} borderRadius={12} />
        ) : (
          <View style={[styles.previewPlaceholder, { height: PREVIEW_HEIGHT }]}>
            <ActivityIndicator size="large" color="#0E9F8E" />
            <Text style={styles.previewPlaceholderText}>Caricamento anteprima...</Text>
          </View>
        )}
      </View>
    </View>
  )
}

type ToastProps = {
  visible: boolean
  opacity: Animated.Value
}

export function PreventivoPdfToast({ visible, opacity }: ToastProps) {
  if (!visible) return null
  return (
    <Animated.View style={[styles.toast, { opacity }]}>
      <Text style={styles.toastText}>Preventivo salvato</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  previewContainer: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  previewPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  previewPlaceholderText: { fontSize: 13, color: '#9CA3AF' },
  toast: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#065F46', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
