import * as FileSystem from 'expo-file-system/legacy'
import { router, useFocusEffect } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator, Alert, RefreshControl, ScrollView, View,
} from 'react-native'
import { eventBus } from '../../lib/eventBus'
import { useAnnullaSelezioneOnAndroidBack } from '../../lib/hooks/useAnnullaSelezioneOnAndroidBack'
import { usePreventivi } from '../../lib/hooks/usePreventivi'
import { caricaClientiPerSposta, caricaCollegamentiPianoPreventivi, caricaCronologiaPreventivo, eliminaPreventivi, ripristinaVersionePreventivo, spostaPreventivi } from '../../lib/api/storico'
import { ModificaPreventivoModal } from '../../lib/components/modificaPreventivo/ModificaPreventivoModal'
import { useModificaPreventivoScelta } from '../../lib/features/modificaPreventivo/useModificaPreventivoScelta'
import { StoricoEmpty } from '../../lib/components/storico/StoricoEmpty'
import { StoricoHeader } from '../../lib/components/storico/StoricoHeader'
import { StoricoModals } from '../../lib/components/storico/StoricoModals'
import { StoricoPreventiviList } from '../../lib/components/storico/StoricoPreventiviList'
import { StoricoSelectionBar } from '../../lib/components/storico/StoricoSelectionBar'
import { storicoStyles as styles } from '../../lib/components/storico/storicoStyles'
import { Cliente, Preventivo } from '../../lib/types'
import { trackEvento } from '../../lib/utils/analytics'

