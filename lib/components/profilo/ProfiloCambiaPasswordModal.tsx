import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { PROFILO_COLORS as C } from '../../features/profilo/constants'
import { profiloStyles as styles } from './profiloStyles'

type Props = {
  visible: boolean
  passwordAttuale: string
  passwordNuova: string
  passwordConferma: string
  salvando: boolean
  onChangePasswordAttuale: (value: string) => void
  onChangePasswordNuova: (value: string) => void
  onChangePasswordConferma: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}

export function ProfiloCambiaPasswordModal({
  visible,
  passwordAttuale,
  passwordNuova,
  passwordConferma,
  salvando,
  onChangePasswordAttuale,
  onChangePasswordNuova,
  onChangePasswordConferma,
  onClose,
  onConfirm,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.passwordModal}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.passwordModalTitle}>Cambia password</Text>
            <Text style={styles.passwordModalDesc}>
              Inserisci la password attuale e scegli quella nuova.
            </Text>
            <Text style={styles.passwordFieldLabel}>PASSWORD ATTUALE</Text>
            <TextInput
              style={[styles.passwordModalInput, { marginBottom: 10 }]}
              value={passwordAttuale}
              onChangeText={onChangePasswordAttuale}
              placeholder="Password attuale"
              placeholderTextColor={C.muted}
              secureTextEntry
              autoCapitalize="none"
              autoFocus
            />
            <Text style={styles.passwordFieldLabel}>NUOVA PASSWORD</Text>
            <TextInput
              style={[styles.passwordModalInput, { marginBottom: 10 }]}
              value={passwordNuova}
              onChangeText={onChangePasswordNuova}
              placeholder="Almeno 6 caratteri"
              placeholderTextColor={C.muted}
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={styles.passwordFieldLabel}>CONFERMA NUOVA PASSWORD</Text>
            <TextInput
              style={styles.passwordModalInput}
              value={passwordConferma}
              onChangeText={onChangePasswordConferma}
              placeholder="Ripeti la nuova password"
              placeholderTextColor={C.muted}
              secureTextEntry
              autoCapitalize="none"
            />
          </ScrollView>
          <View style={styles.passwordModalActions}>
            <TouchableOpacity style={styles.passwordCancelBtn} onPress={onClose} disabled={salvando}>
              <Text style={styles.passwordCancelText}>Annulla</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.passwordSaveBtn, salvando && styles.deleteAccountBtnDisabled]}
              onPress={onConfirm}
              disabled={salvando}
            >
              {salvando
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.passwordSaveText}>Salva</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}
