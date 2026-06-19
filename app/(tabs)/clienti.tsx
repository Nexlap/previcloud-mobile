import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native'
import { eliminaClienti } from '../../lib/api/clienti'
import { ClienteModificaModal, clienteToModificaForm, type ClienteModificaForm } from '../../lib/components/clienti/ClienteModificaModal'
import { ClienteNuovoModal } from '../../lib/components/clienti/ClienteNuovoModal'
import { MenuAzioniSheet } from '../../lib/components/MenuAzioniSheet'
import { LongPressAwareTouchableOpacity } from '../../lib/components/LongPressAwarePressable'
import { useAnnullaSelezioneOnAndroidBack } from '../../lib/hooks/useAnnullaSelezioneOnAndroidBack'
import { useClienti } from "../../lib/hooks/useClienti"
import { Cliente } from '../../lib/types'
import { formatImportoEuro } from '../../lib/utils/importo'
import { trackEvento } from "../../lib/utils/analytics"
import { AppIcon } from '../../lib/components/icons/AppIcon'
import { useScreenTheme } from '../../lib/hooks/useScreenTheme'

export default function Clienti() {
  const { colors, isDark, s } = useScreenTheme()
  const { clienti, loading, refreshing, onRefresh, aggiungiCliente, eliminaCliente, aggiornaCliente } = useClienti()
  const [cerca, setCerca] = useState('')
  const [mostraForm, setMostraForm] = useState(false)
  const [nuovoCliente, setNuovoCliente] = useState({ nome: '', telefono: '', email: '', note: '' })
  const [salvando, setSalvando] = useState(false)
  const [selezioneAttiva, setSelezioneAttiva] = useState(false)
  const [clientiSelezionati, setClientiSelezionati] = useState<string[]>([])
  const [clientiEliminati, setClientiEliminati] = useState<string[]>([])
  const [menuCliente, setMenuCliente] = useState<Cliente | null>(null)
  const [clienteModifica, setClienteModifica] = useState<Cliente | null>(null)
  const [datiModifica, setDatiModifica] = useState<ClienteModificaForm>({ nome: '', telefono: '', email: '', note: '' })
  const [salvandoModifica, setSalvandoModifica] = useState(false)

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

  useAnnullaSelezioneOnAndroidBack(selezioneAttiva, annullaSelezione)

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

  function apriModificaCliente(c: Cliente) {
    setClienteModifica(c)
    setDatiModifica(clienteToModificaForm(c))
  }

  async function salvaModificaCliente() {
    if (!clienteModifica) return
    setSalvandoModifica(true)
    const ok = await aggiornaCliente(clienteModifica.id, datiModifica)
    setSalvandoModifica(false)
    if (ok) setClienteModifica(null)
  }

  function eliminaSingoloCliente(c: Cliente) {
    Alert.alert('Elimina', `Eliminare ${c.nome}? Verranno eliminati anche preventivi e dati collegati.`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        const ok = await eliminaCliente(c.id)
        if (ok) setClientiEliminati(prev => [...prev, c.id])
      }},
    ])
  }

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color="#0E9F8E" />
    </View>
  )

  return (
    <View style={s.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clienti</Text>
        <TouchableOpacity onPress={apriModalNuovoCliente} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: selezioneAttiva ? 120 : 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0E9F8E" colors={["#0E9F8E"]} />}
      >
        {/* Barra ricerca */}
        <View style={s.searchBox}>
          <AppIcon name="search" size={16} color={colors.icon} />
          <TextInput
            style={s.searchInput}
            value={cerca}
            onChangeText={setCerca}
            onFocus={handleFocusRicerca}
            placeholder="Cerca per nome o telefono..."
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {clientiFiltrati.length === 0 ? (
          <View style={styles.empty}>
            <AppIcon name="users" size={40} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{cerca ? 'Nessun cliente trovato' : 'Nessun cliente ancora'}</Text>
            {!cerca && <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Tocca + per aggiungere il primo cliente</Text>}
          </View>
        ) : (
          clientiFiltrati.map(c => {
            const selezionato = clientiSelezionati.includes(c.id)
            return (
            <LongPressAwareTouchableOpacity
              key={c.id}
              style={[
                s.card,
                styles.clienteCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                selezionato && { borderColor: '#0E9F8E', backgroundColor: isDark ? 'rgba(14,159,142,0.12)' : '#F0FDF4' },
              ]}
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
                <Text style={[styles.clienteNome, { color: colors.text }]}>{c.nome}</Text>
                <Text style={[styles.clienteInfo, { color: colors.textMuted }]}>{c.telefono || c.email || 'Nessun contatto'}</Text>
              </View>
              <View style={styles.clienteStats}>
                <Text style={[styles.clienteStatVal, { color: colors.text }]}>{c.num_preventivi || 0}</Text>
                <Text style={[styles.clienteStatLabel, { color: colors.textMuted }]}>preventivi</Text>
                {(c.totale_preventivi || 0) > 0 && (
                  <Text style={styles.clienteStatImporto}>€{formatImportoEuro(c.totale_preventivi ?? 0, 0)}</Text>
                )}
              </View>
              {!selezioneAttiva ? (
                <TouchableOpacity
                  style={styles.menuBtn}
                  hitSlop={8}
                  onPress={() => setMenuCliente(c)}
                >
                  <Text style={[styles.menuPuntini, { color: colors.textMuted }]}>{'\u22EE'}</Text>
                </TouchableOpacity>
              ) : null}
            </LongPressAwareTouchableOpacity>
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

      <ClienteModificaModal
        visible={clienteModifica !== null}
        dati={datiModifica}
        salvando={salvandoModifica}
        onClose={() => setClienteModifica(null)}
        onChange={updater => setDatiModifica(prev => updater(prev))}
        onSalva={salvaModificaCliente}
      />

      <MenuAzioniSheet
        variant="dock"
        visible={menuCliente !== null}
        onClose={() => setMenuCliente(null)}
        voci={menuCliente ? [
          { label: 'Modifica', onPress: () => apriModificaCliente(menuCliente) },
          { label: 'Elimina', onPress: () => eliminaSingoloCliente(menuCliente), danger: true },
        ] : []}
      />

      <MenuAzioniSheet
        variant="dock"
        visible={selezioneAttiva}
        titolo={`${clientiSelezionati.length} selezionati`}
        onClose={annullaSelezione}
        voci={[
          { label: 'Elimina', onPress: eliminaClientiSelezionati, danger: true },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#0D1B2A', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#0E9F8E', justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 20, fontWeight: '300' },
  scroll: { flex: 1 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500' },
  emptySubtext: { fontSize: 13, marginTop: 4 },
  clienteCard: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  clienteAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center' },
  clienteAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  clienteBody: { flex: 1 },
  clienteNome: { fontSize: 15, fontWeight: '600' },
  clienteInfo: { fontSize: 12, marginTop: 2 },
  clienteStats: { alignItems: 'flex-end' },
  clienteStatVal: { fontSize: 18, fontWeight: '700' },
  clienteStatLabel: { fontSize: 10 },
  clienteStatImporto: { fontSize: 12, color: '#0E9F8E', fontWeight: '600', marginTop: 2 },
  menuBtn: { paddingHorizontal: 4, paddingVertical: 8 },
  menuPuntini: { fontSize: 22, lineHeight: 24 },
})
