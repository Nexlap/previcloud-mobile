import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from 'react-native'
import { STATI_PREVENTIVO, statoPreventivoIcon } from '../../features/storico/constants'
import { Cliente } from '../../types'
import { storicoStyles as styles } from './storicoStyles'

type Props = {
  modalStato: string | null
  onCloseStato: () => void
  onChangeStato: (preventivoId: string, stato: string) => void
  modalStatoMultiplo: boolean
  onCloseStatoMultiplo: () => void
  onChangeStatoMultiplo: (stato: string) => void
  modalClienti: boolean
  onCloseClienti: () => void
  clienti: Cliente[]
  caricandoClienti: boolean
  onSpostaCliente: (cliente: Cliente) => void
}

export function StoricoModals({
  modalStato,
  onCloseStato,
  onChangeStato,
  modalStatoMultiplo,
  onCloseStatoMultiplo,
  onChangeStatoMultiplo,
  modalClienti,
  onCloseClienti,
  clienti,
  caricandoClienti,
  onSpostaCliente,
}: Props) {
  return (
    <>
      <Modal visible={modalStato !== null} transparent animationType="fade" onRequestClose={onCloseStato}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onCloseStato}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Cambia stato</Text>
            {STATI_PREVENTIVO.map(s => (
              <TouchableOpacity key={s} style={styles.modalOption} onPress={() => {
                if (modalStato) onChangeStato(modalStato, s)
                onCloseStato()
              }}>
                <Text style={styles.modalOptionIcon}>{statoPreventivoIcon(s)}</Text>
                <Text style={styles.modalOptionText}>{s}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={onCloseStato}>
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalStatoMultiplo} transparent animationType="fade" onRequestClose={onCloseStatoMultiplo}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onCloseStatoMultiplo}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Cambia stato</Text>
            {STATI_PREVENTIVO.map(s => (
              <TouchableOpacity key={s} style={styles.modalOption} onPress={() => onChangeStatoMultiplo(s)}>
                <Text style={styles.modalOptionIcon}>{statoPreventivoIcon(s)}</Text>
                <Text style={styles.modalOptionText}>{s}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={onCloseStatoMultiplo}>
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalClienti} transparent animationType="slide" onRequestClose={onCloseClienti}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Sposta cliente</Text>
            {caricandoClienti ? (
              <ActivityIndicator color="#0E9F8E" />
            ) : clienti.length === 0 ? (
              <Text style={styles.emptyText}>Nessun cliente disponibile.</Text>
            ) : (
              clienti.map(cliente => (
                <TouchableOpacity key={cliente.id} style={styles.modalOption} onPress={() => onSpostaCliente(cliente)}>
                  <Text style={styles.modalOptionText}>{cliente.nome}</Text>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity style={styles.modalCancel} onPress={onCloseClienti}>
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}