export default function Storico() {
  const { preventivi, loading, refreshing, onRefresh, cambiaStato, segnaPagato, eliminaPreventivo } = usePreventivi()
  const { modificaInput, apriDaPreventivo, chiudiSceltaModifica } = useModificaPreventivoScelta()
  const [aperto, setAperto] = useState<string | null>(null)
  const [modalStato, setModalStato] = useState<string | null>(null)
  const [modalClienti, setModalClienti] = useState(false)
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [caricandoClienti, setCaricandoClienti] = useState(false)
  const [cronologiaAperta, setCronologiaAperta] = useState<string | null>(null)
  const [cronologiaVersioneAperta, setCronologiaVersioneAperta] = useState<string | null>(null)
  const [cronologia, setCronologia] = useState<{ [key: string]: Preventivo[] }>({})
  const [selezioneAttiva, setSelezioneAttiva] = useState(false)
  const [preventiviSelezionati, setPreventiviSelezionati] = useState<string[]>([])
  const [preventiviEliminati, setPreventiviEliminati] = useState<string[]>([])
  const [preventiviSpostati, setPreventiviSpostati] = useState<{ [id: string]: { cliente_id: string, nome_cliente: string } }>({})
  const [collegamentiPiano, setCollegamentiPiano] = useState<Record<string, 'canone' | 'rate'>>({})

  const preventiviVisibili = preventivi
    .filter(p => !preventiviEliminati.includes(p.id))
    .map(p => preventiviSpostati[p.id] ? { ...p, ...preventiviSpostati[p.id] } : p)
  const selezionati = preventiviVisibili.filter(p => preventiviSelezionati.includes(p.id))
  const preventivoModale = preventiviVisibili.find(p => p.id === modalStato)

  useFocusEffect(useCallback(() => {
    trackEvento('storico_aperto', 'storico')
    caricaCollegamentiPianoPreventivi().then(setCollegamentiPiano)
  }, []))

  async function scaricaPDF(p: Preventivo) {
    if (p.pdf_url) {
      try {
        const fileName = `${FileSystem.cacheDirectory}preventivo_${p.id}.pdf`
        const { uri } = await FileSystem.downloadAsync(p.pdf_url, fileName)
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Apri preventivo', UTI: 'com.adobe.pdf' })
      } catch {
        Alert.alert('Errore', 'Impossibile aprire il PDF')
      }
    } else {
      router.push({ pathname: '/screens/preventivo-pdf', params: { testo: p.testo_preventivo || '', cliente_id: p.cliente_id || '', preventivo_id: p.id } })
    }
  }

  async function elimina(id: string) {
    Alert.alert('Elimina', 'Vuoi eliminare questo preventivo?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => eliminaPreventivo(id) },
    ])
  }

  function toggleSelezione(id: string) {
    setPreventiviSelezionati(ids => {
      const prossimi = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
      if (prossimi.length === 0) setSelezioneAttiva(false)
      return prossimi
    })
  }

  function avviaSelezione(id: string) {
    setAperto(null)
    setSelezioneAttiva(true)
    setPreventiviSelezionati(ids => ids.includes(id) ? ids : [...ids, id])
  }

  function annullaSelezione() {
    setSelezioneAttiva(false)
    setPreventiviSelezionati([])
  }

  async function handleRefresh() {
    await onRefresh()
    setCollegamentiPiano(await caricaCollegamentiPianoPreventivi())
  }

  async function eliminaSelezionati() {
    const ids = [...preventiviSelezionati]
    if (ids.length === 0) return
    Alert.alert('Elimina', `Eliminare ${ids.length} preventivi?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          const { error } = await eliminaPreventivi(ids)
          if (error) { Alert.alert('Errore', error.message); return }
          setPreventiviEliminati(prev => [...prev, ...ids])
          annullaSelezione()
          eventBus.emit('aggiorna-home')
        },
      },
    ])
  }

  async function condividiSelezionati() {
    const conPdf = selezionati.filter(p => p.pdf_url)
    if (conPdf.length === 0) {
      Alert.alert('Nessun PDF', 'I preventivi selezionati non hanno PDF da condividere.')
      return
    }
    if (conPdf.length > 1) {
      Alert.alert('Condivisione singola per ora', 'Condivido il primo PDF selezionato.')
    }
    await scaricaPDF(conPdf[0])
  }

  async function caricaClienti() {
    setCaricandoClienti(true)
    const { data, error } = await caricaClientiPerSposta()
    if (error) Alert.alert('Errore', error.message)
    else setClienti((data || []) as Cliente[])
    setCaricandoClienti(false)
  }

  async function apriSpostaCliente() {
    setModalClienti(true)
    if (clienti.length === 0) await caricaClienti()
  }

  async function spostaSelezionati(cliente: Cliente) {
    const ids = [...preventiviSelezionati]
    if (ids.length === 0) return
    const { error } = await spostaPreventivi(ids, cliente)
    if (error) { Alert.alert('Errore', error.message); return }
    setPreventiviSpostati(prev => ids.reduce((acc, id) => ({
      ...acc,
      [id]: { cliente_id: cliente.id, nome_cliente: cliente.nome },
    }), prev))
    setModalClienti(false)
    annullaSelezione()
    eventBus.emit('aggiorna-home')
    await onRefresh()
  }

  async function caricaCronologia(preventivoId: string, padreId: string | null) {
    if (cronologiaAperta === preventivoId) {
      setCronologiaAperta(null)
      setCronologiaVersioneAperta(null)
      return
    }
    if (!padreId) return
    const versioni = await caricaCronologiaPreventivo(padreId)
    if (versioni.length > 0) {
      setCronologia(c => ({ ...c, [preventivoId]: versioni }))
      setCronologiaAperta(preventivoId)
      setCronologiaVersioneAperta(null)
    }
  }

  function onCardPress(p: Preventivo) {
    if (selezioneAttiva) {
      toggleSelezione(p.id)
      return
    }
    if (p.cliente_id) {
      router.push({ pathname: '/screens/cliente-dettaglio', params: { id: p.cliente_id, nome: p.nome_cliente || 'Cliente' } })
    } else {
      const chiudi = aperto === p.id
      setAperto(chiudi ? null : p.id)
      if (chiudi) {
        setCronologiaAperta(null)
        setCronologiaVersioneAperta(null)
      }
    }
  }

  function onToggleVersione(versioneId: string) {
    setCronologiaVersioneAperta(cronologiaVersioneAperta === versioneId ? null : versioneId)
  }

  async function onRipristinaVersione(preventivoCorrenteId: string, versione: Preventivo) {
    await ripristinaVersionePreventivo(preventivoCorrenteId, versione.id)
    Alert.alert('\u2713 Ripristinato')
    setAperto(null)
    setCronologiaAperta(null)
    setCronologiaVersioneAperta(null)
    await onRefresh()
    eventBus.emit('aggiorna-home')
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#0E9F8E" />
    </View>
  )

  return (
    <View style={styles.container}>
      <StoricoHeader />

      {selezioneAttiva ? (
        <StoricoSelectionBar
          count={preventiviSelezionati.length}
          onCancel={annullaSelezione}
          onDelete={eliminaSelezionati}
          onShare={condividiSelezionati}
          onMove={apriSpostaCliente}
        />
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0E9F8E" colors={['#0E9F8E']} />}
      >
        {preventiviVisibili.length === 0 ? (
          <StoricoEmpty onGeneraPrimo={() => router.push('/(tabs)/nuovo')} />
        ) : (
          <StoricoPreventiviList
            preventivi={preventiviVisibili}
            collegamentiPiano={collegamentiPiano}
            selezioneAttiva={selezioneAttiva}
            preventiviSelezionati={preventiviSelezionati}
            aperto={aperto}
            cronologiaAperta={cronologiaAperta}
            cronologiaVersioneAperta={cronologiaVersioneAperta}
            cronologia={cronologia}
            onCardPress={onCardPress}
            onLongPress={avviaSelezione}
            onToggleSelezione={toggleSelezione}
            onStatoPress={setModalStato}
            onScaricaPdf={scaricaPDF}
            onElimina={elimina}
            onCaricaCronologia={caricaCronologia}
            onToggleVersione={onToggleVersione}
            onRipristinaVersione={onRipristinaVersione}
            onModificaVersione={(preventivo) => apriDaPreventivo(preventivo)}
          />
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <StoricoModals
        modalStato={modalStato}
        onCloseStato={() => setModalStato(null)}
        onChangeStato={(preventivoId, stato) => { cambiaStato(preventivoId, stato); eventBus.emit('aggiorna-home') }}
        preventivoStatoCorrente={preventivoModale?.stato}
        preventivoPagato={preventivoModale?.pagato ?? false}
        mostraTogglePagato={!!modalStato && !collegamentiPiano[modalStato]}
        onTogglePagato={async (pagato) => {
          if (!modalStato) return
          await segnaPagato(modalStato, pagato)
          eventBus.emit('aggiorna-home')
        }}
        modalClienti={modalClienti}
        onCloseClienti={() => setModalClienti(false)}
        clienti={clienti}
        caricandoClienti={caricandoClienti}
        onSpostaCliente={spostaSelezionati}
      />

      <ModificaPreventivoModal
        visible={!!modificaInput}
        input={modificaInput}
        onClose={chiudiSceltaModifica}
      />
    </View>
  )
}
