import { router, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { caricaContattiCliente } from '../../lib/api/firma'
import { scaricaECondividiPdfPreventivo } from '../../lib/api/pdf'
import { useInviiFirma } from '../../lib/hooks/useInviiFirma'
import { caricaSettingsData } from '../../lib/api/settings'
import { InviaFirmaModal } from '../../lib/components/firma/InviaFirmaModal'
import { FirmaDettaglioModal } from '../../lib/components/firma/FirmaDettaglioModal'
import { NotificaAzioneStorico } from '../../lib/components/firma/NotificheBell'
import { eventBus } from '../../lib/eventBus'
import type { Notifica } from '../../lib/hooks/useNotifiche'
import { useAnnullaSelezioneOnAndroidBack } from '../../lib/hooks/useAnnullaSelezioneOnAndroidBack'
import { usePreventivi } from '../../lib/hooks/usePreventivi'
import { caricaClientiPerSposta, caricaCollegamentiPianoPreventivi, caricaCronologiaPreventivo, ripristinaVersionePreventivo, spostaPreventivi } from '../../lib/api/storico'
import { conteggioCestino } from '../../lib/cestino'
import { ModificaPreventivoModal } from '../../lib/components/modificaPreventivo/ModificaPreventivoModal'
import { useModificaPreventivoScelta } from '../../lib/features/modificaPreventivo/useModificaPreventivoScelta'
import { StoricoEmpty } from '../../lib/components/storico/StoricoEmpty'
import { StoricoHeader } from '../../lib/components/storico/StoricoHeader'
import { StoricoModals } from '../../lib/components/storico/StoricoModals'
import { StoricoPreventiviList } from '../../lib/components/storico/StoricoPreventiviList'
import { MenuAzioniSheet } from '../../lib/components/MenuAzioniSheet'
import { storicoStyles as styles } from '../../lib/components/storico/storicoStyles'
import { Cliente, Preventivo } from '../../lib/types'
import { trackEvento } from '../../lib/utils/analytics'
import { useScreenTheme } from '../../lib/hooks/useScreenTheme'

export default function Storico() {
  const { s } = useScreenTheme()
  const { preventivi, loading, refreshing, onRefresh, cambiaStato, segnaPagato, eliminaPreventivo, eliminaPreventiviIds, rinominaPreventivo, patchPreventivoLocal } = usePreventivi()
  const { modificaInput, apriDaPreventivo, chiudiSceltaModifica } = useModificaPreventivoScelta()
  const [aperto, setAperto] = useState<string | null>(null)
  const [modalStato, setModalStato] = useState<string | null>(null)
  const [modalClienti, setModalClienti] = useState(false)
  const [spostaPreventivoId, setSpostaPreventivoId] = useState<string | null>(null)
  const [modalRinominaId, setModalRinominaId] = useState<string | null>(null)
  const [nuovoTitolo, setNuovoTitolo] = useState('')
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
  const [vociCestino, setVociCestino] = useState(0)
  const [firmaModalPreventivo, setFirmaModalPreventivo] = useState<Preventivo | null>(null)
  const [firmaDettaglioPreventivo, setFirmaDettaglioPreventivo] = useState<Preventivo | null>(null)
  const [firmaTelefono, setFirmaTelefono] = useState<string | null>(null)
  const [firmaEmail, setFirmaEmail] = useState<string | null>(null)
  const [nomeAzienda, setNomeAzienda] = useState('')
  const [notificaAzione, setNotificaAzione] = useState<Notifica | null>(null)

  const preventiviVisibili = preventivi
    .filter(p => !preventiviEliminati.includes(p.id))
    .map(p => preventiviSpostati[p.id] ? { ...p, ...preventiviSpostati[p.id] } : p)
  const selezionati = preventiviVisibili.filter(p => preventiviSelezionati.includes(p.id))
  const preventivoModale = preventiviVisibili.find(p => p.id === modalStato)
  const idsInviiFirma = preventiviVisibili.map(p => p.id)

  const { inviiFirma, ricaricaInviiFirma } = useInviiFirma(idsInviiFirma, {
    onPreventivoChange: (row) => {
      patchPreventivoLocal(row.id, { stato: row.stato, pdf_url: row.pdf_url ?? undefined })
    },
  })

  async function caricaConteggioCestino() {
    setVociCestino(await conteggioCestino())
  }

  useFocusEffect(useCallback(() => {
    trackEvento('storico_aperto', 'storico')
    caricaCollegamentiPianoPreventivi().then(setCollegamentiPiano)
    void caricaConteggioCestino()
    void caricaSettingsData().then(d => {
      if (d?.form?.nome_azienda) setNomeAzienda(d.form.nome_azienda.split(' ')[0] || d.form.nome_azienda)
    })
  }, []))

  useEffect(() => {
    function apriDaNotifica(n: Notifica) {
      setNotificaAzione(n)
      if (n.preventivo_id) setAperto(n.preventivo_id)
    }
    eventBus.on('apri-notifica', apriDaNotifica)
    return () => { eventBus.off('apri-notifica', apriDaNotifica) }
  }, [])

  async function apriFirmaModal(p: Preventivo) {
    setFirmaModalPreventivo(p)
    if (p.cliente_id) {
      const c = await caricaContattiCliente(p.cliente_id)
      setFirmaTelefono(c?.telefono || null)
      setFirmaEmail(c?.email || null)
    } else {
      setFirmaTelefono(null)
      setFirmaEmail(null)
    }
  }

  async function scaricaPDF(p: Preventivo) {
    if (p.pdf_url) {
      try {
        await scaricaECondividiPdfPreventivo(p.id)
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
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          const ok = await eliminaPreventivo(id)
          if (!ok) return
          setCollegamentiPiano(await caricaCollegamentiPianoPreventivi())
          await caricaConteggioCestino()
          eventBus.emit('aggiorna-home')
        },
      },
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

  useAnnullaSelezioneOnAndroidBack(selezioneAttiva, annullaSelezione)

  async function handleRefresh() {
    await onRefresh()
    setCollegamentiPiano(await caricaCollegamentiPianoPreventivi())
    await caricaConteggioCestino()
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
          const ok = await eliminaPreventiviIds(ids)
          if (!ok) return
          setPreventiviEliminati(prev => [...prev, ...ids])
          annullaSelezione()
          setCollegamentiPiano(await caricaCollegamentiPianoPreventivi())
          await caricaConteggioCestino()
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

  function apriSpostaSingolo(preventivoId: string) {
    setSpostaPreventivoId(preventivoId)
    void apriSpostaCliente()
  }

  function apriRinomina(preventivo: Preventivo) {
    setNuovoTitolo(preventivo.titolo || '')
    setModalRinominaId(preventivo.id)
  }

  function chiudiModalSposta() {
    setModalClienti(false)
    setSpostaPreventivoId(null)
  }

  async function spostaSuCliente(cliente: Cliente) {
    const ids = spostaPreventivoId ? [spostaPreventivoId] : [...preventiviSelezionati]
    if (ids.length === 0) return
    const { error } = await spostaPreventivi(ids, cliente)
    if (error) { Alert.alert('Errore', error.message); return }
    setPreventiviSpostati(prev => ids.reduce((acc, id) => ({
      ...acc,
      [id]: { cliente_id: cliente.id, nome_cliente: cliente.nome },
    }), prev))
    chiudiModalSposta()
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
    <View style={s.center}>
      <ActivityIndicator size="large" color="#0E9F8E" />
    </View>
  )

  return (
    <View style={s.container}>
      <StoricoHeader />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: selezioneAttiva ? 120 : 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0E9F8E" colors={['#0E9F8E']} />}
      >
        <TouchableOpacity
          style={styles.cestinoLink}
          onPress={() => router.push('/screens/cestino')}
        >
          <Text style={styles.cestinoLinkText}>Elementi eliminati</Text>
          {vociCestino > 0 ? (
            <View style={styles.cestinoBadge}>
              <Text style={styles.cestinoBadgeText}>{vociCestino}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

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
            onRinomina={apriRinomina}
            onSposta={apriSpostaSingolo}
            onCaricaCronologia={caricaCronologia}
            onToggleVersione={onToggleVersione}
            onRipristinaVersione={onRipristinaVersione}
            onModificaVersione={(preventivo) => apriDaPreventivo(preventivo)}
            inviiFirma={inviiFirma}
            onInviaFirma={apriFirmaModal}
            onApriFirmaDettaglio={setFirmaDettaglioPreventivo}
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
        onCloseClienti={chiudiModalSposta}
        clienti={clienti}
        caricandoClienti={caricandoClienti}
        onSpostaCliente={spostaSuCliente}
      />

      <Modal visible={modalRinominaId !== null} transparent animationType="fade" onRequestClose={() => setModalRinominaId(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalRinominaId(null)}>
          <TouchableOpacity style={styles.modalBox} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.modalTitle}>Rinomina preventivo</Text>
            <TextInput
              style={styles.modalInput}
              value={nuovoTitolo}
              onChangeText={setNuovoTitolo}
              placeholder="es. Preventivo caldaia"
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
            <TouchableOpacity
              style={styles.modalSaveBtn}
              onPress={async () => {
                if (!modalRinominaId) return
                await rinominaPreventivo(modalRinominaId, nuovoTitolo.trim())
                setModalRinominaId(null)
              }}
            >
              <Text style={styles.modalSaveBtnText}>Salva</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setModalRinominaId(null)}>
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ModificaPreventivoModal
        visible={!!modificaInput}
        input={modificaInput}
        onClose={chiudiSceltaModifica}
      />

      {firmaDettaglioPreventivo ? (
        <FirmaDettaglioModal
          visible
          preventivo={firmaDettaglioPreventivo}
          invio={inviiFirma[firmaDettaglioPreventivo.id]}
          nomeAzienda={nomeAzienda}
          onClose={() => setFirmaDettaglioPreventivo(null)}
          onInviaNuovo={() => void apriFirmaModal(firmaDettaglioPreventivo)}
          onAggiornato={() => {
            ricaricaInviiFirma()
            cambiaStato(firmaDettaglioPreventivo.id, 'accettato')
            eventBus.emit('aggiorna-home')
          }}
          onFirmaAnnullata={() => {
            ricaricaInviiFirma()
            cambiaStato(firmaDettaglioPreventivo.id, 'inviato')
            eventBus.emit('aggiorna-home')
          }}
        />
      ) : null}

      {firmaModalPreventivo ? (
        <InviaFirmaModal
          visible
          preventivoId={firmaModalPreventivo.id}
          nomeCliente={firmaModalPreventivo.nome_cliente || 'Cliente'}
          telefonoCliente={firmaTelefono}
          emailCliente={firmaEmail}
          nomeAzienda={nomeAzienda}
          onClose={() => setFirmaModalPreventivo(null)}
          onInviato={() => {
            ricaricaInviiFirma()
            cambiaStato(firmaModalPreventivo.id, 'inviato')
            eventBus.emit('aggiorna-home')
          }}
          onFirmaManuale={() => setFirmaDettaglioPreventivo(firmaModalPreventivo)}
        />
      ) : null}

      <NotificaAzioneStorico
        notifica={notificaAzione}
        onClose={() => setNotificaAzione(null)}
      />

      <MenuAzioniSheet
        variant="dock"
        visible={selezioneAttiva}
        titolo={`${preventiviSelezionati.length} selezionati`}
        onClose={annullaSelezione}
        voci={[
          { label: 'Sposta', onPress: apriSpostaCliente },
          { label: 'Condividi', onPress: condividiSelezionati },
          { label: 'Elimina', onPress: eliminaSelezionati, danger: true },
        ]}
      />
    </View>
  )
}
