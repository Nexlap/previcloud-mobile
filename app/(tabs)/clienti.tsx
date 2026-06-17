import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native'
import { eliminaClienti } from '../../lib/api/clienti'
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

  async function handleAggiungi() {
    setSalvando(true)
    const ok = await aggiungiCliente(nuovoCliente)
    if (ok) {
      setNuovoCliente({ nome: '', telefono: '', email: '', note: '' })
      setMostraForm(false)
    }
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
    Alert.alert('Elimina', `Eliminare ${ids.length} clienti?`, [
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
        <TouchableOpacity onPress={() => setMostraForm(!mostraForm)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>{mostraForm ? '✕' : '+'}</Text>
        </TouchableOpacity>
      </View>

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
            placeholder="Cerca per nome o telefono..."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Form nuovo cliente */}
        {mostraForm && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nuovo cliente</Text>
            <TextInput style={styles.input} value={nuovoCliente.nome}
              onChangeText={v => setNuovoCliente(c => ({ ...c, nome: v }))}
              placeholder="Nome e cognome *" placeholderTextColor="#9CA3AF" />
            <TextInput style={styles.input} value={nuovoCliente.telefono}
              onChangeText={v => setNuovoCliente(c => ({ ...c, telefono: v }))}
              placeholder="Telefono" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
            <TextInput style={styles.input} value={nuovoCliente.email}
              onChangeText={v => setNuovoCliente(c => ({ ...c, email: v }))}
              placeholder="Email" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
              value={nuovoCliente.note}
              onChangeText={v => setNuovoCliente(c => ({ ...c, note: v }))}
              placeholder="Note..." placeholderTextColor="#9CA3AF" multiline />
            <TouchableOpacity style={[styles.saveBtn, salvando && styles.saveBtnDisabled]} onPress={handleAggiungi} disabled={salvando}>
              {salvando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Salva cliente</Text>}
            </TouchableOpacity>
          </View>
        )}

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

        <View style={{ height: selezioneAttiva ? 120 : 40 }} />
      </ScrollView>

      {selezioneAttiva && (
        <View style={styles.selectionBar}>
          <View style={styles.selectionTopRow}>
            <Text style={styles.selectionCount}>{clientiSelezionati.length} selezionati</Text>
            <TouchableOpacity onPress={annullaSelezione}>
              <Text style={styles.selectionCancel}>✕ Annulla</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.selectionActions}>
            <TouchableOpacity style={styles.selectionActionBtn} onPress={eliminaClientiSelezionati}>
              <Text style={styles.selectionActionText}>🗑 Elimina</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  input: { backgroundColor: '#F7F8FA', borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 10, fontSize: 14, color: '#0D1B2A' },
  saveBtn: { backgroundColor: '#0D1B2A', borderRadius: 10, padding: 12, alignItems: 'center' as const },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
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
  selectionBar: { position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: '#0D1B2A', borderRadius: 16, padding: 12, gap: 10 },
  selectionTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectionCount: { color: '#fff', fontSize: 14, fontWeight: '600' },
  selectionCancel: { color: '#9EC5C0', fontSize: 13, fontWeight: '600' },
  selectionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectionActionBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9 },
  selectionActionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
})
