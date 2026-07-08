import { useEffect, useRef, useState } from 'react'
import { Alert, Modal, Pressable, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import * as Sharing from 'expo-sharing'
import { caricaContattiCliente } from '../../api/firma'
import { aggiornaTitoloPreventivo, segnaPreventivoInviato } from '../../api/preventivoPdf'
import { eventBus } from '../../eventBus'
import { caricaSettingsData } from '../../api/settings'
import { trackEvento } from '../../utils/analytics'
import { buildMessaggioCondividiPdf } from 'previcloud-shared'
import { caricaMessaggiCliente } from '../../messaggiCliente'
import { InviaFirmaModal } from '../firma/InviaFirmaModal'
import { CanaleCondivisioneButton } from '../firma/CanaleCondivisioneButton'

export type PdfSuccessInvio = {
  preventivoId?: string | null
  clienteId?: string
  nomeCliente?: string
  haStripe?: boolean
  uploadOnlineOk: boolean
  titoloIniziale?: string
  segnaInviatoDisponibile?: boolean
}

type Props = {
  visible: boolean
  dettaglio?: string
  pdfUri?: string
  invio?: PdfSuccessInvio
  onClose: () => void
}

export function PreventivoPdfSuccessModal({ visible, dettaglio, pdfUri, invio, onClose }: Props) {
  const [mostraFirmaModal, setMostraFirmaModal] = useState(false)
  const [nomeAzienda, setNomeAzienda] = useState('')
  const [emailCliente, setEmailCliente] = useState<string | null | undefined>()
  const [telefonoCliente, setTelefonoCliente] = useState<string | null | undefined>()
  const [condivisionePdf, setCondivisionePdf] = useState(false)
  const [titolo, setTitolo] = useState(invio?.titoloIniziale || '')
  const [segnaInviato, setSegnaInviato] = useState(false)
  const [feedback, setFeedback] = useState('')
  const condivisionePdfRef = useRef(false)
  const titoloSalvatoRef = useRef('')
  const salvaTitoloInCorsoRef = useRef(false)
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!visible) {
      setMostraFirmaModal(false)
      setSegnaInviato(false)
      setFeedback('')
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current)
        feedbackTimeoutRef.current = null
      }
      return
    }
    const iniziale = invio?.titoloIniziale?.trim() || ''
    setTitolo(iniziale)
    setSegnaInviato(false)
    titoloSalvatoRef.current = iniziale
    void caricaSettingsData().then(d => {
      const nome = d?.form?.nome_azienda || ''
      setNomeAzienda(nome.split(' ')[0] || nome)
    })
  }, [visible, invio?.titoloIniziale])

  function mostraFeedback(msg: string) {
    setFeedback(msg)
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback('')
      feedbackTimeoutRef.current = null
    }, 2500)
  }

  async function salvaTitoloSeModificato(valore?: string): Promise<void> {
    const nuovo = (valore ?? titolo).trim()
    if (!invio?.preventivoId || nuovo === titoloSalvatoRef.current || salvaTitoloInCorsoRef.current) return
    salvaTitoloInCorsoRef.current = true
    try {
      await aggiornaTitoloPreventivo(invio.preventivoId, nuovo)
      titoloSalvatoRef.current = nuovo
      setTitolo(nuovo)
    } finally {
      salvaTitoloInCorsoRef.current = false
    }
  }

  async function chiudiModal() {
    try {
      await salvaTitoloSeModificato()
    } catch {
      Alert.alert('Errore', 'Impossibile salvare il nome.')
      return
    }
    if (segnaInviato && invio?.preventivoId) {
      const { error } = await segnaPreventivoInviato(invio.preventivoId)
      if (error) {
        Alert.alert('Errore', 'Impossibile segnare il preventivo come inviato.')
        return
      }
      eventBus.emit('aggiorna-home')
    }
    onClose()
  }

  const haStripe = Boolean(invio?.haStripe)
  const uploadOk = Boolean(invio?.uploadOnlineOk)
  const haCliente = Boolean(invio?.clienteId && invio?.nomeCliente?.trim())
  const haPreventivo = Boolean(invio?.preventivoId)
  const puoInviareFirma = uploadOk && haCliente && haPreventivo

  let motivoBloccoFirma = ''
  if (!uploadOk) {
    motivoBloccoFirma =
      "L'upload del PDF online non è riuscito. Il link firma richiede il documento online: chiudi, poi clicca di nuovo «Genera PDF» per riprovare."
  } else if (!haCliente) {
    motivoBloccoFirma = 'Seleziona un cliente nel preventivo per inviare il link firma.'
  } else if (!haPreventivo) {
    motivoBloccoFirma = 'Preventivo non salvato correttamente. Rigenera il PDF e riprova.'
  }

  function handlePressFirma() {
    if (!puoInviareFirma) {
      Alert.alert('Link firma non disponibile', motivoBloccoFirma)
      return
    }
    void apriInvioFirma()
  }

  async function apriInvioFirma() {
    if (!invio?.clienteId || !invio.preventivoId || !invio.nomeCliente) return
    const contatti = await caricaContattiCliente(invio.clienteId)
    setEmailCliente(contatti?.email)
    setTelefonoCliente(contatti?.telefono)
    setMostraFirmaModal(true)
  }

  async function apriPdf() {
    if (!pdfUri) return
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Errore', 'Impossibile aprire il PDF da questo dispositivo.')
        return
      }
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Apri preventivo',
        UTI: 'com.adobe.pdf',
      })
      mostraFeedback('PDF aperto.')
    } catch {
      Alert.alert('Errore', 'Impossibile aprire il PDF')
    }
  }

  async function condividiPdf() {
    if (!pdfUri || condivisionePdfRef.current) return
    condivisionePdfRef.current = true
    setCondivisionePdf(true)
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Condivisione non disponibile', 'Non è possibile condividere il PDF da questo dispositivo.')
        return
      }
      const templates = await caricaMessaggiCliente()
      const nomeAziendaSettings = (await caricaSettingsData())?.form?.nome_azienda?.split(' ')[0]
        || nomeAzienda
        || 'Il tuo artigiano'
      const messaggio = buildMessaggioCondividiPdf(
        invio?.nomeCliente || 'Cliente',
        nomeAziendaSettings,
        templates,
      )
      try {
        await Share.share({ message: messaggio })
      } catch {
        // l'utente può annullare il foglio testo
      }
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Invia preventivo',
        UTI: 'com.adobe.pdf',
      })
      trackEvento('pdf_condiviso', 'preventivo-pdf')
      mostraFeedback('Condivisione avviata.')
    } catch {
      Alert.alert('Errore', 'Impossibile condividere il PDF.')
    } finally {
      condivisionePdfRef.current = false
      setCondivisionePdf(false)
    }
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => void chiudiModal()}>
        <View style={styles.overlay}>
          <Pressable
            style={styles.backdrop}
            onPress={() => void chiudiModal()}
            accessibilityRole="button"
            accessibilityLabel="Chiudi"
          />
          <View style={styles.box}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconCheck}>{'\u2713'}</Text>
            </View>

            <Text style={styles.title}>Preventivo generato!</Text>

            {!uploadOk ? (
              <View style={styles.alertBox}>
                <Text style={styles.alertTitle}>Upload online non riuscito</Text>
                <Text style={styles.alertText}>
                  Il PDF è sul dispositivo, ma il link firma digitale non è disponibile finché il documento non
                  viene caricato online. Chiudi e clicca di nuovo «Genera PDF» per riprovare.
                </Text>
              </View>
            ) : null}

            {invio?.preventivoId ? (
              <View style={styles.titoloGroup}>
                <Text style={styles.titoloLabel}>Nome preventivo</Text>
                <Text style={styles.titoloHint}>Compare in storico e nella cartella cliente</Text>
                <TextInput
                  style={styles.titoloInput}
                  value={titolo}
                  onChangeText={setTitolo}
                  onBlur={() => void salvaTitoloSeModificato()}
                  placeholder="es. PRV-2026-0153"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                />
              </View>
            ) : null}

            {invio?.segnaInviatoDisponibile ? (
              <TouchableOpacity
                style={styles.inviataRow}
                onPress={() => setSegnaInviato(v => !v)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, segnaInviato && styles.checkboxChecked]}>
                  {segnaInviato && <Text style={styles.checkboxTick}>{'\u2713'}</Text>}
                </View>
                <Text style={styles.inviataLabel}>Segna come inviato</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={styles.sectionTitle}>Come lo invii al cliente?</Text>

            <TouchableOpacity
              style={[styles.btnFirma, !puoInviareFirma && styles.btnDisabled]}
              activeOpacity={0.85}
              onPress={handlePressFirma}
            >
              <Text style={styles.btnFirmaTitle}>Invia link firma</Text>
              <Text style={styles.btnFirmaSub}>
                {`Un solo link: legge il preventivo e firma online${haStripe ? ' — pagamento Stripe incluso nella pagina' : ''}`}
              </Text>
            </TouchableOpacity>

            {!puoInviareFirma && motivoBloccoFirma ? (
              <Text style={styles.hintMuted}>{motivoBloccoFirma}</Text>
            ) : (
              <Text style={styles.hintFaint}>
                {`Non allegare il PDF nello stesso messaggio: il cliente lo vede dal link.${haStripe ? ' Il reminder firma reinvia lo stesso link — non serve un link Stripe separato.' : ''}`}
              </Text>
            )}

            {pdfUri ? (
              <>
                <CanaleCondivisioneButton
                  label="Condividi solo PDF"
                  loading={condivisionePdf}
                  disabled={condivisionePdf}
                  onPress={() => void condividiPdf()}
                  style={styles.btnPdf}
                />
                <Text style={styles.btnPdfSub}>
                  {`Allegato PDF classico.${haStripe ? ' Il link Stripe è già in fondo al documento.' : ''}`}
                </Text>

                <TouchableOpacity style={styles.btnSecondary} activeOpacity={0.85} onPress={() => void apriPdf()}>
                  <Text style={styles.btnSecondaryText}>Apri PDF</Text>
                </TouchableOpacity>
              </>
            ) : null}

            {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

            <TouchableOpacity style={styles.btnChiudi} activeOpacity={0.85} onPress={() => void chiudiModal()}>
              <Text style={styles.btnChiudiText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {mostraFirmaModal && invio?.preventivoId && invio.nomeCliente ? (
        <InviaFirmaModal
          visible
          preventivoId={invio.preventivoId}
          nomeCliente={invio.nomeCliente}
          emailCliente={emailCliente}
          telefonoCliente={telefonoCliente}
          nomeAzienda={nomeAzienda}
          haStripe={haStripe}
          onClose={() => setMostraFirmaModal(false)}
          onInviato={() => void chiudiModal()}
        />
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,27,42,0.5)',
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#0D1B2A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  iconCircle: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(14,159,142,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCheck: { fontSize: 28, color: '#0B7A6D', fontWeight: '700' },
  title: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700',
    color: '#0D1B2A',
    textAlign: 'center',
  },
  dettaglio: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  alertBox: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    padding: 12,
  },
  alertTitle: { fontSize: 13, fontWeight: '600', color: '#991B1B' },
  alertText: { marginTop: 4, fontSize: 12, color: '#991B1B', lineHeight: 17 },
  titoloGroup: { marginTop: 16 },
  titoloLabel: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  titoloHint: { marginTop: 2, fontSize: 11, color: '#9CA3AF' },
  titoloInput: {
    marginTop: 8,
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0D1B2A',
    fontFamily: 'monospace',
  },
  inviataRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, marginTop: 12 },
  inviataLabel: { fontSize: 14, color: '#0D1B2A', fontWeight: '500' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#0E9F8E', borderColor: '#0E9F8E' },
  checkboxTick: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sectionTitle: { marginTop: 18, fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  btnFirma: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: '#0E9F8E',
    padding: 14,
  },
  btnDisabled: { opacity: 0.55 },
  btnFirmaTitle: { fontSize: 14, fontWeight: '600', color: '#fff' },
  btnFirmaSub: { marginTop: 4, fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 16 },
  hintMuted: { marginTop: 6, paddingHorizontal: 2, fontSize: 11, color: '#6B7280', lineHeight: 15 },
  hintFaint: { marginTop: 6, paddingHorizontal: 2, fontSize: 11, color: '#9CA3AF', lineHeight: 15 },
  btnPdf: {
    marginTop: 10,
    borderRadius: 14,
    padding: 14,
  },
  btnPdfSub: { marginTop: 4, paddingHorizontal: 2, fontSize: 12, color: '#6B7280', lineHeight: 16 },
  btnSecondary: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnSecondaryText: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  feedback: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#0B7A6D',
  },
  btnChiudi: { marginTop: 16, paddingVertical: 10, alignItems: 'center' },
  btnChiudiText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
})
