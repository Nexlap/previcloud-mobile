import { Text, TextInput, TouchableOpacity, View } from 'react-native'
import { ClienteSuggerito, DatiClienteNuovo } from '../../features/nuovo/types'
import { AppIcon } from '../icons/AppIcon'
import { nuovoStyles as styles } from './nuovoStyles'

type Props = {
  visible: boolean
  clientiSuggeriti: ClienteSuggerito[]
  nomeClienteNuovo: string
  datiClienteNuovo: DatiClienteNuovo
  mostraFormDatiCliente: boolean
  onClose: () => void
  onSelectCliente: (cliente: ClienteSuggerito) => void
  onMostraFormDati: () => void
  onNascondiFormDati: () => void
  onDatiClienteChange: (dati: DatiClienteNuovo) => void
  onCreaCliente: () => void
}

export function NuovoClienteModal({
  visible,
  clientiSuggeriti,
  nomeClienteNuovo,
  datiClienteNuovo,
  mostraFormDatiCliente,
  onClose,
  onSelectCliente,
  onMostraFormDati,
  onNascondiFormDati,
  onDatiClienteChange,
  onCreaCliente,
}: Props) {
  if (!visible) return null

  return (
    <View style={styles.clienteModalOverlay}>
      <View style={styles.clienteModalBox}>
        {clientiSuggeriti.length > 1 ? (
          <>
            <Text style={styles.clienteModalTitolo}>Chi è il cliente?</Text>
            <Text style={styles.clienteModalSub}>Ho trovato più clienti con questo nome</Text>
            {clientiSuggeriti.map(c => (
              <TouchableOpacity key={c.id} style={styles.clienteModalOption} onPress={() => onSelectCliente(c)}>
                <Text style={styles.clienteModalOptionNome}>{c.nome}</Text>
                {c.email && <Text style={styles.clienteModalOptionInfo}>{c.email}</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.clienteModalSkip} onPress={onClose}>
              <Text style={styles.clienteModalSkipText}>Nessuno di questi</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.clienteModalTitolo}>Cliente non trovato</Text>
            <Text style={styles.clienteModalSub}>"{nomeClienteNuovo}" non è in rubrica. Vuoi aggiungerlo?</Text>
            {!mostraFormDatiCliente ? (
              <>
                <TouchableOpacity style={[styles.clienteModalBtn, styles.clienteModalBtnRow]} onPress={onMostraFormDati}>
                  <AppIcon name="plus" size={15} color="#fff" />
                  <Text style={styles.clienteModalBtnText}>Sì, aggiungi con dati</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.clienteModalBtn, styles.clienteModalBtnRow]} onPress={onCreaCliente}>
                  <AppIcon name="check" size={15} color="#fff" />
                  <Text style={styles.clienteModalBtnText}>Sì, solo il nome</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.clienteModalSkip} onPress={onClose}>
                  <Text style={styles.clienteModalSkipText}>No, continua senza</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {[
                  { placeholder: 'Telefono', key: 'telefono' as const, keyboard: 'phone-pad' as const },
                  { placeholder: 'Email', key: 'email' as const, keyboard: 'email-address' as const },
                  { placeholder: 'Indirizzo', key: 'indirizzo' as const, keyboard: 'default' as const },
                ].map(f => (
                  <TextInput
                    key={f.key}
                    style={styles.clienteModalInput}
                    placeholder={f.placeholder}
                    placeholderTextColor="#9CA3AF"
                    value={datiClienteNuovo[f.key]}
                    onChangeText={v => onDatiClienteChange({ ...datiClienteNuovo, [f.key]: v })}
                    keyboardType={f.keyboard}
                    autoCapitalize={f.keyboard === 'email-address' ? 'none' : 'sentences'}
                  />
                ))}
                <TouchableOpacity style={styles.clienteModalBtn} onPress={onCreaCliente}>
                  <Text style={styles.clienteModalBtnText}>Salva e continua</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.clienteModalSkip} onPress={() => { onNascondiFormDati(); onCreaCliente() }}>
                  <Text style={styles.clienteModalSkipText}>Salta i dati</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </View>
    </View>
  )
}
