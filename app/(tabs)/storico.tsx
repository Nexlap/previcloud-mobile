import * as FileSystem from 'expo-file-system/legacy'
import { router, useFocusEffect } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator, Alert, RefreshControl, ScrollView, View,
} from 'react-native'
import { eventBus } from '../../lib/eventBus'
import { usePreventivi } from '../../lib/hooks/usePreventivi'
import { cambiaStatoPreventivi, caricaClientiPerSposta, caricaCronologiaPreventivo, eliminaPreventivi, ripristinaVersionePreventivo, spostaPreventivi } from '../../lib/api/storico'
import { StoricoEmpty } from '../../lib/components/storico/StoricoEmpty'
import { StoricoHeader } from '../../lib/components/storico/StoricoHeader'
import { StoricoModals } from '../../lib/components/storico/StoricoModals'
import { StoricoPreventiviList } from '../../lib/components/storico/StoricoPreventiviList'
import { StoricoSelectionBar } from '../../lib/components/storico/StoricoSelectionBar'
import { storicoStyles as styles } from '../../lib/components/storico/storicoStyles'
import { Cliente, Preventivo } from '../../lib/types'
import { trackEvento } from '../../lib/utils/analytics'

export default function Storico() {
  const { preventivi, loading, refreshing, onRefresh, cambiaStato, eliminaPreventivo } = usePreventivi()
  const [aperto, setAperto] = useState<string | null>(null)
  const [modalStato, setModalStato] = useState<string | null>(null)
  const [modalStatoMultiplo, setModalStatoMultiplo] = useState(false)
  const [modalClienti, setModalClienti] = useState(false)
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [caricandoClienti, setCaricandoClienti] = useState(false)
  const [cronologiaAperta, setCronologiaAperta] = useState<string | null>(null)
  const [cronologia, setCronologia] = useState<{ [key: string]: Preventivo[] }>({})
  const [selezioneAttiva, setSelezioneAttiva] = useState(false)
  const [preventiviSelezionati, setPreventiviSelezionati] = useState<string[]>([])
  const [preventiviEliminati, setPreventiviEliminati] = useState<string[]>([])
  const [preventiviSpostati, setPreventiviSpostati] = useState<{ [id: string]: { cliente_id: string, nome_cliente: string } }>({})

  const preventiviVisibili = preventivi
    .filter(p => !preventiviEliminati.includes(p.id))
    .map(p => preventiviSpostati[p.id] ? { ...p, ...preventiviSpostati[p.id] } : p)
  const selezionati = preventiviVisibili.filter(p => preventiviSelezionati.includes(p.id))

  useFocusEffect(useCallback(() => {
    trackEvento('storico_aperto', 'storico')
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
      router.push({ pathname: '/screens/preventivo-pdf', params: { testo: p.testo_preventivo || '', cliente_id: p.cliente_id || '' } })
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

  async function cambiaStatoSelezionati(stato: string) {
    const ids = [...preventiviSelezionati]
    if (ids.length === 0) return
    const { error } = await cambiaStatoPreventivi(ids, stato)
    if (error) { Alert.alert('Errore', error.message); return }
    setModalStatoMultiplo(false)
    annullaSelezione()
    eventBus.emit('aggiorna-home')
    await onRefresh()
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
    if (cronologiaAperta === preventivoId) { setCronologiaAperta(null); return }
    if (!padreId) return
    const versioni = await caricaCronologiaPreventivo(padreId)
    if (versioni.length > 0) {
      setCronologia(c => ({ ...c, [preventivoId]: versioni }))
      setCronologiaAperta(preventivoId)
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
      setAperto(aperto === p.id ? null : p.id)
    }
  }

  function onToggleVersioneAperta(preventivoId: string, versioneId: string) {
    setAperto(aperto === versioneId ? preventivoId : versioneId)
  }

  async function onRipristinaVersione(preventivoCorrenteId: string, versione: Preventivo) {
    await ripristinaVersionePreventivo(preventivoCorrenteId, versione.id)
    Alert.alert('\u2713 Ripristinato')
    setAperto(null)
    setCronologiaAperta(null)
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#0E9F8E" />
    </View>
  )

  return (
    <View style={styles.container}>
      <StoricoHeader />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0E9F8E" colors={['#0E9F8E']} />}
      >
        {preventiviVisibili.length === 0 ? (
          <StoricoEmpty onGeneraPrimo={() => router.push('/(tabs)/nuovo')} />
        ) : (
          <StoricoPreventiviList
            preventivi={preventiviVisibili}
            selezioneAttiva={selezioneAttiva}
            preventiviSelezionati={preventiviSelezionati}
            aperto={aperto}
            cronologiaAperta={cronologiaAperta}
            cronologia={cronologia}
            onCardPress={onCardPress}
            onLongPress={avviaSelezione}
            onToggleSelezione={toggleSelezione}
            onStatoPress={setModalStato}
            onScaricaPdf={scaricaPDF}
            onElimina={elimina}
            onCaricaCronologia={caricaCronologia}
            onToggleVersioneAperta={onToggleVersioneAperta}
            onRipristinaVersione={onRipristinaVersione}
            onRiprendiBozza={(preventivoId) => router.push({ pathname: '/(tabs)/nuovo', params: { preventivo_id: preventivoId } })}
            onModificaVersione={(preventivo) => router.push({
              pathname: '/(tabs)/nuovo',
              params: { testo_modifica: preventivo.testo_preventivo || '', versione_padre_id: preventivo.id, versione_numero: String((preventivo.versione || 1) + 1) },
            })}
          />
        )}
        <View style={{ height: selezioneAttiva ? 120 : 40 }} />
      </ScrollView>

      {selezioneAttiva ? (
        <StoricoSelectionBar
          count={preventiviSelezionati.length}
          onCancel={annullaSelezione}
          onDelete={eliminaSelezionati}
          onChangeStato={() => setModalStatoMultiplo(true)}
          onShare={condividiSelezionati}
          onMove={apriSpostaCliente}
        />
      ) : null}

      <StoricoModals
        modalStato={modalStato}
        onCloseStato={() => setModalStato(null)}
        onChangeStato={(preventivoId, stato) => { cambiaStato(preventivoId, stato); eventBus.emit('aggiorna-home') }}
        modalStatoMultiplo={modalStatoMultiplo}
        onCloseStatoMultiplo={() => setModalStatoMultiplo(false)}
        onChangeStatoMultiplo={cambiaStatoSelezionati}
        modalClienti={modalClienti}
        onCloseClienti={() => setModalClienti(false)}
        clienti={clienti}
        caricandoClienti={caricandoClienti}
        onSpostaCliente={spostaSelezionati}
      />
    </View>
  )
}
