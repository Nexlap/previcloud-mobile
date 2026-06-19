import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export type VoceMenuAzione = {
  label: string
  onPress: () => void
  danger?: boolean
  hidden?: boolean
}

type Props = {
  visible: boolean
  voci: VoceMenuAzione[]
  onClose: () => void
  titolo?: string
  /** dock = barra fissa in basso (selezione multipla); portal = stesso stile ma in Modal trasparente (menu ⋮) */
  variant?: 'dock' | 'portal'
}

function DockSheetBody({
  titolo,
  visibili,
  onClose,
  paddingBottom,
}: {
  titolo?: string
  visibili: VoceMenuAzione[]
  onClose: () => void
  paddingBottom: number
}) {
  return (
    <View style={[styles.dockSheet, { paddingBottom }]}>
      <View style={styles.dockHeader}>
        <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.dockCloseBtn}>
          <Text style={styles.dockCloseText}>{'\u2715'}</Text>
        </TouchableOpacity>
        {titolo ? (
          <Text style={styles.dockTitolo} numberOfLines={1}>{titolo}</Text>
        ) : (
          <View style={styles.dockTitoloSpacer} />
        )}
        <View style={styles.dockCloseBtn} />
      </View>
      <View style={styles.dockActions}>
        {visibili.map(v => (
          <TouchableOpacity
            key={v.label}
            style={[styles.dockPill, v.danger && styles.dockPillDanger]}
            onPress={() => {
              onClose()
              v.onPress()
            }}
          >
            <Text style={[styles.dockPillTesto, v.danger && styles.dockPillTestoDanger]}>{v.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

export function MenuAzioniSheet({ visible, voci, onClose, titolo, variant = 'portal' }: Props) {
  const insets = useSafeAreaInsets()
  const visibili = voci.filter(v => !v.hidden)
  const paddingBottom = Math.max(insets.bottom, 12)

  if (!visible || visibili.length === 0) return null

  const sheet = (
    <DockSheetBody
      titolo={titolo}
      visibili={visibili}
      onClose={onClose}
      paddingBottom={paddingBottom}
    />
  )

  if (variant === 'dock') {
    return (
      <View style={styles.dockContainer} pointerEvents="box-none">
        {sheet}
      </View>
    )
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.portalRoot} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.portalSheetWrap} pointerEvents="box-none">
          {sheet}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  portalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  portalSheetWrap: {
    justifyContent: 'flex-end',
  },
  dockContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 10,
  },
  dockSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingTop: 6,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  dockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dockCloseBtn: {
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockCloseText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  dockTitolo: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  dockTitoloSpacer: {
    flex: 1,
  },
  dockActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingBottom: 4,
  },
  dockPill: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dockPillDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  dockPillTesto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  dockPillTestoDanger: {
    color: '#DC2626',
  },
})
