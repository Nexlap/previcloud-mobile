import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ClientePreventivo, MetodoPagamento } from '../../api/preventivoPdf'
import { AppIcon } from '../icons/AppIcon'

type ClienteProps = {
  cliente: ClientePreventivo | null
  onPressCliente: () => void
}

export function PreventivoPdfClienteButton({ cliente, onPressCliente }: ClienteProps) {
  return (
    <TouchableOpacity style={styles.clienteBtn} onPress={onPressCliente}>
      <AppIcon name="user" size={20} color="#6B7280" />
      <View style={styles.clienteBtnBody}>
        <Text style={styles.clienteBtnLabel}>Cliente</Text>
        <Text style={styles.clienteBtnVal}>
          {cliente ? cliente.nome : 'Nessuno'}
        </Text>
      </View>
      <Text style={styles.clienteBtnArrow}>{'\u203A'}</Text>
    </TouchableOpacity>
  )
}

type PagamentoProps = {
  metodo: MetodoPagamento
}

export function PreventivoPdfPagamentoInfo({ metodo }: PagamentoProps) {
  return (
    <View style={styles.pagamentoInfo}>
      <AppIcon name="credit-card" size={20} color="#6B7280" />
      <View style={styles.clienteBtnBody}>
        <Text style={styles.clienteBtnLabel}>Pagamento</Text>
        <Text style={styles.clienteBtnVal}>
          {metodo.tipo === 'stripe' ? 'Online con carta' : metodo.nome}
        </Text>
      </View>
    </View>
  )
}

type FooterProps = {
  versionePadreId?: string
  generando: boolean
  testoVuoto: boolean
  onGenera: () => void
}

export function PreventivoPdfFooter({ versionePadreId, generando, testoVuoto, onGenera }: FooterProps) {
  return (
    <>
      {versionePadreId ? (
        <View style={styles.versionBox}>
          <Text style={styles.versionText}>
            Stai creando una nuova versione. La precedente rimane nello storico.
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.generateBtn, (generando || testoVuoto) && styles.generateBtnDisabled]}
        onPress={onGenera}
        disabled={generando || testoVuoto}
      >
        {generando
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.generateBtnText}>Genera PDF</Text>
        }
      </TouchableOpacity>
    </>
  )
}

const styles = StyleSheet.create({
  clienteBtn: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#0D1B2A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  clienteBtnIcon: { fontSize: 20 },
  clienteBtnBody: { flex: 1 },
  clienteBtnLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  clienteBtnVal: { fontSize: 14, color: '#0D1B2A', marginTop: 2 },
  clienteBtnArrow: { fontSize: 20, color: '#9CA3AF' },
  pagamentoInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F8FA', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', gap: 12 },
  versionBox: { backgroundColor: '#EBF3FF', borderRadius: 12, padding: 12 },
  versionText: { fontSize: 13, color: '#1E40ED', lineHeight: 18 },
  generateBtn: { backgroundColor: '#0D1B2A', borderRadius: 14, padding: 16, alignItems: 'center' as const },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})
