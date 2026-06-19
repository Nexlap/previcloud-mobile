import { router } from 'expo-router'
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ModificaPreventivoInput, paramsRouterModifica } from '../../features/modificaPreventivo/apriModificaPreventivo'
import { MODIFICA_VERSIONE_MODAL_SUB } from '../../features/modificaPreventivo/constants'
import { setModificaSession } from '../../features/modificaPreventivo/modificaSession'
import { AppIcon, type AppIconName } from '../icons/AppIcon'
import { nuovoStyles as styles } from '../nuovo/nuovoStyles'

type Props = {
  visible: boolean
  input: ModificaPreventivoInput | null
  onClose: () => void
}

type OpzionePath = '/screens/builder' | '/(tabs)/nuovo' | '/screens/registra'

const OPZIONI: { icon: AppIconName; title: string; sub: string; pathname: OpzionePath }[] = [
  {
    icon: 'list',
    title: 'Builder manuale',
    sub: 'Modifica servizi, rimborsi e pagamento dal form',
    pathname: '/screens/builder',
  },
  {
    icon: 'edit-3',
    title: 'Chat',
    sub: "Descrivi le modifiche all'AI a testo",
    pathname: '/(tabs)/nuovo',
  },
  {
    icon: 'mic',
    title: 'Registra voce',
    sub: 'Parla delle modifiche da fare',
    pathname: '/screens/registra',
  },
]

export function ModificaPreventivoModal({ visible, input, onClose }: Props) {
  function scegli(pathname: OpzionePath) {
    if (!input) return
    setModificaSession(input)
    const params = paramsRouterModifica(input)
    onClose()
    router.push({ pathname, params })
  }

  if (!input) return null

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={modalStyles.overlay} onPress={onClose}>
        <Pressable style={modalStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.sceltaTitolo}>Modifica preventivo</Text>
          <Text style={styles.sceltaSub}>{MODIFICA_VERSIONE_MODAL_SUB}</Text>

          {OPZIONI.map(op => (
            <TouchableOpacity key={op.title} style={styles.sceltaCard} onPress={() => scegli(op.pathname)}>
              <View style={modalStyles.sceltaCardIconWrap}>
                <AppIcon name={op.icon} size={24} color="#0E9F8E" />
              </View>
              <View style={styles.sceltaCardBody}>
                <Text style={styles.sceltaCardTitle}>{op.title}</Text>
                <Text style={styles.sceltaCardSub}>{op.sub}</Text>
              </View>
              <AppIcon name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose}>
            <Text style={modalStyles.cancelText}>Annulla</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 27, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#F7F8FA',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 14,
    paddingBottom: 28,
  },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  sceltaCardIconWrap: { width: 36, alignItems: 'center', justifyContent: 'center' },
})
