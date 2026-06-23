import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from 'react-native'
import { STATI_PREVENTIVO } from '../../features/storico/constants'
import { StatoPreventivoIcon } from '../icons/StatoPreventivoIcon'
import { PreventivoSegnaPagatoSection } from '../preventivo/PreventivoSegnaPagatoSection'
import { Cliente } from '../../types'
import { storicoStyles as styles } from './storicoStyles'

type Props = {
  modalStato: string | null
  onCloseStato: () => void
  onChangeStato: (preventivoId: string, stato: string) => void
  preventivoStatoCorrente?: string | null
  preventivoPagato?: boolean
  preventivoDataPagamento?: string | null
  mostraTogglePagato?: boolean
  onTogglePagato?: (pagato: boolean, dataPagamento?: string) => Promise<void> | void
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
  preventivoStatoCorrente,
  preventivoPagato = false,
  preventivoDataPagamento = null,
  mostraTogglePagato = false,
  onTogglePagato,
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
          <TouchableOpacity style={styles.modalBox} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.modalTitle}>Cambia stato</Text>
            {STATI_PREVENTIVO.map(s => (
              <TouchableOpacity
                key={s}
                style={styles.modalOption}
                onPress={() => {
                  if (!modalStato) return
                  onChangeStato(modalStato, s)
                  const restaAperto = s === 'accettato' && mostraTogglePagato
                  if (!restaAperto) onCloseStato()
                }}
              >
                <View style={styles.modalOptionIcon}>
                  <StatoPreventivoIcon stato={s} size={20} />
                </View>
                <Text style={styles.modalOptionText}>{s}</Text>
              </TouchableOpacity>
            ))}
            {mostraTogglePagato && preventivoStatoCorrente === 'accettato' && onTogglePagato ? (
              <PreventivoSegnaPagatoSection
                pagato={preventivoPagato}
                dataPagamento={preventivoDataPagamento}
                onTogglePagato={onTogglePagato}
                onPagatoConfermato={onCloseStato}
              />
            ) : null}
            <TouchableOpacity style={styles.modalCancel} onPress={onCloseStato}>
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </TouchableOpacity>
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
