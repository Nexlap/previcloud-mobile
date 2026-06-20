import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native'
import {
  CESTINO_GIORNI,
  caricaCestinoAbbonamenti,
  caricaCestinoPreventivi,
  eliminaDefinitivamenteAbbonamenti,
  eliminaDefinitivamentePreventivi,
  giorniRimastiCestino,
  purgeCestinoScaduto,
  ripristinaAbbonamenti,
  ripristinaPreventivi,
  type VoceCestinoAbbonamento,
  type VoceCestinoPreventivo,
} from '../../lib/cestino'
import { messaggioEliminaDefinitiva, messaggioRipristina } from '../../lib/confermeElimina'
import { eventBus } from '../../lib/eventBus'
import { useScreenTheme } from '../../lib/hooks/useScreenTheme'
import { formatImportoEuro } from 'preventivoai-shared'

type TabCestino = 'preventivi' | 'piani'

function etichettaTipoAbbonamento(a: VoceCestinoAbbonamento) {
  const t = a.tipo?.toLowerCase()
  if (t === 'rate') return 'Piano a rate'
  if (t === 'canone') return 'Abbonamento'
  const nome = a.nome?.trim() ?? ''
  if (nome.startsWith('Rate ·')) return 'Piano a rate'
  return 'Abbonamento'
}

function labelGiorniRimasti(deletedAt: string) {
  const n = giorniRimastiCestino(deletedAt)
  return `${n} ${n === 1 ? 'giorno' : 'giorni'}`
}

export default function Cestino() {
  const { s } = useScreenTheme()
  const [tab, setTab] = useState<TabCestino>('preventivi')
  const [preventivi, setPreventivi] = useState<VoceCestinoPreventivo[]>([])
  const [abbonamenti, setAbbonamenti] = useState<VoceCestinoAbbonamento[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const ricarica = useCallback(async () => {
    await purgeCestinoScaduto()
    const [prev, ab] = await Promise.all([caricaCestinoPreventivi(), caricaCestinoAbbonamenti()])
    setPreventivi(prev)
    setAbbonamenti(ab)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => {
    setLoading(true)
    void ricarica()
  }, [ricarica]))

  async function onRefresh() {
    setRefreshing(true)
    await ricarica()
    setRefreshing(false)
  }

  async function handleRipristina(id: string, tipo: 'preventivo' | 'piano') {
    Alert.alert('Ripristina', messaggioRipristina(1, tipo), [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Ripristina',
        onPress: async () => {
          const { error } = tipo === 'preventivo'
            ? await ripristinaPreventivi([id])
            : await ripristinaAbbonamenti([id])
          if (error) { Alert.alert('Errore', error.message); return }
          await ricarica()
          eventBus.emit('aggiorna-home')
          if (tipo === 'piano') eventBus.emit('aggiorna-piano-cliente')
        },
      },
    ])
  }

  async function handleEliminaDefinitiva(id: string, tipo: 'preventivo' | 'piano') {
    Alert.alert('Elimina definitivamente', messaggioEliminaDefinitiva(1, tipo), [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina definitivamente',
        style: 'destructive',
        onPress: async () => {
          const { error } = tipo === 'preventivo'
            ? await eliminaDefinitivamentePreventivi([id])
            : await eliminaDefinitivamenteAbbonamenti([id])
          if (error) { Alert.alert('Errore', error.message); return }
          await ricarica()
        },
      },
    ])
  }

  const listaVuota = tab === 'preventivi' ? preventivi.length === 0 : abbonamenti.length === 0

  return (
    <View style={s.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Elementi eliminati</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0E9F8E" colors={['#0E9F8E']} />
        }
      >
        <Text style={styles.intro}>
          Gli elementi eliminati restano qui per {CESTINO_GIORNI} giorni, poi vengono cancellati definitivamente dal database.
        </Text>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'preventivi' && styles.tabActive]}
            onPress={() => setTab('preventivi')}
          >
            <Text style={[styles.tabText, tab === 'preventivi' && styles.tabTextActive]}>
              Preventivi ({preventivi.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'piani' && styles.tabActive]}
            onPress={() => setTab('piani')}
          >
            <Text style={[styles.tabText, tab === 'piani' && styles.tabTextActive]}>
              Piani e abbonamenti ({abbonamenti.length})
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0E9F8E" style={styles.loader} />
        ) : listaVuota ? (
          <Text style={styles.empty}>Il cestino è vuoto.</Text>
        ) : tab === 'preventivi' ? (
          <View style={styles.list}>
            {preventivi.map(p => (
              <View key={p.id} style={styles.card}>
                <Text style={styles.cardTitle}>{p.titolo || 'Senza titolo'}</Text>
                <Text style={styles.cardSub}>{p.nome_cliente || 'Senza cliente'}</Text>
                {p.importo_totale != null ? (
                  <Text style={styles.cardMeta}>
                    {'\u20AC'}{formatImportoEuro(p.importo_totale, 2)}
                  </Text>
                ) : null}
                <Text style={styles.cardScadenza}>
                  Scade tra {labelGiorniRimasti(p.deleted_at)}
                </Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.btnRipristina}
                    onPress={() => handleRipristina(p.id, 'preventivo')}
                  >
                    <Text style={styles.btnRipristinaText}>Ripristina</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnElimina}
                    onPress={() => handleEliminaDefinitiva(p.id, 'preventivo')}
                  >
                    <Text style={styles.btnEliminaText}>Elimina definitivamente</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.list}>
            {abbonamenti.map(a => (
              <View key={a.id} style={styles.card}>
                <Text style={styles.cardTitle}>{a.nome || 'Senza nome'}</Text>
                <Text style={styles.cardSub}>{etichettaTipoAbbonamento(a)}</Text>
                <Text style={styles.cardMeta}>{a.clienti?.nome || 'Cliente'}</Text>
                <Text style={styles.cardScadenza}>
                  Scade tra {labelGiorniRimasti(a.deleted_at)}
                </Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.btnRipristina}
                    onPress={() => handleRipristina(a.id, 'piano')}
                  >
                    <Text style={styles.btnRipristinaText}>Ripristina</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnElimina}
                    onPress={() => handleEliminaDefinitiva(a.id, 'piano')}
                  >
                    <Text style={styles.btnEliminaText}>Elimina definitivamente</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0D1B2A',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { color: '#fff', fontSize: 22, width: 32 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 32 },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  intro: { fontSize: 13, lineHeight: 20, color: '#6B7280' },
  tabs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabActive: { backgroundColor: '#0E9F8E', borderColor: '#0E9F8E' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#fff' },
  loader: { marginTop: 32 },
  empty: { marginTop: 16, fontSize: 14, color: '#9CA3AF' },
  list: { gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    gap: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  cardSub: { fontSize: 13, color: '#6B7280' },
  cardMeta: { fontSize: 13, color: '#0D1B2A', fontWeight: '500' },
  cardScadenza: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  btnRipristina: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0E9F8E',
  },
  btnRipristinaText: { fontSize: 13, fontWeight: '600', color: '#0E9F8E' },
  btnElimina: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
  },
  btnEliminaText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
})
