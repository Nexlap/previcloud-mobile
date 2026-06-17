import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native'
import { eliminaClienti } from '../../lib/api/clienti'
import { ClienteNuovoModal } from '../../lib/components/clienti/ClienteNuovoModal'
import { ClienteSelectionBar } from '../../lib/components/clienteDettaglio/ClienteOverview'
import { useClienti } from "../../lib/hooks/useClienti"
import { trackEvento } from "../../lib/utils/analytics"

export default function Clienti() {
  const { clienti, loading, refreshing, onRefresh, aggiungiCliente } = useClienti()
  const [cerca, setCerca] = useState('')
  const [mostraForm, setMostraForm] = useState(false)
  const [nuovoCliente, setNuovoCliente] = useState({ nome: '', telefono: '', email: '', note: '' })
  const [salvando, setSalvando] = useState(false)
  const [selezioneAttiva, setSelezioneAttiva] = useState(false)
  const [clientiSelezionati, setClientiSelezionati] = useState<string[]>([])
  const [clientiEliminati, setClientiEliminati] = useState<string[]>([])

  useFocusEffect(useCallback(() => {
    trackEvento('clienti_aperti', 'clienti')
  }, []))

  function chiudiModalNuovoCliente() {
    setMostraForm(false)
    setNuovoCliente({ nome: '', telefono: '', email: '', note: '' })
  }

  function apriModalNuovoCliente() {
    if (selezioneAttiva) annullaSelezione()
    setMostraForm(true)
  }

  function handleFocusRicerca() {
    if (selezioneAttiva) annullaSelezione()
  }

  async function handleAggiungi() {
    setSalvando(true)
    const ok = await aggiungiCliente(nuovoCliente)
    if (ok) chiudiModalNuovoCliente()
    setSalvando(false)
  }

  const clientiVisibili = clienti.filter(c => !clientiEliminati.includes(c.id))

  const clientiFiltrati = clientiVisibili.filter(c =>
    c.nome.toLowerCase().includes(cerca.toLowerCase()) ||
    (c.telefono || '').includes(cerca)
  )

  function toggleSelezione(id: string) {
    setClientiSelezionati(ids => {
      const prossimi = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
      if (prossimi.length === 0) setSelezioneAttiva(false)
      return prossimi
    })
  }

  function avviaSelezione(id: string) {
    setSelezioneAttiva(true)
    setClientiSelezionati(ids => ids.includes(id) ? ids : [...ids, id])
  }

  function annullaSelezione() {
    setSelezioneAttiva(false)
    setClientiSelezionati([])
  }

  async function eliminaClientiSelezionati() {
    const ids = [...clientiSelezionati]
    if (ids.length === 0) return
    Alert.alert('Elimina', `Eliminare ${ids.length} clienti? Verranno eliminati anche preventivi, abbonamenti e rate collegati.`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        const { error } = await eliminaClienti(ids)
        if (error) { Alert.alert('Errore', error.message); return }
        setClientiEliminati(prev => [...prev, ...ids])
        annullaSelezione()
      }}
    ])
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#0E9F8E" />
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clienti</Text>
        <TouchableOpacity onPress={apriModalNuovoCliente} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {selezioneAttiva && (
        <ClienteSelectionBar
          count={clientiSelezionati.length}
          onCancel={annullaSelezione}
          onDelete={eliminaClientiSelezionati}
        />
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0E9F8E" colors={["#0E9F8E"]} />}
      >
        {/* Barra ricerca */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={cerca}
            onChangeText={setCerca}
            onFocus={handleFocusRicerca}
            placeholder="Cerca per nome o telefono..."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Lista clienti */}
        {clientiFiltrati.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>{cerca ? 'Nessun cliente trovato' : 'Nessun cliente ancora'}</Text>
            {!cerca && <Text style={styles.emptySubtext}>Tocca + per aggiungere il primo cliente</Text>}
          </View>
        ) : (
          clientiFiltrati.map(c => {
            const selezionato = clientiSelezionati.includes(c.id)
            return (
            <TouchableOpacity
              key={c.id}
              style={[styles.clienteCard, selezionato && styles.clienteCardSelected]}
              onLongPress={() => avviaSelezione(c.id)}
              onPress={() => {
                if (selezioneAttiva) toggleSelezione(c.id)
                else router.push({ pathname: '/screens/cliente-dettaglio', params: { id: c.id, nome: c.nome } })
              }}
            >
              <View style={styles.clienteAvatar}>
                <Text style={styles.clienteAvatarText}>{c.nome.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.clienteBody}>
                <Text style={styles.clienteNome}>{c.nome}</Text>
                <Text style={styles.clienteInfo}>{c.telefono || c.email || 'Nessun contatto'}</Text>
              </View>
              <View style={styles.clienteStats}>
                <Text style={styles.clienteStatVal}>{c.num_preventivi || 0}</Text>
                <Text style={styles.clienteStatLabel}>preventivi</Text>
                {(c.totale_preventivi || 0) > 0 && (
                  <Text style={styles.clienteStatImporto}>€{c.totale_preventivi?.toFixed(0)}</Text>
                )}
              </View>
            </TouchableOpacity>
            )
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <ClienteNuovoModal
        visible={mostraForm}
        dati={nuovoCliente}
        salvando={salvando}
        onClose={chiudiModalNuovoCliente}
        onChange={setNuovoCliente}
        onSalva={handleAggiungi}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#0D1B2A', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#0E9F8E', justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 20, fontWeight: '300' },
  scroll: { flex: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14, color: '#0D1B2A' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  emptySubtext: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  clienteCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  clienteAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center' },
  clienteAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  clienteBody: { flex: 1 },
  clienteNome: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  clienteInfo: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  clienteStats: { alignItems: 'flex-end' },
  clienteStatVal: { fontSize: 18, fontWeight: '700', color: '#0D1B2A' },
  clienteStatLabel: { fontSize: 10, color: '#9CA3AF' },
  clienteStatImporto: { fontSize: 12, color: '#0E9F8E', fontWeight: '600', marginTop: 2 },
  clienteCardSelected: { borderColor: '#0E9F8E', backgroundColor: '#F0FDF4' },
})
