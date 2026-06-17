import { ActivityIndicator, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { PROFILO_COLORS as C } from '../../features/profilo/constants'
import { profiloStyles as styles } from './profiloStyles'

type Props = {
  visible: boolean
  password: string
  verificando: boolean
  onChangePassword: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}

export function ProfiloPasswordModal({ visible, password, verificando, onChangePassword, onClose, onConfirm }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.passwordModal}>
          <Text style={styles.passwordModalTitle}>Conferma identita</Text>
          <Text style={styles.passwordModalDesc}>
            Inserisci la password attuale per eliminare definitivamente l'account.
          </Text>
          <TextInput
            style={styles.passwordModalInput}
            value={password}
            onChangeText={onChangePassword}
            placeholder="Password attuale"
            placeholderTextColor={C.muted}
            secureTextEntry
            autoCapitalize="none"
          />
          <View style={styles.passwordModalActions}>
            <TouchableOpacity style={styles.passwordCancelBtn} onPress={onClose} disabled={verificando}>
              <Text style={styles.passwordCancelText}>Annulla</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.passwordConfirmBtn, verificando && styles.deleteAccountBtnDisabled]}
              onPress={onConfirm}
              disabled={verificando}
            >
              {verificando
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.passwordConfirmText}>Conferma</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}
